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

// Re-export everything from the shared API client. `export *` keeps this in
// sync automatically — the hand-maintained name list it replaces had to be
// edited every time the client gained an endpoint.
export * from '@microflash/api-client';
