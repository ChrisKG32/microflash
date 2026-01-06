import { sendDueCardNotifications } from '@/services/notification-orchestrator';
import { findDueCards } from '@/services/due-cards';
import {
  groupCardsByUserAndDeck,
  prepareNotificationPayload,
} from '@/services/notification-grouping';
import {
  sendBatchNotifications,
  logNotificationResults,
} from '@/services/push-notifications';
import {
  markCardsAsNotified,
  removeUserPushToken,
} from '@/services/card-notifications';

// Mock all dependencies
jest.mock('@/services/due-cards');
jest.mock('@/services/notification-grouping');
jest.mock('@/services/push-notifications');
jest.mock('@/services/card-notifications');

const mockFindDueCards = findDueCards as jest.MockedFunction<
  typeof findDueCards
>;
const mockGroupCardsByUserAndDeck =
  groupCardsByUserAndDeck as jest.MockedFunction<
    typeof groupCardsByUserAndDeck
  >;
const mockPrepareNotificationPayload =
  prepareNotificationPayload as jest.MockedFunction<
    typeof prepareNotificationPayload
  >;
const mockSendBatchNotifications =
  sendBatchNotifications as jest.MockedFunction<typeof sendBatchNotifications>;
const mockLogNotificationResults =
  logNotificationResults as jest.MockedFunction<typeof logNotificationResults>;
const mockMarkCardsAsNotified = markCardsAsNotified as jest.MockedFunction<
  typeof markCardsAsNotified
>;
const mockRemoveUserPushToken = removeUserPushToken as jest.MockedFunction<
  typeof removeUserPushToken
>;

