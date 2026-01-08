/**
 * Deck-related DTOs
 */

import type { ISODateString } from './common';

/**
 * Deck as returned in API responses
 */
export interface DeckDTO {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  parentDeckId: string | null;
  cardCount: number;
  dueCount?: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  subdecks?: DeckDTO[];
}

/**
 * Request to create a new deck
 */
export interface CreateDeckRequestDTO {
  title: string;
  description?: string;
  parentDeckId?: string;
  priority?: number;
}

/**
 * Request to update a deck
 */
export interface UpdateDeckRequestDTO {
  title?: string;
  description?: string | null;
  priority?: number;
}
