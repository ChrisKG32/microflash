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
  cardIds: string[];
}

/**
 * Represents a user's grouped notification data.
 */
export interface UserNotificationGroup {
  userId: string;
  clerkId: string;
  pushToken: string;
  decks: DeckCardGroup[];
  totalCards: number;
  /** Card IDs included in the notification (max 3) */
  includedCardIds: string[];
  /** Card IDs that were due but not included (overflow) */
  overflowCardIds: string[];
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
        cardIds: [],
      };
      userEntry.deckMap.set(deck.id, deckEntry);
    }

    // Add card to deck
    deckEntry.cardCount++;
    deckEntry.cardIds.push(card.id);
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

    // Collect all card IDs for this user
    const allCardIds = decks.flatMap((deck) => deck.cardIds);

    // Split into included (max 3) and overflow
    const includedCardIds = allCardIds.slice(0, MAX_CARDS_PER_NOTIFICATION);
    const overflowCardIds = allCardIds.slice(MAX_CARDS_PER_NOTIFICATION);

    result.push({
      userId: userEntry.userId,
      clerkId: userEntry.clerkId,
      pushToken: userEntry.pushToken,
      decks,
      totalCards,
      includedCardIds,
      overflowCardIds,
    });
  }

  return result;
}

/**
 * Generates a human-readable notification message for a user's due cards.
 * Now reflects only the cards included in the notification (max 3).
 *
 * Examples:
 * - "1 card ready in Math"
 * - "3 cards ready for review"
 *
 * @param group - User notification group
 * @returns Notification message string, or empty string if no cards
 */
export function generateNotificationMessage(
  group: UserNotificationGroup,
): string {
  const includedCount = group.includedCardIds.length;

  if (includedCount === 0) {
    return '';
  }

  const cardWord = includedCount === 1 ? 'card' : 'cards';

  // Single deck case - mention the deck name
  if (group.decks.length === 1) {
    const deck = group.decks[0];
    return `${includedCount} ${cardWord} ready in ${deck.deckTitle}`;
  }

  // Multiple decks - keep it simple
  return `${includedCount} ${cardWord} ready for review`;
}

/**
 * Generates a notification title based on the number of included cards.
 *
 * @param includedCount - Number of cards included in the notification
 * @returns Notification title string
 */
export function generateNotificationTitle(includedCount: number): string {
  if (includedCount === 0) {
    return 'MicroFlash';
  }

  if (includedCount === 1) {
    return 'Time to review!';
  }

  return 'Cards ready for review!';
}

/**
 * iOS notification category ID for due cards notifications.
 * Must match the category registered on the client.
 */
export const NOTIFICATION_CATEGORY_ID = 'due_cards';

/**
 * Prepares notification data for a user group.
 * Only includes up to MAX_CARDS_PER_NOTIFICATION cards.
 *
 * @param group - User notification group
 * @returns Object with title, body, categoryId, and data for the push notification
 */
export function prepareNotificationPayload(group: UserNotificationGroup): {
  title: string;
  body: string;
  categoryId: string;
  data: {
    type: 'due_cards';
    cardIds: string[];
    deckIds: string[];
    totalCards: number;
    url: string;
  };
} {
  return {
    title: generateNotificationTitle(group.includedCardIds.length),
    body: generateNotificationMessage(group),
    categoryId: NOTIFICATION_CATEGORY_ID,
    data: {
      type: 'due_cards',
      // Only include the limited card IDs (max 3)
      cardIds: group.includedCardIds,
      deckIds: group.decks.map((deck) => deck.deckId),
      totalCards: group.includedCardIds.length,
      // Deep link URL for the review session
      url: `/review-session?cardIds=${group.includedCardIds.join(',')}`,
    },
  };
}