describe('Notification Orchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return early when no cards are due', async () => {
    mockFindDueCards.mockResolvedValue([]);

    const result = await sendDueCardNotifications();

    expect(result.totalCardsFound).toBe(0);
    expect(result.totalUsersNotified).toBe(0);
    expect(mockGroupCardsByUserAndDeck).not.toHaveBeenCalled();
    expect(mockSendBatchNotifications).not.toHaveBeenCalled();
  });

  it('should return early when no users have valid push tokens', async () => {
    mockFindDueCards.mockResolvedValue([
      {
        id: 'card-1',
        front: 'Q1',
        nextReviewDate: new Date(),
        lastNotificationSent: null,
        snoozedUntil: null,
        deck: {
          id: 'deck-1',
          title: 'Math',
          userId: 'user-1',
          parentDeckId: null,
        },
        user: {
          id: 'user-1',
          clerkId: 'clerk-1',
          pushToken: null,
          notificationsEnabled: true,
        },
      },
    ]);
    mockGroupCardsByUserAndDeck.mockReturnValue([]);

    const result = await sendDueCardNotifications();

    expect(result.totalCardsFound).toBe(1);
    expect(result.totalUsersNotified).toBe(0);
    expect(mockSendBatchNotifications).not.toHaveBeenCalled();
  });

  it('should orchestrate the full notification flow', async () => {
    const mockCards = [
      {
        id: 'card-1',
        front: 'Q1',
        nextReviewDate: new Date(),
        lastNotificationSent: null,
        snoozedUntil: null,
        deck: {
          id: 'deck-1',
          title: 'Math',
          userId: 'user-1',
          parentDeckId: null,
        },
        user: {
          id: 'user-1',
          clerkId: 'clerk-1',
          pushToken: 'token-1',
          notificationsEnabled: true,
        },
      },
      {
        id: 'card-2',
        front: 'Q2',
        nextReviewDate: new Date(),
        lastNotificationSent: null,
        snoozedUntil: null,
        deck: {
          id: 'deck-1',
          title: 'Math',
          userId: 'user-1',
          parentDeckId: null,
        },
        user: {
          id: 'user-1',
          clerkId: 'clerk-1',
          pushToken: 'token-1',
          notificationsEnabled: true,
        },
      },
    ];

    const mockGroups = [
      {
        userId: 'user-1',
        clerkId: 'clerk-1',
        pushToken: 'token-1',
        decks: [
          {
            deckId: 'deck-1',
            deckTitle: 'Math',
            parentDeckId: null,
            cardCount: 2,
            cardIds: ['card-1', 'card-2'],
          },
        ],
        totalCards: 2,
      },
    ];

    mockFindDueCards.mockResolvedValue(mockCards);
    mockGroupCardsByUserAndDeck.mockReturnValue(mockGroups);
    mockPrepareNotificationPayload.mockReturnValue({
      title: 'Cards ready for review!',
      body: '2 cards due in Math',
      data: {
        type: 'due_cards',
        cardIds: ['card-1', 'card-2'],
        deckIds: ['deck-1'],
        totalCards: 2,
      },
    });
    mockSendBatchNotifications.mockResolvedValue([
      { pushToken: 'token-1', success: true, ticketId: 'ticket-1' },
    ]);
    mockMarkCardsAsNotified.mockResolvedValue(2);

    const result = await sendDueCardNotifications();

    expect(result.totalCardsFound).toBe(2);
    expect(result.totalUsersNotified).toBe(1);
    expect(result.totalNotificationsSent).toBe(1);
    expect(result.successfulNotifications).toBe(1);
    expect(result.failedNotifications).toBe(0);
    expect(result.cardsMarkedAsNotified).toBe(2);

    expect(mockMarkCardsAsNotified).toHaveBeenCalledWith(['card-1', 'card-2']);
    expect(mockLogNotificationResults).toHaveBeenCalled();
  });

  it('should handle failed notifications', async () => {
    const mockCards = [
      {
        id: 'card-1',
        front: 'Q1',
        nextReviewDate: new Date(),
        lastNotificationSent: null,
        snoozedUntil: null,
        deck: {
          id: 'deck-1',
          title: 'Math',
          userId: 'user-1',
          parentDeckId: null,
        },
        user: {
          id: 'user-1',
          clerkId: 'clerk-1',
          pushToken: 'token-1',
          notificationsEnabled: true,
        },
      },
    ];

    const mockGroups = [
      {
        userId: 'user-1',
        clerkId: 'clerk-1',
        pushToken: 'token-1',
        decks: [
          {
            deckId: 'deck-1',
            deckTitle: 'Math',
            parentDeckId: null,
            cardCount: 1,
            cardIds: ['card-1'],
          },
        ],
        totalCards: 1,
      },
    ];

    mockFindDueCards.mockResolvedValue(mockCards);
    mockGroupCardsByUserAndDeck.mockReturnValue(mockGroups);
    mockPrepareNotificationPayload.mockReturnValue({
      title: 'Time to review!',
      body: '1 card due in Math',
      data: {
        type: 'due_cards',
        cardIds: ['card-1'],
        deckIds: ['deck-1'],
        totalCards: 1,
      },
    });
    mockSendBatchNotifications.mockResolvedValue([
      { pushToken: 'token-1', success: false, error: 'Network error' },
    ]);

    const result = await sendDueCardNotifications();

    expect(result.successfulNotifications).toBe(0);
    expect(result.failedNotifications).toBe(1);
    expect(result.cardsMarkedAsNotified).toBe(0);
    expect(mockMarkCardsAsNotified).not.toHaveBeenCalled();
  });

  it('should remove invalid push tokens', async () => {
    const mockCards = [
      {
        id: 'card-1',
        front: 'Q1',
        nextReviewDate: new Date(),
        lastNotificationSent: null,
        snoozedUntil: null,
        deck: {
          id: 'deck-1',
          title: 'Math',
          userId: 'user-1',
          parentDeckId: null,
        },
        user: {
          id: 'user-1',
          clerkId: 'clerk-1',
          pushToken: 'token-1',
          notificationsEnabled: true,
        },
      },
    ];

    const mockGroups = [
      {
        userId: 'user-1',
        clerkId: 'clerk-1',
        pushToken: 'token-1',
        decks: [
          {
            deckId: 'deck-1',
            deckTitle: 'Math',
            parentDeckId: null,
            cardCount: 1,
            cardIds: ['card-1'],
          },
        ],
        totalCards: 1,
      },
    ];

    mockFindDueCards.mockResolvedValue(mockCards);
    mockGroupCardsByUserAndDeck.mockReturnValue(mockGroups);
    mockPrepareNotificationPayload.mockReturnValue({
      title: 'Time to review!',
      body: '1 card due in Math',
      data: {
        type: 'due_cards',
        cardIds: ['card-1'],
        deckIds: ['deck-1'],
        totalCards: 1,
      },
    });
    mockSendBatchNotifications.mockResolvedValue([
      { pushToken: 'token-1', success: false, error: 'DeviceNotRegistered' },
    ]);
    mockRemoveUserPushToken.mockResolvedValue(true);

    await sendDueCardNotifications();

    expect(mockRemoveUserPushToken).toHaveBeenCalledWith('user-1');
  });
});
