/**
 * API Endpoint Methods
 *
 * All API methods for the MicroFlash server.
 * These match the current mobile api.ts methods exactly.
 */

import { request } from './client';
import type {
  User,
  Deck,
  CreateDeckRequest,
  UpdateDeckRequest,
  Card,
  CreateCardRequest,
  UpdateCardRequest,
  Review,
  Rating,
  Sprint,
  SprintSource,
  SprintStats,
  HomeSummary,
  NotificationPreferences,
  UpdateNotificationPreferencesRequest,
  DevTestSprintNotificationResponse,
} from './types';

// =============================================================================
// User API Methods
// =============================================================================

/**
 * Get current authenticated user.
 */
export async function getMe(): Promise<{ user: User }> {
  return request('/api/me');
}

// =============================================================================
// Deck API Methods
// =============================================================================

/**
 * Get all decks for the current user.
 */
export async function getDecks(): Promise<{ decks: Deck[]; total: number }> {
  return request('/api/decks');
}

/**
 * Create a new deck.
 */
export async function createDeck(
  data: CreateDeckRequest,
): Promise<{ deck: Deck }> {
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
  data: UpdateDeckRequest,
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

// =============================================================================
// Card API Methods
// =============================================================================

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
 * Create a new card.
 */
export async function createCard(
  data: CreateCardRequest,
): Promise<{ card: Card }> {
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
  data: UpdateCardRequest,
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

// =============================================================================
// Review API Methods
// =============================================================================

/**
 * Submit a card review.
 */
export async function submitReview(data: {
  cardId: string;
  rating: Rating;
}): Promise<{ review: Review; card: Card }> {
  return request('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// =============================================================================
// Sprint API Methods
// =============================================================================

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

// =============================================================================
// Home API Methods
// =============================================================================

/**
 * Get home screen summary data.
 */
export async function getHomeSummary(): Promise<{ summary: HomeSummary }> {
  return request('/api/home/summary');
}

// =============================================================================
// Notification API Methods
// =============================================================================

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

// =============================================================================
// Onboarding API Methods
// =============================================================================

/**
 * Mark that notifications prompt was shown.
 */
export async function markNotificationsPrompted(): Promise<{
  success: boolean;
}> {
  return request('/api/onboarding/notifications-prompted', {
    method: 'POST',
  });
}

/**
 * Create a sprint using the onboarding fixture deck.
 */
export async function createFixtureSprint(): Promise<{ sprint: Sprint }> {
  return request('/api/onboarding/fixture-sprint', {
    method: 'POST',
  });
}

/**
 * Complete onboarding (deletes fixture, marks complete).
 */
export async function completeOnboarding(): Promise<{ success: boolean }> {
  return request('/api/onboarding/complete', {
    method: 'POST',
  });
}

// =============================================================================
// Dev/Test API Methods (non-production only)
// =============================================================================

/**
 * Create a test sprint notification for development testing.
 *
 * Creates a PENDING push sprint on the server and returns the notification
 * payload so the client can schedule a local notification.
 *
 * Only available in non-production environments.
 */
export async function createDevTestSprintNotification(): Promise<DevTestSprintNotificationResponse> {
  return request('/api/notifications/dev/test-sprint', {
    method: 'POST',
  });
}
