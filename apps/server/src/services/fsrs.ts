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

// =============================================================================
// FSRS Initialization Functions
// =============================================================================

/**
 * Initialize FSRS state for a new card.
 * Sets default values according to the FSRS algorithm specification.
 *
 * @returns Initial FSRS state for a new card
 */
export function initializeFSRS(): FSRSState {
  return {
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 'NEW' as const,
    lastReview: null,
  };
}

/**
 * Calculate the initial review date for a new card.
 * New cards are immediately available for review.
 *
 * @returns The initial review date (now, meaning immediately available)
 */
export function calculateInitialReviewDate(): Date {
  return new Date();
}

// =============================================================================
// FSRS Core Algorithm Functions
// =============================================================================

/**
 * Learning step intervals in minutes.
 * Used for cards in LEARNING or RELEARNING state.
 */
const LEARNING_STEPS_MINUTES = [1, 10]; // 1 minute, then 10 minutes

/**
 * Clamp a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate initial difficulty for a new card based on the first rating.
 * Uses FSRS formula: D0(G) = w4 - (G-3) * w5
 *
 * @param rating - The first rating given to the card
 * @param params - FSRS parameters
 * @returns Initial difficulty value (clamped to 1-10)
 */
function calculateInitialDifficulty(
  rating: RatingType,
  params: FSRSParameters = DEFAULT_FSRS_PARAMETERS,
): number {
  const g = RATING_VALUES[rating];
  const w = params.w;
  const d0 = w[4] - (g - 3) * w[5];
  return clamp(d0, 1, 10);
}

/**
 * Calculate initial stability for a new card based on the first rating.
 * Uses FSRS formula: S0(G) = w[G-1]
 *
 * @param rating - The first rating given to the card
 * @param params - FSRS parameters
 * @returns Initial stability value in days
 */
function calculateInitialStability(
  rating: RatingType,
  params: FSRSParameters = DEFAULT_FSRS_PARAMETERS,
): number {
  const g = RATING_VALUES[rating];
  return params.w[g - 1];
}

/**
 * Calculate the retrievability (probability of recall) given stability and elapsed days.
 * Uses FSRS formula: R(t,S) = (1 + t/(9*S))^(-1)
 *
 * @param stability - Current stability in days
 * @param elapsedDays - Days since last review
 * @returns Retrievability (0-1)
 */
function calculateRetrievability(
  stability: number,
  elapsedDays: number,
): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

/**
 * Update difficulty after a review.
 * Uses FSRS formula: D'(D,G) = w6 * D0(3) + (1 - w6) * (D - w7 * (G - 3))
 *
 * @param currentDifficulty - Current difficulty
 * @param rating - The rating given
 * @param params - FSRS parameters
 * @returns Updated difficulty (clamped to 1-10)
 */
function updateDifficulty(
  currentDifficulty: number,
  rating: RatingType,
  params: FSRSParameters = DEFAULT_FSRS_PARAMETERS,
): number {
  const g = RATING_VALUES[rating];
  const w = params.w;
  const d0 = w[4]; // D0(3) = w4 when G=3
  const newD = w[6] * d0 + (1 - w[6]) * (currentDifficulty - w[7] * (g - 3));
  return clamp(newD, 1, 10);
}

/**
 * Calculate stability after a successful recall (rating >= HARD).
 * Uses FSRS formula for stability increase.
 *
 * @param difficulty - Current difficulty
 * @param stability - Current stability
 * @param retrievability - Current retrievability
 * @param rating - The rating given
 * @param params - FSRS parameters
 * @returns New stability value
 */
function calculateRecallStability(
  difficulty: number,
  stability: number,
  retrievability: number,
  rating: RatingType,
  params: FSRSParameters = DEFAULT_FSRS_PARAMETERS,
): number {
  const g = RATING_VALUES[rating];
  const w = params.w;

  // Hard penalty or Easy bonus
  let hardPenalty = 1;
  let easyBonus = 1;
  if (rating === 'HARD') {
    hardPenalty = w[15];
  } else if (rating === 'EASY') {
    easyBonus = w[16];
  }

  // FSRS stability formula for recall
  const newS =
    stability *
    (1 +
      Math.exp(w[8]) *
        (11 - difficulty) *
        Math.pow(stability, -w[9]) *
        (Math.exp((1 - retrievability) * w[10]) - 1) *
        hardPenalty *
        easyBonus);

  return Math.max(0.1, newS);
}

