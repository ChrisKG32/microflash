import {
  markCardsAsNotified,
  markCardAsNotified,
  clearNotificationStatus,
  removeUserPushToken,
} from '@/services/card-notifications';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    card: {
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Card Notifications Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markCardsAsNotified', () => {
    it('should mark multiple cards as notified', async () => {
      (mockPrisma.card.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await markCardsAsNotified(['card-1', 'card-2', 'card-3']);

      expect(result).toBe(3);
      expect(mockPrisma.card.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['card-1', 'card-2', 'card-3'],
          },
        },
        data: {
          lastNotificationSent: expect.any(Date),
        },
      });
    });

    it('should return 0 for empty array', async () => {
      const result = await markCardsAsNotified([]);

      expect(result).toBe(0);
      expect(mockPrisma.card.updateMany).not.toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      (mockPrisma.card.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await markCardsAsNotified(['card-1', 'card-2', 'card-3']);

      expect(result).toBe(2);
    });
  });

  describe('markCardAsNotified', () => {
    it('should mark a single card as notified', async () => {
      (mockPrisma.card.update as jest.Mock).mockResolvedValue({
        id: 'card-1',
        lastNotificationSent: new Date(),
      });

      const result = await markCardAsNotified('card-1');

      expect(result).toBe(true);
      expect(mockPrisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: {
          lastNotificationSent: expect.any(Date),
        },
      });
    });

    it('should return false if card does not exist', async () => {
      (mockPrisma.card.update as jest.Mock).mockRejectedValue(
        new Error('Record not found'),
      );

      const result = await markCardAsNotified('non-existent-card');

      expect(result).toBe(false);
    });
  });

  describe('clearNotificationStatus', () => {
    it('should clear notification status for multiple cards', async () => {
      (mockPrisma.card.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await clearNotificationStatus(['card-1', 'card-2']);

      expect(result).toBe(2);
      expect(mockPrisma.card.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['card-1', 'card-2'],
          },
        },
        data: {
          lastNotificationSent: null,
        },
      });
    });

    it('should return 0 for empty array', async () => {
      const result = await clearNotificationStatus([]);

      expect(result).toBe(0);
      expect(mockPrisma.card.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('removeUserPushToken', () => {
    it('should remove push token for user', async () => {
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        pushToken: null,
      });

      const result = await removeUserPushToken('user-1');

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          pushToken: null,
        },
      });
    });

    it('should return false if user does not exist', async () => {
      (mockPrisma.user.update as jest.Mock).mockRejectedValue(
        new Error('Record not found'),
      );

      const result = await removeUserPushToken('non-existent-user');

      expect(result).toBe(false);
    });
  });
});
