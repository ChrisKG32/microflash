/**
 * FSRS (Free Spaced Repetition Scheduler) Algorithm Service
 *
 * This service handles the scheduling calculations for spaced repetition.
 * Based on the FSRS-4.5 algorithm.
 *
 * Reference: https://github.com/open-spaced-repetition/fsrs4anki
 */

/**
 * Default FSRS parameters (FSRS-4.5 defaults)
 */
const DEFAULT_PARAMS = {
  // Initial stability values for each rating when card is new
  w: [
    0.4, // Again
    0.6, // Hard
    2.4, // Good
    5.8, // Easy
    4.93,
    0.94,
    0.86,
    0.01,
    1.49,
    0.14,
    0.94,
    2.18,
    0.05,
    0.34,
    1.26,
    0.29,
    2.61,
  ],
  requestRetention: 0.9, // Target retention rate (90%)
  maximumInterval: 36500, // Maximum interval in days (100 years)
};

/**
 * Card state enum values matching Prisma schema
 */
type CardStateValue = 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING';

/**
 * FSRS state for a new card
 */
export interface InitialFsrsState {
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardStateValue;
  lastReview: Date | null;
  nextReviewDate: Date;
}

/**
 * Get the initial difficulty for a new card.
 * FSRS uses an initial difficulty of around 0.3 (on a 0-1 scale).
 */
function getInitialDifficulty(): number {
  return 0.3;
}

/**
 * Get the initial stability for a new card.
 * For a new card rated "Good", the initial stability is around 2.4 days.
 */
function getInitialStability(): number {
  return DEFAULT_PARAMS.w[2]; // Good rating default
}

/**
 * Calculate the next review interval in days based on stability and target retention.
 *
 * Formula: interval = stability * (retention^(1/decay) - 1)
 * where decay = -0.5 (FSRS-4.5)
 */
function calculateInterval(stability: number, retention: number): number {
  const decay = -0.5;
  const factor = Math.pow(retention, 1 / decay) - 1;
  const interval = stability * factor;

  return Math.min(
    Math.max(Math.round(interval), 1), // Minimum 1 day
    DEFAULT_PARAMS.maximumInterval,
  );
}

/**
 * Initialize FSRS state for a new card.
 * Sets up initial values and calculates the first review date.
 *
 * @returns Initial FSRS state with nextReviewDate set
 */
export function initializeCardState(): InitialFsrsState {
  const stability = getInitialStability();
  const difficulty = getInitialDifficulty();

  // For a new card, schedule first review based on initial stability
  // Using target retention of 90%
  const scheduledDays = calculateInterval(
    stability,
    DEFAULT_PARAMS.requestRetention,
  );

  const now = new Date();
  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + scheduledDays);

  return {
    stability,
    difficulty,
    elapsedDays: 0,
    scheduledDays,
    reps: 0,
    lapses: 0,
    state: 'NEW',
    lastReview: null,
    nextReviewDate,
  };
}

/**
 * Get the FSRS parameters (for debugging/testing)
 */
export function getFsrsParams() {
  return { ...DEFAULT_PARAMS };
}
