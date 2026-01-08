/**
 * API client for MicroFlash server.
 *
 * Uses environment variables:
 * - EXPO_PUBLIC_API_URL: Base URL for the API (e.g., http://localhost:3000)
 * - EXPO_PUBLIC_DEV_CLERK_ID: Dev auth header value (e.g., user_local_dev)
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const DEV_CLERK_ID = process.env.EXPO_PUBLIC_DEV_CLERK_ID || 'user_local_dev';

/**
 * API error with status code and error details.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Make an authenticated API request.
 *
 * Handles:
 * - 204 No Content responses (returns undefined)
 * - Non-JSON error bodies gracefully
 * - Standard JSON responses
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-dev-clerk-id': DEV_CLERK_ID,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 204 No Content (e.g., DELETE responses)
  if (response.status === 204) {
    return undefined as T;
  }

  // Try to parse JSON, handle non-JSON responses gracefully
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    // Non-JSON response body
    if (!response.ok) {
      throw new ApiError(
        response.status,
        'UNKNOWN',
        `Request failed with status ${response.status}`,
      );
    }
    // Successful non-JSON response (shouldn't happen, but handle gracefully)
    return undefined as T;
  }

  if (!response.ok) {
    const errorData = data as { error?: { code?: string; message?: string } };
    const error = errorData.error || {
      code: 'UNKNOWN',
      message: 'Unknown error',
    };
    throw new ApiError(
      response.status,
      error.code || 'UNKNOWN',
      error.message || 'Unknown error',
    );
  }

  return data as T;
}

// =============================================================================
// API Types
// =============================================================================

export interface User {
  id: string;
  clerkId: string;
  notificationsEnabled: boolean;
  hasPushToken: boolean;
  createdAt: string;
}

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

export interface Card {
  id: string;
  front: string;
  back: string;
  priority: number;
  deckId: string;
  deckTitle?: string;
  state: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING';
  nextReview: string;
  lastReview: string | null;
  reps: number;
  lapses: number;
  createdAt?: string;
}

export interface Review {
  id: string;
  cardId: string;
  rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
  createdAt: string;
}

// =============================================================================
// API Methods
// =============================================================================

/**
 * Get current authenticated user.
 */
export async function getMe(): Promise<{ user: User }> {
  return request('/api/me');
}

/**
 * Get all decks for the current user.
 */
export async function getDecks(): Promise<{ decks: Deck[]; total: number }> {
  return request('/api/decks');
}

/**
 * Create a new deck.
 */
