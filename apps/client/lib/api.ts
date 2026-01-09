/**
 * API client adapter for MicroFlash mobile app.
 *
 * This module configures the shared @microflash/api-client and re-exports
 * for backward compatibility with existing imports.
 *
 * Uses environment variables:
 * - EXPO_PUBLIC_API_URL: Base URL for the API (e.g., http://localhost:3000)
 * - EXPO_PUBLIC_DEV_CLERK_ID: Dev auth header value (e.g., user_local_dev)
 */

import {
  configureApiClient,
  isApiClientConfigured,
} from '@microflash/api-client/client';

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

// Re-export from client module
export {
  ApiError,
  configureApiClient,
  getApiClientConfig,
  isApiClientConfigured,
  request,
  type ApiClientConfig,
  type AuthHeaderProvider,
} from '@microflash/api-client/client';

// Re-export types
export type {
  User,
  Deck,
  CreateDeckRequest,
  UpdateDeckRequest,
  CardState,
  Card,
  CreateCardRequest,
  UpdateCardRequest,
  Rating,
  Review,
  SprintStatus,
  SprintSource,
  CardResult,
  SprintProgress,
  CardInSprint,
  SprintCard,
  Sprint,
  SprintStats,
  ResumableSprint,
  HomeSummary,
  NotificationPreferences,
  UpdateNotificationPreferencesRequest,
  DevTestSprintNotificationResponse,
} from '@microflash/api-client/types';

// Re-export API methods
export {
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
} from '@microflash/api-client/endpoints';