/**
 * Calculate stability after forgetting (rating = AGAIN).
 * Uses FSRS formula for stability after lapse.
 *
 * @param difficulty - Current difficulty
 * @param stability - Current stability
 * @param retrievability - Current retrievability
 * @param params - FSRS parameters
 * @returns New stability value (reset to a lower value)
 */
function calculateForgetStability(
  difficulty: number,
  stability: number,
  retrievability: number,
  params: FSRSParameters = DEFAULT_FSRS_PARAMETERS,
): number {
  const w = params.w;

  // FSRS stability formula for forget
  const newS =
    w[11] *
    Math.pow(difficulty, -w[12]) *
    (Math.pow(stability + 1, w[13]) - 1) *
    Math.exp((1 - retrievability) * w[14]);

  return Math.max(0.1, Math.min(newS, stability));
}

/**
 * Calculate the interval in days from stability and desired retention.
 * Uses FSRS formula: I(r,S) = 9 * S * (1/r - 1)
 *
 * @param stability - Stability in days
 * @param requestRetention - Desired retention rate (default 0.9)
 * @param maxInterval - Maximum interval in days
 * @returns Interval in days
 */
function calculateInterval(
  stability: number,
  requestRetention: number = 0.9,
  maxInterval: number = 36500,
): number {
  const interval = 9 * stability * (1 / requestRetention - 1);
  return Math.min(Math.max(1, Math.round(interval)), maxInterval);
}

/**
 * Get the next learning step interval in minutes.
 *
 * @param reps - Number of repetitions in current learning cycle
 * @returns Interval in minutes
 */
function getLearningStepMinutes(reps: number): number {
  const stepIndex = Math.min(reps, LEARNING_STEPS_MINUTES.length - 1);
  return LEARNING_STEPS_MINUTES[stepIndex];
}

/**
 * Calculate the next review based on current state and rating.
 * This is the main FSRS algorithm function.
 *
 * @param currentState - Current FSRS state of the card
 * @param rating - The rating given by the user
 * @param reviewTime - When the review occurred (defaults to now)
 * @param params - FSRS parameters (defaults to FSRS-4.5)
 * @returns Updated state and next review date
 */
