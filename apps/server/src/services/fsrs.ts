/**
 * FSRS (Free Spaced Repetition Scheduler) Algorithm Implementation
 *
 * This module implements the FSRS algorithm for calculating optimal review intervals
 * based on user performance. FSRS is a modern spaced repetition algorithm that
 * uses a more sophisticated model than traditional SM-2.
 *
 * @see https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 */

// Re-export Prisma enums for convenience
// These are the canonical source of truth for card states and ratings
export { CardState, Rating } from '@/generated/prisma';

/**
 * FSRS state stored with each card.
 * These values track the card's learning progress and are used to calculate
 * the next review interval.
 */
export interface FSRSState {
  /** Stability: Expected number of days until recall probability drops to 90% */
  stability: number;
  /** Difficulty: Card difficulty on a 0-10 scale (higher = harder) */
  difficulty: number;
  /** Elapsed days since last review */
  elapsedDays: number;
  /** Scheduled days until next review */
  scheduledDays: number;
  /** Number of successful reviews (repetitions) */
  reps: number;
  /** Number of times the card was forgotten (lapses) */
  lapses: number;
  /** Current learning state of the card */
  state: import('@/generated/prisma').CardState;
  /** Timestamp of the last review, null if never reviewed */
  lastReview: Date | null;
}

/**
 * Result of calculating the next review.
 * Contains the updated FSRS state and the scheduled next review date.
 */
export interface FSRSReviewResult {
  /** Updated FSRS state after the review */
  state: FSRSState;
  /** When the card should next be reviewed */
  nextReviewDate: Date;
}

/**
 * FSRS algorithm parameters.
 * These are the default parameters from FSRS-4.5.
 * They can be customized per-user in the future for personalized scheduling.
 */
export interface FSRSParameters {
  /** Request retention: Target probability of recall (default: 0.9 = 90%) */
  requestRetention: number;
  /** Maximum interval in days (default: 36500 = ~100 years) */
  maximumInterval: number;
  /** Weights for the FSRS algorithm (17 parameters) */
  w: readonly number[];
}

/**
 * Default FSRS-4.5 parameters.
 * These weights are optimized from large-scale Anki data.
 */
export const DEFAULT_FSRS_PARAMETERS: FSRSParameters = {
  requestRetention: 0.9,
  maximumInterval: 36500,
  // FSRS-4.5 default weights
  w: [
    0.4, // w0: Initial stability for Again
    0.6, // w1: Initial stability for Hard
    2.4, // w2: Initial stability for Good
    5.8, // w3: Initial stability for Easy
    4.93, // w4: Difficulty weight
    0.94, // w5: Difficulty weight
    0.86, // w6: Difficulty weight
    0.01, // w7: Difficulty weight
    1.49, // w8: Stability weight
    0.14, // w9: Stability weight
    0.94, // w10: Stability weight
    2.18, // w11: Stability weight
    0.05, // w12: Stability weight
    0.34, // w13: Stability weight
    1.26, // w14: Stability weight
    0.29, // w15: Stability weight
    2.61, // w16: Stability weight
  ],
} as const;

/**
 * Numeric values for ratings used in calculations.
 * Matches the Prisma Rating enum order.
 */
export const RATING_VALUES = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4,
} as const;

/**
 * Numeric values for card states used in calculations.
 * Matches the Prisma CardState enum order.
 */
export const STATE_VALUES = {
  NEW: 0,
  LEARNING: 1,
  REVIEW: 2,
  RELEARNING: 3,
} as const;

/**
 * Type for rating string literals.
 */
export type RatingType = keyof typeof RATING_VALUES;

/**
 * Type for card state string literals.
 */
export type CardStateType = keyof typeof STATE_VALUES;
