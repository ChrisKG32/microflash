/**
 * User-related DTOs
 */

import type { ISODateString } from './common';

/**
 * User profile as returned in API responses
 */
export interface UserDTO {
  id: string;
  clerkId: string;
  notificationsEnabled: boolean;
  hasPushToken: boolean;
  onboardingComplete: boolean;
  sprintSize: number;
  createdAt: ISODateString;
}

/**
 * Response from /api/me endpoint
 */
export interface GetMeResponseDTO {
  user: UserDTO;
}

/**
 * Request to update user settings
 */
export interface UpdateUserSettingsRequestDTO {
  sprintSize?: number;
}
