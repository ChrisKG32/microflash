/**
 * @microflash/api-client
 *
 * Shared API client for MicroFlash mobile and desktop apps.
 */

// Core client
export {
  ApiError,
  configureApiClient,
  getApiClientConfig,
  isApiClientConfigured,
  request,
  type ApiClientConfig,
  type AuthHeaderProvider,
} from './client';

// Types
export type {
  // User
  User,
  // Deck
  Deck,
  CreateDeckRequest,
  UpdateDeckRequest,
  // Card
  CardState,
  Card,
  CreateCardRequest,
  UpdateCardRequest,
  // Review
  Rating,
  Review,
  // Sprint
  SprintStatus,
  SprintSource,
  CardResult,
  SprintProgress,
  CardInSprint,
  SprintCard,
  Sprint,
  SprintStats,
  ResumableSprint,
  // Home
  HomeSummary,
  // Notifications
  NotificationPreferences,
  UpdateNotificationPreferencesRequest,
  // Dev/Test
  DevTestSprintNotificationResponse,
} from './types';

// API Methods
export {
  // User
  getMe,
  // Decks
  getDecks,
  createDeck,
  getDeck,
  updateDeck,
  deleteDeck,
  // Cards
  getCards,
  getDueCards,
  createCard,
  getCard,
  updateCard,
  deleteCard,
  // Reviews
  submitReview,
  // Sprints
  startSprint,
  getSprint,
  submitSprintReview,
  completeSprint,
  abandonSprint,
  // Home
  getHomeSummary,
  // Notifications
  registerPushToken,
  getNotificationPreferences,
  updateNotificationPreferences,
  snoozeCardNotifications,
  unsnoozeCard,
  // Onboarding
  markNotificationsPrompted,
  createFixtureSprint,
  completeOnboarding,
  // Dev/Test
  createDevTestSprintNotification,
} from './endpoints';
