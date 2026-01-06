import { findDueCards, countDueCards } from '@/services/due-cards';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    card: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Due Cards Service', () => {
  const now = new Date('2024-01-15T10:00:00.000Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findDueCards', () => {
    it('should find cards due within the notification window', async () => {
      const mockCards = [
        {
          id: 'card-1',
          front: 'Question 1',
          nextReviewDate: new Date('2024-01-15T10:05:00.000Z'),
          lastNotificationSent: null,
          snoozedUntil: null,
          deck: {
            id: 'deck-1',
            title: 'Math',
            userId: 'user-1',
            parentDeckId: null,
          },
        },
        {
          id: 'card-2',
          front: 'Question 2',
          nextReviewDate: new Date('2024-01-15T09:55:00.000Z'),
          lastNotificationSent: null,
          snoozedUntil: null,
          deck: {
            id: 'deck-2',
            title: 'Science',
            userId: 'user-1',
            parentDeckId: null,
          },
        },
      ];

      const mockUsers = [
        {
          id: 'user-1',
          clerkId: 'clerk-1',
          pushToken: 'ExponentPushToken[xxx]',
          notificationsEnabled: true,
        },
      ];

      (mockPrisma.card.findMany as jest.Mock).mockResolvedValue(mockCards);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await findDueCards();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'card-1',
        deck: { title: 'Math' },
        user: { pushToken: 'ExponentPushToken[xxx]' },
      });

      // Verify the query was called with AND conditions including time window
      expect(mockPrisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                nextReviewDate: {
                  gte: new Date('2024-01-15T09:53:00.000Z'), // now - 7 min
                  lte: new Date('2024-01-15T10:07:00.000Z'), // now + 7 min
                },
              }),
            ]),
          }),
        }),
      );
    });

    it('should exclude cards from users without push tokens', async () => {
      (mockPrisma.card.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await findDueCards();

      expect(mockPrisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                deck: {
                  user: {
                    notificationsEnabled: true,
                    pushToken: { not: null },
                  },
                },
              }),
            ]),
          }),
        }),
      );
    });

    it('should exclude snoozed cards', async () => {
      (mockPrisma.card.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await findDueCards();

      expect(mockPrisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
              }),
            ]),
          }),
        }),
      );
    });

    it('should use custom window minutes when provided', async () => {
      (mockPrisma.card.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await findDueCards({ windowMinutes: 15 });

      expect(mockPrisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                nextReviewDate: {
                  gte: new Date('2024-01-15T09:45:00.000Z'), // now - 15 min
                  lte: new Date('2024-01-15T10:15:00.000Z'), // now + 15 min
                },
              }),
            ]),
          }),
        }),
      );
    });

    it('should filter out cards without matching users', async () => {
      const mockCards = [
        {
          id: 'card-1',
          front: 'Question 1',
          nextReviewDate: new Date('2024-01-15T10:05:00.000Z'),
          lastNotificationSent: null,
          snoozedUntil: null,
          deck: {
            id: 'deck-1',
            title: 'Math',
            userId: 'user-1',
            parentDeckId: null,
          },
        },
      ];

      // Return empty users array - no matching user
      (mockPrisma.card.findMany as jest.Mock).mockResolvedValue(mockCards);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await findDueCards();

      expect(result).toHaveLength(0);
    });

    it('should handle multiple users correctly', async () => {
      const mockCards = [
        {
          id: 'card-1',
          front: 'Q1',
          nextReviewDate: now,
          lastNotificationSent: null,
          snoozedUntil: null,
          deck: {
            id: 'deck-1',
            title: 'Math',
            userId: 'user-1',
            parentDeckId: null,
          },
        },
        {
          id: 'card-2',
          front: 'Q2',
          nextReviewDate: now,
          lastNotificationSent: null,
          snoozedUntil: null,
          deck: {
            id: 'deck-2',
            title: 'Science',
            userId: 'user-2',
            parentDeckId: null,
          },
        },
      ];

      const mockUsers = [
        {
          id: 'user-1',
          clerkId: 'clerk-1',
          pushToken: 'token-1',
          notificationsEnabled: true,
        },
        {
          id: 'user-2',
          clerkId: 'clerk-2',
          pushToken: 'token-2',
          notificationsEnabled: true,
        },
      ];

      (mockPrisma.card.findMany as jest.Mock).mockResolvedValue(mockCards);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await findDueCards();

      expect(result).toHaveLength(2);
      expect(result[0].user.id).toBe('user-1');
      expect(result[1].user.id).toBe('user-2');
    });
  });

  describe('countDueCards', () => {
    it('should return the count of due cards', async () => {
      (mockPrisma.card.count as jest.Mock).mockResolvedValue(5);

      const result = await countDueCards();

      expect(result).toBe(5);
    });

    it('should use the same filters as findDueCards', async () => {
      (mockPrisma.card.count as jest.Mock).mockResolvedValue(0);

      await countDueCards();

      expect(mockPrisma.card.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                nextReviewDate: {
                  gte: new Date('2024-01-15T09:53:00.000Z'),
                  lte: new Date('2024-01-15T10:07:00.000Z'),
                },
              }),
              expect.objectContaining({
                deck: {
                  user: {
                    notificationsEnabled: true,
                    pushToken: { not: null },
                  },
                },
              }),
            ]),
          }),
        }),
      );
    });

    it('should use custom window minutes when provided', async () => {
      (mockPrisma.card.count as jest.Mock).mockResolvedValue(0);

      await countDueCards({ windowMinutes: 10 });

      expect(mockPrisma.card.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                nextReviewDate: {
                  gte: new Date('2024-01-15T09:50:00.000Z'),
                  lte: new Date('2024-01-15T10:10:00.000Z'),
                },
              }),
            ]),
          }),
        }),
      );
    });
  });
});
