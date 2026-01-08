/**
 * Home screen DTOs
 */

import type { ISODateString } from './common';
import type { ResumableSprintDTO } from './sprint';

/**
 * Home screen summary data
 */
export interface HomeSummaryDTO {
  /** Total cards due for review (nextReviewDate <= now) */
  dueCount: number;

  /** Cards overdue by more than 24 hours */
  overdueCount: number;

  /** Active resumable sprint, if any */
  resumableSprint: ResumableSprintDTO | null;

  /** When the user is next eligible to receive a push notification */
  nextEligiblePushTime: ISODateString | null;

  /** Whether notifications are enabled for this user */
  notificationsEnabled: boolean;

  /** Whether user has a valid push token registered */
  hasPushToken: boolean;
}

/**
 * Response from home summary endpoint
 */
export interface GetHomeSummaryResponseDTO {
  summary: HomeSummaryDTO;
}
