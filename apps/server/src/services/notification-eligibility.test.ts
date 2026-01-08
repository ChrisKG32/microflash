import {
  getUserPushEligibility,
  getNextEligiblePushTime,
  getEffectiveNotificationsCountToday,
  getStartOfUTCDay,
  getStartOfNextUTCDay,
  isToday,
  getCandidateUsersForPush,
  userHasDueCards,
} from '@/services/notification-eligibility';
import {
  findResumableSprint,
  type SprintWithCards,
} from '@/services/sprint-service';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/services/sprint-service', () => ({
  findResumableSprint: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    card: {
      count: jest.fn(),
    },
  },
}));

const mockFindResumableSprint = findResumableSprint as jest.MockedFunction<
  typeof findResumableSprint
>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Notification Eligibility Service', () => {
  const now = new Date('2024-01-15T10:00:00.000Z');

  const createMockUser = (
    overrides: Partial<{
      id: string;
      notificationsEnabled: boolean;
      pushToken: string | null;
      lastPushSentAt: Date | null;
      notificationCooldownMinutes: number;
      maxNotificationsPerDay: number;
      notificationsCountToday: number;
    }> = {},
  ) => ({
    id: 'user-1',
    notificationsEnabled: true,
    pushToken: 'ExponentPushToken[xxx]',
    lastPushSentAt: null,
    notificationCooldownMinutes: 120,
    maxNotificationsPerDay: 10,
    notificationsCountToday: 0,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindResumableSprint.mockResolvedValue(null);
  });

  describe('Date utility functions', () => {
    describe('getStartOfUTCDay', () => {
      it('should return start of UTC day', () => {
        const date = new Date('2024-01-15T14:30:45.123Z');
        const result = getStartOfUTCDay(date);
        expect(result.toISOString()).toBe('2024-01-15T00:00:00.000Z');
      });
    });

    describe('getStartOfNextUTCDay', () => {
      it('should return start of next UTC day', () => {
        const date = new Date('2024-01-15T14:30:45.123Z');
        const result = getStartOfNextUTCDay(date);
        expect(result.toISOString()).toBe('2024-01-16T00:00:00.000Z');
      });
    });

    describe('isToday', () => {
      it('should return true for date on same UTC day', () => {
        const date = new Date('2024-01-15T05:00:00.000Z');
        expect(isToday(date, now)).toBe(true);
      });

      it('should return false for date on different UTC day', () => {
        const date = new Date('2024-01-14T23:59:59.999Z');
        expect(isToday(date, now)).toBe(false);
      });

      it('should return false for null date', () => {
        expect(isToday(null, now)).toBe(false);
      });
    });
  });

  describe('getEffectiveNotificationsCountToday', () => {
    it('should return count if lastPushSentAt is today', () => {
      const user = createMockUser({
        lastPushSentAt: new Date('2024-01-15T08:00:00.000Z'),
        notificationsCountToday: 5,
      });
      expect(getEffectiveNotificationsCountToday(user, now)).toBe(5);
    });

    it('should return 0 if lastPushSentAt is not today', () => {
      const user = createMockUser({
        lastPushSentAt: new Date('2024-01-14T20:00:00.000Z'),
        notificationsCountToday: 5,
      });
      expect(getEffectiveNotificationsCountToday(user, now)).toBe(0);
    });

    it('should return 0 if lastPushSentAt is null', () => {
      const user = createMockUser({
        lastPushSentAt: null,
        notificationsCountToday: 5,
      });
      expect(getEffectiveNotificationsCountToday(user, now)).toBe(0);
    });
  });

  describe('getUserPushEligibility', () => {
    it('should return ineligible when notifications disabled', async () => {
      const user = createMockUser({ notificationsEnabled: false });
      const result = await getUserPushEligibility(user, now);

      expect(result.eligible).toBe(false);
      expect(result.nextEligibleAt).toBeNull();
      expect(result.reason).toBe('NOTIFICATIONS_DISABLED');
    });

    it('should return ineligible when no push token', async () => {
      const user = createMockUser({ pushToken: null });
      const result = await getUserPushEligibility(user, now);

      expect(result.eligible).toBe(false);
      expect(result.nextEligibleAt).toBeNull();
      expect(result.reason).toBe('NO_PUSH_TOKEN');
    });

    it('should return ineligible when resumable sprint exists', async () => {
      const resumableUntil = new Date('2024-01-15T10:30:00.000Z');
      mockFindResumableSprint.mockResolvedValue({
        id: 'sprint-1',
        resumableUntil,
      } as unknown as SprintWithCards);

      const user = createMockUser();
      const result = await getUserPushEligibility(user, now);

      expect(result.eligible).toBe(false);
      expect(result.nextEligibleAt).toEqual(resumableUntil);
      expect(result.reason).toBe('RESUMABLE_SPRINT_EXISTS');
    });

    it('should return ineligible when cooldown is active', async () => {
      const lastPushSentAt = new Date('2024-01-15T09:00:00.000Z'); // 1 hour ago
      const user = createMockUser({
        lastPushSentAt,
        notificationCooldownMinutes: 120, // 2 hours
      });

      const result = await getUserPushEligibility(user, now);

      expect(result.eligible).toBe(false);
      expect(result.nextEligibleAt?.toISOString()).toBe(
        '2024-01-15T11:00:00.000Z',
      );
      expect(result.reason).toBe('COOLDOWN_ACTIVE');
    });

    it('should return ineligible when max per day reached', async () => {
      const user = createMockUser({
        lastPushSentAt: new Date('2024-01-15T08:00:00.000Z'),
        notificationsCountToday: 10,
        maxNotificationsPerDay: 10,
      });

      const result = await getUserPushEligibility(user, now);

      expect(result.eligible).toBe(false);
      expect(result.nextEligibleAt?.toISOString()).toBe(
        '2024-01-16T00:00:00.000Z',
      );
      expect(result.reason).toBe('MAX_PER_DAY_REACHED');
    });

    it('should return eligible when all rules pass', async () => {
      const user = createMockUser({
        lastPushSentAt: new Date('2024-01-15T07:00:00.000Z'), // 3 hours ago
        notificationsCountToday: 2,
        maxNotificationsPerDay: 10,
        notificationCooldownMinutes: 120, // 2 hours
      });

      const result = await getUserPushEligibility(user, now);

      expect(result.eligible).toBe(true);
      expect(result.nextEligibleAt).toEqual(now);
      expect(result.reason).toBeUndefined();
    });

    it('should return eligible when no previous push sent', async () => {
      const user = createMockUser({
        lastPushSentAt: null,
        notificationsCountToday: 0,
      });

      const result = await getUserPushEligibility(user, now);

      expect(result.eligible).toBe(true);
      expect(result.nextEligibleAt).toEqual(now);
    });

    it('should reset count when lastPushSentAt is from previous day', async () => {
      const user = createMockUser({
        lastPushSentAt: new Date('2024-01-14T20:00:00.000Z'), // Yesterday
        notificationsCountToday: 10, // Would be max, but should reset
        maxNotificationsPerDay: 10,
      });

      const result = await getUserPushEligibility(user, now);

      expect(result.eligible).toBe(true);
    });
  });

  describe('getNextEligiblePushTime', () => {
    it('should return null for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getNextEligiblePushTime('non-existent', now);

      expect(result).toBeNull();
    });

    it('should return ISO string for eligible user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
        createMockUser(),
      );

      const result = await getNextEligiblePushTime('user-1', now);

      expect(result).toBe(now.toISOString());
    });

    it('should return cooldown end time for user in cooldown', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
        createMockUser({
          lastPushSentAt: new Date('2024-01-15T09:00:00.000Z'),
          notificationCooldownMinutes: 120,
        }),
      );

      const result = await getNextEligiblePushTime('user-1', now);

      expect(result).toBe('2024-01-15T11:00:00.000Z');
    });
  });

  describe('getCandidateUsersForPush', () => {
    it('should query users with notifications enabled and push token', async () => {
      const mockUsers = [createMockUser()];
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await getCandidateUsersForPush();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          notificationsEnabled: true,
          pushToken: { not: null },
        },
        select: {
          id: true,
          notificationsEnabled: true,
          pushToken: true,
          lastPushSentAt: true,
          notificationCooldownMinutes: true,
          maxNotificationsPerDay: true,
          notificationsCountToday: true,
          sprintSize: true,
        },
      });
      expect(result).toEqual(mockUsers);
    });
  });

  describe('userHasDueCards', () => {
    it('should return true when user has due cards', async () => {
      (mockPrisma.card.count as jest.Mock).mockResolvedValue(5);

      const result = await userHasDueCards('user-1', now);

      expect(result).toBe(true);
      expect(mockPrisma.card.count).toHaveBeenCalledWith({
        where: {
          deck: { userId: 'user-1' },
          nextReviewDate: { lte: now },
          OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
        },
      });
    });

    it('should return false when user has no due cards', async () => {
      (mockPrisma.card.count as jest.Mock).mockResolvedValue(0);

      const result = await userHasDueCards('user-1', now);

      expect(result).toBe(false);
    });
  });
});
