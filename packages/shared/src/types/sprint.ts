/**
 * Sprint-related DTOs
 */

import type {
  SprintStatus,
  SprintSource,
  CardResult,
  Rating,
  ISODateString,
} from './common';
import type { CardInSprintDTO } from './card';

/**
 * Progress tracking for a sprint
 */
export interface SprintProgressDTO {
  total: number;
  reviewed: number;
  remaining: number;
}

/**
 * A card within a sprint
 */
export interface SprintCardDTO {
  id: string; // SprintCard ID
  order: number;
  result: CardResult | null;
  reviewedAt: ISODateString | null;
  card: CardInSprintDTO;
}

/**
 * Full sprint as returned in API responses
 */
export interface SprintDTO {
  id: string;
  status: SprintStatus;
  source: SprintSource;
  deckId: string | null;
  deckTitle: string | null;
  createdAt: ISODateString;
  startedAt: ISODateString | null;
  completedAt: ISODateString | null;
  resumableUntil: ISODateString | null;
  abandonedAt: ISODateString | null;
  cards: SprintCardDTO[];
  progress: SprintProgressDTO;
}

/**
 * Minimal sprint info for Home screen resume CTA
 */
export interface ResumableSprintDTO {
  id: string;
  resumableUntil: ISODateString;
  progress: SprintProgressDTO;
  deckTitle: string | null;
}

/**
 * Request to start a new sprint
 */
export interface StartSprintRequestDTO {
  deckId?: string;
  source?: SprintSource;
}

/**
 * Response from starting a sprint
 */
export interface StartSprintResponseDTO {
  sprint: SprintDTO;
  /** True if this is a resumed sprint, false if newly created */
  resumed: boolean;
}

/**
 * Response from getting a sprint
 */
export interface GetSprintResponseDTO {
  sprint: SprintDTO;
}

/**
 * Request to submit a review within a sprint
 */
export interface SubmitSprintReviewRequestDTO {
  cardId: string;
  rating: Rating;
}

/**
 * Response from submitting a review
 */
export interface SubmitSprintReviewResponseDTO {
  sprint: SprintDTO;
  /** The updated card after FSRS calculation */
  updatedCard: {
    id: string;
    nextReviewDate: ISODateString;
    state: string;
  };
}

/**
 * Response from completing a sprint
 */
export interface CompleteSprintResponseDTO {
  sprint: SprintDTO;
  /** Summary stats for the completed sprint */
  stats: {
    totalCards: number;
    reviewedCards: number;
    passCount: number;
    failCount: number;
    skipCount: number;
    durationSeconds: number | null;
  };
}

/**
 * Response from abandoning a sprint
 */
export interface AbandonSprintResponseDTO {
  sprint: SprintDTO;
  /** Number of cards that were snoozed */
  snoozedCardCount: number;
}
