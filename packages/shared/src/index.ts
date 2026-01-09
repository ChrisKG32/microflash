/**
 * @microflash/shared
 *
 * Shared types and utilities for MicroFlash client and server.
 */

// Re-export all types from the types module
export * from './types';

// Legacy exports (deprecated - use types module instead)
// Keeping for backwards compatibility during migration

/** @deprecated Use Rating from types instead */
export type CardRating = 'Again' | 'Hard' | 'Good' | 'Easy';

/** @deprecated Use CardDTO from types instead */
export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  nextReview: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** @deprecated Use DeckDTO from types instead */
export interface Deck {
  id: string;
  userId: string;
  name: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
