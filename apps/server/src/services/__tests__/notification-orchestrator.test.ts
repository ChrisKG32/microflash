import { sendDueCardNotifications } from '@/services/notification-orchestrator';
import {
  getCandidateUsersForPush,
  getUserPushEligibility,
  userHasDueCards,
} from '@/services/notification-eligibility';
import {
  createPendingPushSprint,
  deletePendingSprint,
  type SprintWithCards,
} from '@/services/sprint-service';
import { sendBatchNotifications } from '@/services/push-notifications';
import { removeUserPushToken } from '@/services/card-notifications';
import { prisma } from '@/lib/prisma';

// Mock all dependencies
jest.mock('@/services/notification-eligibility');
jest.mock('@/services/sprint-service');
jest.mock('@/services/push-notifications');
jest.mock('@/services/card-notifications');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockGetCandidateUsersForPush =
  getCandidateUsersForPush as jest.MockedFunction<
    typeof getCandidateUsersForPush
  >;
const mockGetUserPushEligibility =
  getUserPushEligibility as jest.MockedFunction<typeof getUserPushEligibility>;
const mockUserHasDueCards = userHasDueCards as jest.MockedFunction<
  typeof userHasDueCards
>;
const mockCreatePendingPushSprint =
  createPendingPushSprint as jest.MockedFunction<
    typeof createPendingPushSprint
  >;
const mockDeletePendingSprint = deletePendingSprint as jest.MockedFunction<
  typeof deletePendingSprint
>;
const mockSendBatchNotifications =
  sendBatchNotifications as jest.MockedFunction<typeof sendBatchNotifications>;
const mockRemoveUserPushToken = removeUserPushToken as jest.MockedFunction<
  typeof removeUserPushToken
