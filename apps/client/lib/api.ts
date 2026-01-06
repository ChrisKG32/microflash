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

  const data = await response.json();

  if (!response.ok) {
    const error = data.error || { code: 'UNKNOWN', message: 'Unknown error' };
    throw new ApiError(response.status, error.code, error.message);
  }

  return data;
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
  cardCount: number;
  createdAt: string;
  updatedAt: string;
  subdecks?: Deck[];
}

export interface Card {
  id: string;
  front: string;
  back: string;
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
}): Promise<{ deck: Deck }> {
  return request('/api/decks', {
    method: 'POST',
    body: JSON.stringify(data),
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

/**
 * Get specific cards by their IDs.
 * Used for notification deep links to fetch exact cards for a review session.
 */
export async function getCardsByIds(
  cardIds: string[],
): Promise<{ cards: Card[]; total: number; notFound: string[] }> {
  return request('/api/cards/by-ids', {
    method: 'POST',
    body: JSON.stringify({ cardIds }),
  });
}

/**
 * Create a new card.
 */
export async function createCard(data: {
  front: string;
  back: string;
  deckId: string;
}): Promise<{ card: Card }> {
  return request('/api/cards', {
    method: 'POST',
    body: JSON.stringify(data),
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
  hasPushToken: boolean;
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

/**
 * Update notification preferences.
 */
export async function updateNotificationPreferences(
  notificationsEnabled: boolean,
): Promise<{
  success: boolean;
  message: string;
  notificationsEnabled: boolean;
}> {
  return request('/api/notifications/preferences', {
    method: 'PATCH',
    body: JSON.stringify({ notificationsEnabled }),
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

/**
 * Batch snooze multiple cards.
 * Used when user taps "Snooze" on a notification.
 * @param cardIds - Array of card IDs to snooze
 * @param durationMinutes - Duration in minutes (default 60 = 1 hour)
 */
export async function snoozeCards(
  cardIds: string[],
  durationMinutes: number = 60,
): Promise<{
  success: boolean;
  message: string;
  snoozedCount: number;
  snoozedUntil: string;
}> {
  return request('/api/notifications/snooze', {
    method: 'POST',
    body: JSON.stringify({ cardIds, durationMinutes }),
  });
}
