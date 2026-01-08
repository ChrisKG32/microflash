/**
 * Card-related DTOs
 */

import type { CardState, ISODateString } from './common';

/**
 * Card as returned in API responses (full detail)
 */
export interface CardDTO {
  id: string;
  front: string;
  back: string;
  priority: number;
  deckId: string;
  deckTitle?: string;
  state: CardState;
  nextReviewDate: ISODateString;
  lastReview: ISODateString | null;
  snoozedUntil: ISODateString | null;
  reps: number;
  lapses: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Card as included in sprint responses (minimal for review)
 */
export interface CardInSprintDTO {
  id: string;
  front: string;
  back: string;
  priority: number;
  deckId: string;
  deckTitle?: string;
  state: CardState;
  nextReviewDate: ISODateString;
  snoozedUntil: ISODateString | null;
}

/**
 * Request to create a new card
 */
export interface CreateCardRequestDTO {
  front: string;
  back: string;
  deckId: string;
  priority?: number;
}

/**
 * Request to update a card
 */
export interface UpdateCardRequestDTO {
  front?: string;
  back?: string;
  priority?: number;
}
