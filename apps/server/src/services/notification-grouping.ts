import type { DueCardWithRelations } from './due-cards';

/**
 * Maximum number of cards to include in a single notification.
 * Keeps review sessions small and manageable.
 */
export const MAX_CARDS_PER_NOTIFICATION = 3;

/**
 * Duration in minutes to snooze overflow cards (cards not included in notification).
 */
export const OVERFLOW_SNOOZE_DURATION_MINUTES = 120; // 2 hours

/**
 * Represents a deck with its due card count for notification purposes.
 */
export interface DeckCardGroup {
  deckId: string;
  deckTitle: string;
  parentDeckId: string | null;
  cardCount: number;
}

/**
 * Represents a user's grouped notification data.
 * Note: Sprint-based notifications will be created by E4.2 scheduler.
 * This grouping is used to determine eligibility and card counts.
 */
export interface UserNotificationGroup {
  userId: string;
  clerkId: string;
  pushToken: string;
  decks: DeckCardGroup[];
  totalCards: number;
  /** Sprint ID - will be set by E4.2 scheduler when creating sprint */
  sprintId?: string;
}

/**
 * Groups due cards by user and deck for notification processing.
 *
 * @param cards - Array of due cards with user and deck relations
 * @returns Array of user notification groups, excluding users without push tokens
 */
export function groupCardsByUserAndDeck(
  cards: DueCardWithRelations[],
): UserNotificationGroup[] {
  // Group by user first
  const userMap = new Map<
    string,
    {
      userId: string;
      clerkId: string;
      pushToken: string | null;
      deckMap: Map<string, DeckCardGroup>;
    }
  >();

  for (const card of cards) {
    const { user, deck } = card;

    // Get or create user entry
    let userEntry = userMap.get(user.id);
    if (!userEntry) {
      userEntry = {
        userId: user.id,
        clerkId: user.clerkId,
        pushToken: user.pushToken,
        deckMap: new Map(),
      };
      userMap.set(user.id, userEntry);
    }

    // Get or create deck entry within user
    let deckEntry = userEntry.deckMap.get(deck.id);
    if (!deckEntry) {
      deckEntry = {
        deckId: deck.id,
        deckTitle: deck.title,
        parentDeckId: deck.parentDeckId,
        cardCount: 0,
      };
      userEntry.deckMap.set(deck.id, deckEntry);
    }

    // Add card to deck
    deckEntry.cardCount++;
  }

  // Convert to array format, filtering out users without push tokens
  const result: UserNotificationGroup[] = [];

  for (const userEntry of userMap.values()) {
    // Skip users without push tokens
    if (!userEntry.pushToken) {
      continue;
    }

    const decks = Array.from(userEntry.deckMap.values());
    const totalCards = decks.reduce((sum, deck) => sum + deck.cardCount, 0);

    result.push({
      userId: userEntry.userId,
      clerkId: userEntry.clerkId,
      pushToken: userEntry.pushToken,
      decks,
      totalCards,
      // sprintId will be set by E4.2 scheduler when creating sprint
    });
  }

  return result;
}

/**
 * Generates a human-readable notification message for a user's due cards.
 * Uses total card count (sprint will be limited by user's sprintSize setting).
 *
 * Examples:
 * - "1 card ready in Math"
 * - "5 cards ready for review"
 *
 * @param group - User notification group
 * @param sprintSize - Number of cards in the sprint (defaults to totalCards, capped at 10)
 * @returns Notification message string, or empty string if no cards
 */
export function generateNotificationMessage(
  group: UserNotificationGroup,
  sprintSize?: number,
): string {
  const cardCount = sprintSize ?? Math.min(group.totalCards, 10);

  if (cardCount === 0) {
    return '';
  }

  const cardWord = cardCount === 1 ? 'card' : 'cards';

  // Single deck case - mention the deck name
  if (group.decks.length === 1) {
    const deck = group.decks[0];
    return `${cardCount} ${cardWord} ready in ${deck.deckTitle}`;
  }

  // Multiple decks - keep it simple
  return `${cardCount} ${cardWord} ready for review`;
}

/**
 * Generates a notification title for a micro-sprint.
 *
 * @returns Notification title string
 */
export function generateNotificationTitle(): string {
  return 'Time for a micro-sprint!';
}

/**
 * iOS notification category ID for sprint notifications.
 * Must match the category registered on the client.
 */
export const NOTIFICATION_CATEGORY_ID = 'due_cards';

/**
 * Prepares notification data for a sprint.
 * Note: sprintId must be set on the group before calling this function.
 * The E4.2 scheduler is responsible for creating the sprint and setting the ID.
 *
 * @param group - User notification group with sprintId set
 * @param sprintSize - Number of cards in the sprint
 * @returns Object with title, body, categoryId, and data for the push notification
 * @throws Error if sprintId is not set
 */
export function prepareNotificationPayload(
  group: UserNotificationGroup,
  sprintSize?: number,
): {
  title: string;
  body: string;
  categoryId: string;
  data: {
    type: 'sprint';
    sprintId: string;
    url: string;
    cardCount: number;
  };
} {
  if (!group.sprintId) {
    throw new Error(
      'sprintId must be set on group before preparing notification payload',
    );
  }

  const cardCount = sprintSize ?? Math.min(group.totalCards, 10);

  return {
    title: generateNotificationTitle(),
    body: generateNotificationMessage(group, sprintSize),
    categoryId: NOTIFICATION_CATEGORY_ID,
    data: {
      type: 'sprint',
      sprintId: group.sprintId,
      url: `/sprint/${group.sprintId}`,
      cardCount,
    },
  };
}
