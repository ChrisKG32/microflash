/**
 * API Client Configuration for Desktop
 *
 * Configures the shared API client for desktop use.
 * For now, uses dev mode with x-dev-clerk-id header.
 * TODO: Replace with Clerk token provider when auth is implemented.
 */

import { configureApiClient } from '@microflash/api-client';

// Default API URL - can be overridden via environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Dev mode Clerk ID - for development without real auth
const DEV_CLERK_ID =
  import.meta.env.VITE_DEV_CLERK_ID || 'user_desktop_local_dev';

/**
 * Initialize the API client for desktop.
 * Call this once at app startup.
 */
export function initializeApiClient(): void {
  configureApiClient({
    baseUrl: API_BASE_URL,
    getAuthHeaders: () => ({
      'x-dev-clerk-id': DEV_CLERK_ID,
    }),
  });
}
