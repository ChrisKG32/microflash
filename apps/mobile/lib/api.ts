/**
 * API client adapter for MicroFlash mobile app.
 *
 * This module configures and re-exports the shared @microflash/api-client.
 * All API methods and types are available from this module for backward compatibility.
 *
 * Uses environment variables:
 * - EXPO_PUBLIC_API_URL: Base URL for the API (e.g., http://localhost:3000)
 * - EXPO_PUBLIC_DEV_CLERK_ID: Dev auth header value (e.g., user_local_dev)
 */

import {
  configureApiClient,
  isApiClientConfigured,
} from '@microflash/api-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const DEV_CLERK_ID = process.env.EXPO_PUBLIC_DEV_CLERK_ID || 'user_local_dev';

// Configure the API client on module load
if (!isApiClientConfigured()) {
  configureApiClient({
    baseUrl: API_URL,
    getAuthHeaders: () => ({
      'x-dev-clerk-id': DEV_CLERK_ID,
    }),
  });
}

// Re-export everything from the shared API client
export {
  // Core
  ApiError,
  configureApiClient,
  getApiClientConfig,
  isApiClientConfigured,
  request,
  type ApiClientConfig,
  type AuthHeaderProvider,
  // Types
  type User,
  type Deck,
  type CreateDeckRequest,
  type UpdateDeckRequest,
  type CardState,
  type Card,
  type CreateCardRequest,
  type UpdateCardRequest,
  type Rating,
  type Review,
  type SprintStatus,
  type SprintSource,
  type CardResult,
  type SprintProgress,
  type CardInSprint,
  type SprintCard,
  type Sprint,
  type SprintStats,
  type ResumableSprint,
  type HomeSummary,
  type NotificationPreferences,
  type UpdateNotificationPreferencesRequest,
  type DevTestSprintNotificationResponse,
  // API Methods
  getMe,
  getDecks,
  createDeck,
  getDeck,
  updateDeck,
  deleteDeck,
  getCards,
  getDueCards,
  createCard,
  getCard,
  updateCard,
  deleteCard,
  submitReview,
  startSprint,
  getSprint,
  submitSprintReview,
  completeSprint,
  abandonSprint,
  getHomeSummary,
  registerPushToken,
  getNotificationPreferences,
  updateNotificationPreferences,
  snoozeCardNotifications,
  unsnoozeCard,
  createDevTestSprintNotification,
} from '@microflash/api-client';
