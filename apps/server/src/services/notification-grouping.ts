import type { DueCardWithRelations } from './due-cards';

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

    result.push({
      userId: userEntry.userId,
      clerkId: userEntry.clerkId,
      pushToken: userEntry.pushToken,
      decks,
      totalCards,
    });
  }

  return result;
}

/**
 * Generates a human-readable notification message for a user's due cards.
 *
 * Examples:
 * - "1 card due in Math"
 * - "3 cards due in Math"
 * - "5 cards due: 3 in Math, 2 in Science"
 * - "7 cards due: 3 in Math, 2 in Science, 2 in History"
 *
 * @param group - User notification group
 * @returns Notification message string, or empty string if no cards
 */
export function generateNotificationMessage(
  group: UserNotificationGroup,
): string {
  if (group.totalCards === 0 || group.decks.length === 0) {
    return '';
  }

  const cardWord = group.totalCards === 1 ? 'card' : 'cards';

  // Single deck case
  if (group.decks.length === 1) {
    const deck = group.decks[0];
    return `${group.totalCards} ${cardWord} due in ${deck.deckTitle}`;
  }

  // Multiple decks case
  // Sort decks by card count (descending) for more meaningful message
  const sortedDecks = [...group.decks].sort(
    (a, b) => b.cardCount - a.cardCount,
  );

  const deckParts = sortedDecks.map(
    (deck) => `${deck.cardCount} in ${deck.deckTitle}`,
  );

  return `${group.totalCards} ${cardWord} due: ${deckParts.join(', ')}`;
}

/**
 * Generates a notification title based on the number of due cards.
 *
 * @param totalCards - Total number of due cards
 * @returns Notification title string
 */
export function generateNotificationTitle(totalCards: number): string {
  if (totalCards === 0) {
    return 'MicroFlash';
  }

  if (totalCards === 1) {
    return 'Time to review!';
  }

  return 'Cards ready for review!';
}

/**
 * Prepares notification data for a user group.
 *
 * @param group - User notification group
 * @returns Object with title, body, and data for the push notification
 */
export function prepareNotificationPayload(group: UserNotificationGroup): {
  title: string;
  body: string;
  data: {
    type: 'due_cards';
    cardIds: string[];
    deckIds: string[];
    totalCards: number;
  };
} {
  return {
    title: generateNotificationTitle(group.totalCards),
    body: generateNotificationMessage(group),
    data: {
      type: 'due_cards',
      cardIds: group.decks.flatMap((deck) => deck.cardIds),
      deckIds: group.decks.map((deck) => deck.deckId),
      totalCards: group.totalCards,
    },
  };
}
