import { sendDueCardNotifications } from '@/services/notification-orchestrator';
import { findDueCards } from '@/services/due-cards';
import { groupCardsByUserAndDeck } from '@/services/notification-grouping';

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
  });

  it('should identify eligible users but not send notifications (pending E4.2)', async () => {
    // The orchestrator currently identifies eligible users but does not send
    // notifications because sprint creation (E4.2) is not yet implemented.
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
          },
        ],
        totalCards: 2,
      },
    ];

    mockFindDueCards.mockResolvedValue(mockCards);
    mockGroupCardsByUserAndDeck.mockReturnValue(mockGroups);

    const result = await sendDueCardNotifications();

    // Orchestrator identifies cards and users but doesn't send (pending E4.2)
    expect(result.totalCardsFound).toBe(2);
    expect(result.totalUsersNotified).toBe(1);
    // No notifications sent until E4.2 implements sprint creation
    expect(result.totalNotificationsSent).toBe(0);
    expect(result.successfulNotifications).toBe(0);
    expect(result.cardsMarkedAsNotified).toBe(0);
  });
});
