/**
 * Common types used across the application
 */

// Card states from FSRS algorithm
export type CardState = 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING';

// Review ratings (4-grade scale)
export type Rating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

// Sprint statuses
export type SprintStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

// Sprint sources (where the sprint originated)
export type SprintSource = 'HOME' | 'DECK' | 'PUSH';

// Sprint card result
export type CardResult = 'PASS' | 'FAIL' | 'SKIP';

// ISO date string type for API responses
export type ISODateString = string;
