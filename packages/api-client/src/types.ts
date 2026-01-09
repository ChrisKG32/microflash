/**
 * API Types
 *
 * Types for API requests and responses.
 * These match the current mobile api.ts types exactly to ensure compatibility.
 */

// =============================================================================
// User Types
// =============================================================================

export interface User {
  id: string;
  clerkId: string;
  notificationsEnabled: boolean;
  hasPushToken: boolean;
  createdAt: string;
}

// =============================================================================
// Deck Types
// =============================================================================

export interface Deck {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
  subdecks?: Deck[];
}

export interface CreateDeckRequest {
  title: string;
  description?: string;
  parentDeckId?: string;
  priority?: number;
}

export interface UpdateDeckRequest {
  title?: string;
  description?: string | null;
  parentDeckId?: string | null;
  priority?: number;
}

// =============================================================================
// Card Types
// =============================================================================

export type CardState = 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING';

export interface Card {
  id: string;
  front: string;
  back: string;
  priority: number;
  deckId: string;
  deckTitle?: string;
  state: CardState;
  nextReview: string;
  lastReview: string | null;
  reps: number;
  lapses: number;
  createdAt?: string;
}

export interface CreateCardRequest {
  front: string;
  back: string;
  deckId: string;
  priority?: number;
}

export interface UpdateCardRequest {
  front?: string;
  back?: string;
  deckId?: string;
  priority?: number;
}

// =============================================================================
// Review Types
// =============================================================================

export type Rating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export interface Review {
  id: string;
  cardId: string;
  rating: Rating;
  createdAt: string;
}

// =============================================================================
// Sprint Types
// =============================================================================

export type SprintStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
export type SprintSource = 'HOME' | 'DECK' | 'PUSH';
export type CardResult = 'PASS' | 'FAIL' | 'SKIP';

export interface SprintProgress {
  total: number;
  reviewed: number;
  remaining: number;
}

export interface CardInSprint {
  id: string;
  front: string;
  back: string;
  priority: number;
  deckId: string;
  deckTitle?: string;
  state: string;
  nextReviewDate: string;
  snoozedUntil: string | null;
}

export interface SprintCard {
  id: string;
  order: number;
  result: CardResult | null;
  reviewedAt: string | null;
  card: CardInSprint;
}

export interface Sprint {
  id: string;
  status: SprintStatus;
  source: SprintSource;
  deckId: string | null;
  deckTitle: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  resumableUntil: string | null;
  abandonedAt: string | null;
  cards: SprintCard[];
  progress: SprintProgress;
}

export interface SprintStats {
  totalCards: number;
  reviewedCards: number;
  passCount: number;
  failCount: number;
  skipCount: number;
  durationSeconds: number | null;
}

export interface ResumableSprint {
  id: string;
  resumableUntil: string | null;
  progress: SprintProgress;
  deckTitle: string | null;
}

// =============================================================================
// Home Types
// =============================================================================

export interface HomeSummary {
  dueCount: number;
  overdueCount: number;
  resumableSprint: ResumableSprint | null;
  nextEligiblePushTime: string | null;
  notificationsEnabled: boolean;
  hasPushToken: boolean;
}

// =============================================================================
// Notification Types
// =============================================================================

export interface NotificationPreferences {
  notificationsEnabled: boolean;
  notificationCooldownMinutes: number;
  maxNotificationsPerDay: number;
  hasPushToken: boolean;
  lastPushSentAt: string | null;
  notificationsCountToday: number;
}

export interface UpdateNotificationPreferencesRequest {
  notificationsEnabled?: boolean;
  notificationCooldownMinutes?: number;
  maxNotificationsPerDay?: number;
}

// =============================================================================
// Dev/Test Types
// =============================================================================

export interface DevTestSprintNotificationResponse {
  sprintId: string;
  cardCount: number;
  notification: {
    title: string;
    body: string;
    categoryId: string;
    data: {
      type: 'sprint';
      sprintId: string;
      url: string;
      cardCount: number;
    };
  };
}