export async function createDeck(data: {
  title: string;
  description?: string;
  parentDeckId?: string;
  priority?: number;
}): Promise<{ deck: Deck }> {
  return request('/api/decks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get a single deck by ID.
 */
export async function getDeck(deckId: string): Promise<{ deck: Deck }> {
  return request(`/api/decks/${deckId}`);
}

/**
 * Update a deck.
 */
export async function updateDeck(
  deckId: string,
  data: {
    title?: string;
    description?: string | null;
    parentDeckId?: string | null;
    priority?: number;
  },
): Promise<{ deck: Deck }> {
  return request(`/api/decks/${deckId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a deck.
 */
export async function deleteDeck(deckId: string): Promise<void> {
  return request(`/api/decks/${deckId}`, {
    method: 'DELETE',
  });
}

/**
 * Get cards, optionally filtered by deck.
 */
export async function getCards(
  deckId?: string,
): Promise<{ cards: Card[]; total: number }> {
  const endpoint = deckId ? `/api/cards?deckId=${deckId}` : '/api/cards';
  return request(endpoint);
}

/**
 * Get cards due for review.
 */
export async function getDueCards(): Promise<{ cards: Card[]; total: number }> {
  return request('/api/cards/due');
}

// =============================================================================
// Home API Methods
// =============================================================================

export type SprintStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
export type SprintSource = 'HOME' | 'DECK' | 'PUSH';
export type CardResult = 'PASS' | 'FAIL' | 'SKIP';
export type Rating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export interface SprintProgress {
  total: number;
  reviewed: number;
  remaining: number;
}

export interface ResumableSprint {
  id: string;
  resumableUntil: string | null;
  progress: SprintProgress;
  deckTitle: string | null;
}

export interface HomeSummary {
  dueCount: number;
  overdueCount: number;
  resumableSprint: ResumableSprint | null;
  nextEligiblePushTime: string | null;
  notificationsEnabled: boolean;
  hasPushToken: boolean;
}

/**
 * Get home screen summary data.
 */
export async function getHomeSummary(): Promise<{ summary: HomeSummary }> {
  return request('/api/home/summary');
}

// =============================================================================
// Sprint API Methods
// =============================================================================

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

/**
 * Start a new sprint or resume an existing one.
 */
export async function startSprint(data?: {
  deckId?: string;
  source?: SprintSource;
}): Promise<{ sprint: Sprint; resumed: boolean }> {
  return request('/api/sprints/start', {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

/**
 * Get a sprint by ID.
 */
export async function getSprint(sprintId: string): Promise<{ sprint: Sprint }> {
  return request(`/api/sprints/${sprintId}`);
}

/**
 * Submit a review for a card in a sprint.
 */
export async function submitSprintReview(
  sprintId: string,
  data: { cardId: string; rating: Rating },
): Promise<{
  sprint: Sprint;
  updatedCard: { id: string; nextReviewDate: string; state: string };
}> {
  return request(`/api/sprints/${sprintId}/review`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Complete a sprint.
 */
export async function completeSprint(
  sprintId: string,
): Promise<{ sprint: Sprint; stats: SprintStats }> {
  return request(`/api/sprints/${sprintId}/complete`, {
    method: 'POST',
  });
}

/**
 * Abandon a sprint and snooze remaining cards.
 * Used when user taps "Snooze" on a notification.
 * @param sprintId - The sprint to abandon
 */
export async function abandonSprint(sprintId: string): Promise<{
  sprint: Sprint;
  snoozedCardCount: number;
}> {
  return request(`/api/sprints/${sprintId}/abandon`, {
    method: 'POST',
  });
}

/**
 * Create a new card.
 */
export async function createCard(data: {
  front: string;
  back: string;
  deckId: string;
  priority?: number;
}): Promise<{ card: Card }> {
  return request('/api/cards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get a single card by ID.
 */
export async function getCard(cardId: string): Promise<{ card: Card }> {
  return request(`/api/cards/${cardId}`);
}

/**
 * Update a card.
 */
export async function updateCard(
  cardId: string,
  data: {
    front?: string;
    back?: string;
    deckId?: string;
    priority?: number;
  },
): Promise<{ card: Card }> {
  return request(`/api/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a card.
 */
export async function deleteCard(cardId: string): Promise<void> {
  return request(`/api/cards/${cardId}`, {
    method: 'DELETE',
  });
}

/**
 * Submit a card review.
 */
export async function submitReview(data: {
  cardId: string;
  rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
}): Promise<{ review: Review; card: Card }> {
  return request('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// =============================================================================
// Notification API Methods
// =============================================================================

export interface NotificationPreferences {
  notificationsEnabled: boolean;
  notificationCooldownMinutes: number;
  maxNotificationsPerDay: number;
  hasPushToken: boolean;
  lastPushSentAt: string | null;
  notificationsCountToday: number;
}

/**
 * Register an Expo push token with the server.
 * Call this after obtaining a token from expo-notifications.
 */
export async function registerPushToken(
  pushToken: string,
): Promise<{ success: boolean; message: string }> {
  return request('/api/notifications/register', {
    method: 'POST',
    body: JSON.stringify({ pushToken }),
  });
}

/**
 * Get current notification preferences.
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return request('/api/notifications/preferences');
}

export interface UpdateNotificationPreferencesRequest {
  notificationsEnabled?: boolean;
  notificationCooldownMinutes?: number;
  maxNotificationsPerDay?: number;
}

/**
 * Update notification preferences.
 */
export async function updateNotificationPreferences(
  prefs: UpdateNotificationPreferencesRequest,
): Promise<{
  success: boolean;
  message: string;
  prefs: NotificationPreferences;
}> {
  return request('/api/notifications/preferences', {
    method: 'PATCH',
    body: JSON.stringify(prefs),
  });
}

/**
 * Snooze notifications for a specific card.
 * @param cardId - The card to snooze
 * @param duration - Duration in minutes (1-1440, default 30)
 */
export async function snoozeCardNotifications(
  cardId: string,
  duration: number = 30,
): Promise<{ success: boolean; message: string; snoozedUntil: string }> {
  return request(`/api/notifications/cards/${cardId}/snooze`, {
    method: 'POST',
    body: JSON.stringify({ duration }),
  });
}

/**
 * Remove snooze from a card.
 */
export async function unsnoozeCard(
  cardId: string,
): Promise<{ success: boolean; message: string }> {
  return request(`/api/notifications/cards/${cardId}/snooze`, {
    method: 'DELETE',
  });
}
