import {
  groupCardsByUserAndDeck,
  generateNotificationMessage,
  generateNotificationTitle,
  prepareNotificationPayload,
  type UserNotificationGroup,
} from '@/services/notification-grouping';
import type { DueCardWithRelations } from '@/services/due-cards';

describe('Notification Grouping Service', () => {
  const now = new Date('2024-01-15T10:00:00.000Z');

  const createMockCard = (
    id: string,
    deckId: string,
    deckTitle: string,
    userId: string,
    pushToken: string | null = 'ExponentPushToken[xxx]',
  ): DueCardWithRelations => ({
    id,
    front: `Question ${id}`,
    nextReviewDate: now,
    lastNotificationSent: null,
    snoozedUntil: null,
    deck: {
      id: deckId,
      title: deckTitle,
      userId,
      parentDeckId: null,
    },
    user: {
      id: userId,
      clerkId: `clerk-${userId}`,
      pushToken,
      notificationsEnabled: true,
    },
  });

  describe('groupCardsByUserAndDeck', () => {
    it('should group cards by user and deck', () => {
      const cards: DueCardWithRelations[] = [
        createMockCard('card-1', 'deck-1', 'Math', 'user-1'),
        createMockCard('card-2', 'deck-1', 'Math', 'user-1'),
        createMockCard('card-3', 'deck-2', 'Science', 'user-1'),
      ];

      const result = groupCardsByUserAndDeck(cards);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].totalCards).toBe(3);
      expect(result[0].decks).toHaveLength(2);

      const mathDeck = result[0].decks.find((d) => d.deckTitle === 'Math');
      expect(mathDeck?.cardCount).toBe(2);
      expect(mathDeck?.cardIds).toEqual(['card-1', 'card-2']);

      const scienceDeck = result[0].decks.find(
        (d) => d.deckTitle === 'Science',
      );
      expect(scienceDeck?.cardCount).toBe(1);
      expect(scienceDeck?.cardIds).toEqual(['card-3']);
    });

    it('should handle multiple users', () => {
      const cards: DueCardWithRelations[] = [
        createMockCard('card-1', 'deck-1', 'Math', 'user-1', 'token-1'),
        createMockCard('card-2', 'deck-2', 'Science', 'user-2', 'token-2'),
      ];

      const result = groupCardsByUserAndDeck(cards);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.userId).sort()).toEqual(['user-1', 'user-2']);
    });

    it('should exclude users without push tokens', () => {
      const cards: DueCardWithRelations[] = [
        createMockCard('card-1', 'deck-1', 'Math', 'user-1', 'token-1'),
        createMockCard('card-2', 'deck-2', 'Science', 'user-2', null), // No push token
      ];

      const result = groupCardsByUserAndDeck(cards);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
    });

    it('should return empty array for empty input', () => {
      const result = groupCardsByUserAndDeck([]);
      expect(result).toEqual([]);
    });

    it('should include push token in result', () => {
      const cards: DueCardWithRelations[] = [
        createMockCard('card-1', 'deck-1', 'Math', 'user-1', 'my-push-token'),
      ];

      const result = groupCardsByUserAndDeck(cards);

      expect(result[0].pushToken).toBe('my-push-token');
    });
  });

  describe('generateNotificationMessage', () => {
    it('should generate message for single card in single deck', () => {
      const group: UserNotificationGroup = {
        userId: 'user-1',
        clerkId: 'clerk-1',
        pushToken: 'token',
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
      };

      expect(generateNotificationMessage(group)).toBe('1 card due in Math');
    });

    it('should generate message for multiple cards in single deck', () => {
      const group: UserNotificationGroup = {
        userId: 'user-1',
        clerkId: 'clerk-1',
        pushToken: 'token',
        decks: [
          {
            deckId: 'deck-1',
            deckTitle: 'Math',
            parentDeckId: null,
            cardCount: 3,
            cardIds: ['card-1', 'card-2', 'card-3'],
          },
        ],
        totalCards: 3,
      };

      expect(generateNotificationMessage(group)).toBe('3 cards due in Math');
    });

    it('should generate message for multiple decks', () => {
      const group: UserNotificationGroup = {
        userId: 'user-1',
        clerkId: 'clerk-1',
        pushToken: 'token',
        decks: [
          {
            deckId: 'deck-1',
            deckTitle: 'Math',
            parentDeckId: null,
            cardCount: 2,
            cardIds: ['card-1', 'card-2'],
          },
          {
            deckId: 'deck-2',
            deckTitle: 'Science',
            parentDeckId: null,
            cardCount: 1,
            cardIds: ['card-3'],
          },
        ],
        totalCards: 3,
      };

      expect(generateNotificationMessage(group)).toBe(
        '3 cards due: 2 in Math, 1 in Science',
      );
    });

    it('should sort decks by card count in message', () => {
      const group: UserNotificationGroup = {
        userId: 'user-1',
        clerkId: 'clerk-1',
        pushToken: 'token',
        decks: [
          {
            deckId: 'deck-1',
            deckTitle: 'Math',
            parentDeckId: null,
            cardCount: 1,
            cardIds: ['card-1'],
          },
          {
            deckId: 'deck-2',
            deckTitle: 'Science',
            parentDeckId: null,
            cardCount: 3,
            cardIds: ['card-2', 'card-3', 'card-4'],
          },
        ],
        totalCards: 4,
      };

      // Science should come first (3 cards) then Math (1 card)
      expect(generateNotificationMessage(group)).toBe(
        '4 cards due: 3 in Science, 1 in Math',
      );
    });

    it('should return empty string for zero cards', () => {
      const group: UserNotificationGroup = {
        userId: 'user-1',
        clerkId: 'clerk-1',
        pushToken: 'token',
        decks: [],
        totalCards: 0,
      };

      expect(generateNotificationMessage(group)).toBe('');
    });
  });

  describe('generateNotificationTitle', () => {
    it('should return "Time to review!" for single card', () => {
      expect(generateNotificationTitle(1)).toBe('Time to review!');
    });

    it('should return "Cards ready for review!" for multiple cards', () => {
      expect(generateNotificationTitle(2)).toBe('Cards ready for review!');
      expect(generateNotificationTitle(10)).toBe('Cards ready for review!');
    });

    it('should return "MicroFlash" for zero cards', () => {
      expect(generateNotificationTitle(0)).toBe('MicroFlash');
    });
  });

  describe('prepareNotificationPayload', () => {
    it('should prepare complete notification payload', () => {
      const group: UserNotificationGroup = {
        userId: 'user-1',
        clerkId: 'clerk-1',
        pushToken: 'token',
        decks: [
          {
            deckId: 'deck-1',
            deckTitle: 'Math',
            parentDeckId: null,
            cardCount: 2,
            cardIds: ['card-1', 'card-2'],
          },
          {
            deckId: 'deck-2',
            deckTitle: 'Science',
            parentDeckId: null,
            cardCount: 1,
            cardIds: ['card-3'],
          },
        ],
        totalCards: 3,
      };

      const payload = prepareNotificationPayload(group);

      expect(payload.title).toBe('Cards ready for review!');
      expect(payload.body).toBe('3 cards due: 2 in Math, 1 in Science');
      expect(payload.data).toEqual({
        type: 'due_cards',
        cardIds: ['card-1', 'card-2', 'card-3'],
        deckIds: ['deck-1', 'deck-2'],
        totalCards: 3,
      });
    });

    it('should handle single card payload', () => {
      const group: UserNotificationGroup = {
        userId: 'user-1',
        clerkId: 'clerk-1',
        pushToken: 'token',
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
      };

      const payload = prepareNotificationPayload(group);

      expect(payload.title).toBe('Time to review!');
      expect(payload.body).toBe('1 card due in Math');
      expect(payload.data.cardIds).toEqual(['card-1']);
    });
  });
});