export function calculateNextReview(
  currentState: FSRSState,
  rating: RatingType,
  reviewTime: Date = new Date(),
  params: FSRSParameters = DEFAULT_FSRS_PARAMETERS,
): FSRSReviewResult {
  const { state, stability, difficulty, reps, lapses, lastReview } =
    currentState;

  // Calculate elapsed days since last review
  let elapsedDays = 0;
  if (lastReview) {
    elapsedDays = Math.max(
      0,
      (reviewTime.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  // Initialize result with current values
  let newStability = stability;
  let newDifficulty = difficulty;
  let newState: CardStateType = state;
  let newReps = reps;
  let newLapses = lapses;
  let scheduledDays = 0;
  let nextReviewDate: Date;

  // Handle based on current state
  if (state === 'NEW') {
    // First review of a new card
    newStability = calculateInitialStability(rating, params);
    newDifficulty = calculateInitialDifficulty(rating, params);
    newReps = 1;

    if (rating === 'AGAIN') {
      // Failed first review - go to learning
      newState = 'LEARNING';
      newLapses = 1;
      const minutes = getLearningStepMinutes(0);
      nextReviewDate = new Date(reviewTime.getTime() + minutes * 60 * 1000);
      scheduledDays = minutes / (60 * 24);
    } else if (rating === 'HARD') {
      // Hard on first review - short learning period
      newState = 'LEARNING';
      const minutes = getLearningStepMinutes(0);
      nextReviewDate = new Date(reviewTime.getTime() + minutes * 60 * 1000);
      scheduledDays = minutes / (60 * 24);
    } else if (rating === 'GOOD') {
      // Good on first review - graduate to review
      newState = 'REVIEW';
      scheduledDays = calculateInterval(
        newStability,
        params.requestRetention,
        params.maximumInterval,
      );
      nextReviewDate = new Date(
        reviewTime.getTime() + scheduledDays * 24 * 60 * 60 * 1000,
      );
    } else {
      // Easy on first review - graduate with bonus
      newState = 'REVIEW';
      scheduledDays = calculateInterval(
        newStability,
        params.requestRetention,
        params.maximumInterval,
      );
      nextReviewDate = new Date(
        reviewTime.getTime() + scheduledDays * 24 * 60 * 60 * 1000,
      );
    }
  } else if (state === 'LEARNING' || state === 'RELEARNING') {
    // Card is in learning/relearning phase
    newReps = reps + 1;

    if (rating === 'AGAIN') {
      // Reset learning progress
      newLapses = state === 'LEARNING' ? lapses : lapses + 1;
      newState = state === 'LEARNING' ? 'LEARNING' : 'RELEARNING';
      const minutes = getLearningStepMinutes(0);
      nextReviewDate = new Date(reviewTime.getTime() + minutes * 60 * 1000);
      scheduledDays = minutes / (60 * 24);
      // Recalculate stability on lapse
      if (stability > 0) {
        const retrievability = calculateRetrievability(stability, elapsedDays);
        newStability = calculateForgetStability(
          difficulty,
          stability,
          retrievability,
          params,
        );
      }
    } else if (rating === 'HARD') {
      // Stay in learning but advance
      const minutes = getLearningStepMinutes(newReps - 1);
      nextReviewDate = new Date(reviewTime.getTime() + minutes * 60 * 1000);
      scheduledDays = minutes / (60 * 24);
    } else {
      // Good or Easy - graduate to review
      newState = 'REVIEW';
      if (stability > 0) {
        const retrievability = calculateRetrievability(stability, elapsedDays);
        newStability = calculateRecallStability(
          difficulty,
          stability,
          retrievability,
          rating,
          params,
        );
        newDifficulty = updateDifficulty(difficulty, rating, params);
      } else {
        // First time graduating
        newStability = calculateInitialStability(rating, params);
        newDifficulty = calculateInitialDifficulty(rating, params);
      }
      scheduledDays = calculateInterval(
        newStability,
        params.requestRetention,
        params.maximumInterval,
      );
      nextReviewDate = new Date(
        reviewTime.getTime() + scheduledDays * 24 * 60 * 60 * 1000,
      );
    }
  } else {
    // Card is in REVIEW state
    const retrievability = calculateRetrievability(stability, elapsedDays);
    newReps = reps + 1;

    if (rating === 'AGAIN') {
      // Lapse - go to relearning
      newState = 'RELEARNING';
      newLapses = lapses + 1;
      newStability = calculateForgetStability(
        difficulty,
        stability,
        retrievability,
        params,
      );
      newDifficulty = updateDifficulty(difficulty, rating, params);
      const minutes = getLearningStepMinutes(0);
      nextReviewDate = new Date(reviewTime.getTime() + minutes * 60 * 1000);
      scheduledDays = minutes / (60 * 24);
    } else {
      // Successful recall
      newStability = calculateRecallStability(
        difficulty,
        stability,
        retrievability,
        rating,
        params,
      );
      newDifficulty = updateDifficulty(difficulty, rating, params);
      scheduledDays = calculateInterval(
        newStability,
        params.requestRetention,
        params.maximumInterval,
      );
      nextReviewDate = new Date(
        reviewTime.getTime() + scheduledDays * 24 * 60 * 60 * 1000,
      );
    }
  }

  return {
    state: {
      stability: newStability,
      difficulty: newDifficulty,
      elapsedDays: Math.round(elapsedDays),
      scheduledDays: Math.round(scheduledDays),
      reps: newReps,
      lapses: newLapses,
      state: newState,
      lastReview: reviewTime,
    },
    nextReviewDate,
  };
}