>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Notification Orchestrator', () => {
  const now = new Date('2024-01-15T10:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createMockUser = (id: string) => ({
    id,
    notificationsEnabled: true,
    pushToken: `ExponentPushToken[${id}]`,
    lastPushSentAt: null,
    notificationCooldownMinutes: 120,
    maxNotificationsPerDay: 10,
    notificationsCountToday: 0,
    sprintSize: 5,
  });

  it('should return early when no candidate users', async () => {
    mockGetCandidateUsersForPush.mockResolvedValue([]);

    const result = await sendDueCardNotifications();

    expect(result.totalUsersChecked).toBe(0);
    expect(result.totalUsersEligible).toBe(0);
    expect(mockGetUserPushEligibility).not.toHaveBeenCalled();
  });

  it('should skip ineligible users', async () => {
    mockGetCandidateUsersForPush.mockResolvedValue([createMockUser('user-1')]);
    mockGetUserPushEligibility.mockResolvedValue({
      eligible: false,
      nextEligibleAt: null,
      reason: 'COOLDOWN_ACTIVE',
    });

    const result = await sendDueCardNotifications();

    expect(result.totalUsersChecked).toBe(1);
    expect(result.totalUsersEligible).toBe(0);
    expect(mockUserHasDueCards).not.toHaveBeenCalled();
  });

  it('should skip users with no due cards', async () => {
    mockGetCandidateUsersForPush.mockResolvedValue([createMockUser('user-1')]);
    mockGetUserPushEligibility.mockResolvedValue({
      eligible: true,
      nextEligibleAt: now,
    });
    mockUserHasDueCards.mockResolvedValue(false);

    const result = await sendDueCardNotifications();

    expect(result.totalUsersChecked).toBe(1);
    expect(result.totalUsersEligible).toBe(0);
    expect(mockCreatePendingPushSprint).not.toHaveBeenCalled();
  });

  it('should create sprint and send push for eligible user with due cards', async () => {
    const user = createMockUser('user-1');
    mockGetCandidateUsersForPush.mockResolvedValue([user]);
    mockGetUserPushEligibility.mockResolvedValue({
      eligible: true,
      nextEligibleAt: now,
    });
    mockUserHasDueCards.mockResolvedValue(true);
    mockCreatePendingPushSprint.mockResolvedValue({
      sprint: { id: 'sprint-1' } as unknown as SprintWithCards,
      cardCount: 5,
    });
    mockSendBatchNotifications.mockResolvedValue([
      { pushToken: user.pushToken!, success: true, ticketId: 'ticket-1' },
    ]);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      lastPushSentAt: null,
      notificationsCountToday: 0,
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

    const result = await sendDueCardNotifications();

    expect(result.totalUsersChecked).toBe(1);
    expect(result.totalUsersEligible).toBe(1);
    expect(result.totalSprintsCreated).toBe(1);
    expect(result.totalNotificationsSent).toBe(1);
    expect(result.successfulNotifications).toBe(1);
    expect(result.failedNotifications).toBe(0);

    // Verify sprint was created
    expect(mockCreatePendingPushSprint).toHaveBeenCalledWith({
      userId: 'user-1',
      sprintSize: 5,
    });

    // Verify push was sent with correct payload
    expect(mockSendBatchNotifications).toHaveBeenCalledWith([
      expect.objectContaining({
        pushToken: user.pushToken,
        title: 'Time for a micro-sprint!',
        body: '5 cards ready for review',
        categoryId: 'due_cards',
        data: expect.objectContaining({
          type: 'sprint',
          sprintId: 'sprint-1',
          url: '/sprint/sprint-1',
          cardCount: 5,
        }),
      }),
    ]);

    // Verify user tracking was updated
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        lastPushSentAt: now,
        notificationsCountToday: 1,
      },
    });
  });

  it('should cleanup sprint on failed push', async () => {
    const user = createMockUser('user-1');
    mockGetCandidateUsersForPush.mockResolvedValue([user]);
    mockGetUserPushEligibility.mockResolvedValue({
      eligible: true,
      nextEligibleAt: now,
    });
    mockUserHasDueCards.mockResolvedValue(true);
    mockCreatePendingPushSprint.mockResolvedValue({
      sprint: { id: 'sprint-1' } as unknown as SprintWithCards,
      cardCount: 5,
    });
    mockSendBatchNotifications.mockResolvedValue([
      {
        pushToken: user.pushToken!,
        success: false,
        error: 'Network error',
      },
    ]);
    mockDeletePendingSprint.mockResolvedValue(true);

    const result = await sendDueCardNotifications();

    expect(result.successfulNotifications).toBe(0);
    expect(result.failedNotifications).toBe(1);

    // Verify sprint was cleaned up
    expect(mockDeletePendingSprint).toHaveBeenCalledWith('sprint-1');

    // Verify user tracking was NOT updated
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('should remove invalid push token on DeviceNotRegistered error', async () => {
    const user = createMockUser('user-1');
    mockGetCandidateUsersForPush.mockResolvedValue([user]);
    mockGetUserPushEligibility.mockResolvedValue({
      eligible: true,
      nextEligibleAt: now,
    });
    mockUserHasDueCards.mockResolvedValue(true);
    mockCreatePendingPushSprint.mockResolvedValue({
      sprint: { id: 'sprint-1' } as unknown as SprintWithCards,
      cardCount: 5,
    });
    mockSendBatchNotifications.mockResolvedValue([
      {
        pushToken: user.pushToken!,
        success: false,
        error: 'DeviceNotRegistered',
      },
    ]);
    mockDeletePendingSprint.mockResolvedValue(true);
    mockRemoveUserPushToken.mockResolvedValue(true);

    const result = await sendDueCardNotifications();

    expect(result.tokensRemoved).toBe(1);
    expect(mockRemoveUserPushToken).toHaveBeenCalledWith('user-1');
  });

  it('should handle multiple users with mixed results', async () => {
    const user1 = createMockUser('user-1');
    const user2 = createMockUser('user-2');
    const user3 = createMockUser('user-3');

    mockGetCandidateUsersForPush.mockResolvedValue([user1, user2, user3]);
    mockGetUserPushEligibility
      .mockResolvedValueOnce({ eligible: true, nextEligibleAt: now }) // user-1
      .mockResolvedValueOnce({
        eligible: false,
        nextEligibleAt: null,
        reason: 'COOLDOWN_ACTIVE',
      }) // user-2
      .mockResolvedValueOnce({ eligible: true, nextEligibleAt: now }); // user-3
    mockUserHasDueCards.mockResolvedValue(true);
    mockCreatePendingPushSprint
      .mockResolvedValueOnce({
        sprint: { id: 'sprint-1' } as unknown as SprintWithCards,
        cardCount: 5,
      })
      .mockResolvedValueOnce({
        sprint: { id: 'sprint-3' } as unknown as SprintWithCards,
        cardCount: 3,
      });
    mockSendBatchNotifications.mockResolvedValue([
      { pushToken: user1.pushToken!, success: true, ticketId: 'ticket-1' },
      { pushToken: user3.pushToken!, success: true, ticketId: 'ticket-3' },
    ]);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      lastPushSentAt: null,
      notificationsCountToday: 0,
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

    const result = await sendDueCardNotifications();

    expect(result.totalUsersChecked).toBe(3);
    expect(result.totalUsersEligible).toBe(2); // user-2 was ineligible
    expect(result.totalSprintsCreated).toBe(2);
    expect(result.successfulNotifications).toBe(2);
  });

  it('should handle sprint creation failure gracefully', async () => {
    const user = createMockUser('user-1');
    mockGetCandidateUsersForPush.mockResolvedValue([user]);
    mockGetUserPushEligibility.mockResolvedValue({
      eligible: true,
      nextEligibleAt: now,
    });
    mockUserHasDueCards.mockResolvedValue(true);
    mockCreatePendingPushSprint.mockRejectedValue(
      new Error('NO_ELIGIBLE_CARDS'),
    );

    const result = await sendDueCardNotifications();

    expect(result.totalUsersEligible).toBe(1);
    expect(result.totalSprintsCreated).toBe(0);
    expect(result.totalNotificationsSent).toBe(0);
    expect(mockSendBatchNotifications).not.toHaveBeenCalled();
  });
});
