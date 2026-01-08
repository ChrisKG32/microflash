/**
 * Shared type definitions for MicroFlash API
 *
 * These DTOs define the contract between client and server.
 * Both apps/client and apps/server should import from here.
 */

// Common types
export type {
  CardState,
  Rating,
  SprintStatus,
  SprintSource,
  CardResult,
  ISODateString,
} from './common';

// Card types
export type {
  CardDTO,
  CardInSprintDTO,
  CreateCardRequestDTO,
  UpdateCardRequestDTO,
} from './card';

// Deck types
export type {
  DeckDTO,
  CreateDeckRequestDTO,
  UpdateDeckRequestDTO,
} from './deck';

// Sprint types
export type {
  SprintProgressDTO,
  SprintCardDTO,
  SprintDTO,
  ResumableSprintDTO,
  StartSprintRequestDTO,
  StartSprintResponseDTO,
  GetSprintResponseDTO,
  SubmitSprintReviewRequestDTO,
  SubmitSprintReviewResponseDTO,
  CompleteSprintResponseDTO,
  AbandonSprintResponseDTO,
} from './sprint';

// Home types
export type { HomeSummaryDTO, GetHomeSummaryResponseDTO } from './home';

// Notification types
export type {
  NotificationPrefsDTO,
  UpdateNotificationPrefsRequestDTO,
  UpdateNotificationPrefsResponseDTO,
  RegisterPushTokenRequestDTO,
  RegisterPushTokenResponseDTO,
  SprintPushPayloadDTO,
} from './notifications';

// Review types
export type {
  ReviewDTO,
  CreateReviewRequestDTO,
  CreateReviewResponseDTO,
} from './review';

// User types
export type {
  UserDTO,
  GetMeResponseDTO,
  UpdateUserSettingsRequestDTO,
} from './user';

// API types
export type {
  ApiErrorDTO,
  PaginatedResponseDTO,
  SuccessResponseDTO,
} from './api';
