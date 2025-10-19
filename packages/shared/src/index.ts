// Shared types and utilities

export type CardRating = 'Again' | 'Hard' | 'Good' | 'Easy';

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  nextReview: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deck {
  id: string;
  userId: string;
  name: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
