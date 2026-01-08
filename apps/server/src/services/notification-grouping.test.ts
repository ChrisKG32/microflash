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

      const scienceDeck = result[0].decks.find(
        (d) => d.deckTitle === 'Science',
      );
      expect(scienceDeck?.cardCount).toBe(1);
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

    it('should not include sprintId by default (set by scheduler)', () => {
      const cards: DueCardWithRelations[] = [
        createMockCard('card-1', 'deck-1', 'Math', 'user-1'),
      ];

      const result = groupCardsByUserAndDeck(cards);

      expect(result[0].sprintId).toBeUndefined();
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
          },
        ],
        totalCards: 1,
      };

      expect(generateNotificationMessage(group, 1)).toBe(
        '1 card ready in Math',
      );
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
            cardCount: 5,
          },
        ],
        totalCards: 5,
      };

      expect(generateNotificationMessage(group, 5)).toBe(
        '5 cards ready in Math',
      );
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
          },
          {
            deckId: 'deck-2',
            deckTitle: 'Science',
            parentDeckId: null,
            cardCount: 3,
          },
        ],
        totalCards: 5,
      };

      expect(generateNotificationMessage(group, 5)).toBe(
        '5 cards ready for review',
      );
    });

    it('should use sprintSize parameter when provided', () => {
      const group: UserNotificationGroup = {
        userId: 'user-1',
        clerkId: 'clerk-1',
        pushToken: 'token',
        decks: [
          {
            deckId: 'deck-1',
            deckTitle: 'Math',
            parentDeckId: null,
            cardCount: 10,
          },
        ],
        totalCards: 10,
      };

      // Sprint size of 5 should be reflected in message
      expect(generateNotificationMessage(group, 5)).toBe(
        '5 cards ready in Math',
      );
    });

    it('should cap at 10 cards when no sprintSize provided', () => {
      const group: UserNotificationGroup = {
        userId: 'user-1',
        clerkId: 'clerk-1',
        pushToken: 'token',
        decks: [
          {
            deckId: 'deck-1',
            deckTitle: 'Math',
            parentDeckId: null,
            cardCount: 50,
          },
        ],
        totalCards: 50,
      };

      // Should cap at 10 (max sprint size)
      expect(generateNotificationMessage(group)).toBe('10 cards ready in Math');
    });

    it('should return empty string for zero cards', () => {
      const group: UserNotificationGroup = {
        userId: 'user-1',
        clerkId: 'clerk-1',
        pushToken: 'token',
        decks: [],
        totalCards: 0,
      };

      expect(generateNotificationMessage(group, 0)).toBe('');
    });
  });

  describe('generateNotificationTitle', () => {
    it('should return sprint-focused title', () => {
      expect(generateNotificationTitle()).toBe('Time for a micro-sprint!');
    });
  });

  describe('prepareNotificationPayload', () => {
    it('should prepare complete notification payload with sprintId', () => {
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
          },
          {
            deckId: 'deck-2',
            deckTitle: 'Science',
            parentDeckId: null,
            cardCount: 3,
          },
        ],
        totalCards: 5,
        sprintId: 'sprint-123',
      };

      const payload = prepareNotificationPayload(group, 5);

      expect(payload.title).toBe('Time for a micro-sprint!');
      expect(payload.body).toBe('5 cards ready for review');
      expect(payload.categoryId).toBe('due_cards');
      expect(payload.data).toEqual({
        type: 'sprint',
        sprintId: 'sprint-123',
        url: '/sprint/sprint-123',
      });
    });

    it('should handle single deck payload', () => {
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
          },
        ],
        totalCards: 3,
        sprintId: 'sprint-456',
      };

      const payload = prepareNotificationPayload(group, 3);

      expect(payload.title).toBe('Time for a micro-sprint!');
      expect(payload.body).toBe('3 cards ready in Math');
      expect(payload.data.sprintId).toBe('sprint-456');
      expect(payload.data.url).toBe('/sprint/sprint-456');
    });

    it('should throw error if sprintId is not set', () => {
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
          },
        ],
        totalCards: 1,
        // sprintId not set
      };

      expect(() => prepareNotificationPayload(group)).toThrow(
        'sprintId must be set on group before preparing notification payload',
      );
    });
  });
});
