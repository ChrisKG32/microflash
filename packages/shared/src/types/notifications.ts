/**
 * Notification-related DTOs
 */

import type { ISODateString } from './common';

/**
 * User's notification preferences (simplified for MVP)
 * Note: quietHours and backlogThreshold are deferred to post-MVP
 */
export interface NotificationPrefsDTO {
  /** Whether notifications are enabled */
  notificationsEnabled: boolean;

  /** Minimum minutes between push notifications (>=120) */
  notificationCooldownMinutes: number;

  /** Maximum notifications per day */
  maxNotificationsPerDay: number;

  /** Whether user has a valid push token */
  hasPushToken: boolean;

  /** When the last push was sent */
  lastPushSentAt: ISODateString | null;

  /** Number of notifications sent today */
  notificationsCountToday: number;
}

/**
 * Request to update notification preferences
 */
export interface UpdateNotificationPrefsRequestDTO {
  notificationsEnabled?: boolean;
  notificationCooldownMinutes?: number;
  maxNotificationsPerDay?: number;
}

/**
 * Response from updating notification preferences
 */
export interface UpdateNotificationPrefsResponseDTO {
  success: boolean;
  message: string;
  prefs: NotificationPrefsDTO;
}

/**
 * Request to register a push token
 */
export interface RegisterPushTokenRequestDTO {
  pushToken: string;
}

/**
 * Response from registering a push token
 */
export interface RegisterPushTokenResponseDTO {
  success: boolean;
  message: string;
}

/**
 * Push notification payload data for sprint notifications
 */
export interface SprintPushPayloadDTO {
  type: 'sprint';
  sprintId: string;
  url: string;
  cardCount: number;
}
