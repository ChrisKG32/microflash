/**
 * API Client Core
 *
 * Provides the base request helper and configuration for the MicroFlash API.
 * Designed to be platform-agnostic (works in React Native, Electron, web).
 */

/**
 * API error with status code and error details.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Auth header provider function.
 * Can be sync or async to support both dev headers and Clerk getToken().
 */
export type AuthHeaderProvider = () =>
  | Record<string, string>
  | Promise<Record<string, string>>;

/**
 * API client configuration.
 */
export interface ApiClientConfig {
  /** Base URL for the API (e.g., http://localhost:3000) */
  baseUrl: string;
  /** Function that returns auth headers (can be async for Clerk token) */
  getAuthHeaders: AuthHeaderProvider;
}

// Module-level configuration (set via configureApiClient)
let config: ApiClientConfig | null = null;

/**
 * Configure the API client.
 * Must be called before making any API requests.
 *
 * @example
 * // Mobile dev mode
 * configureApiClient({
 *   baseUrl: 'http://localhost:3000',
 *   getAuthHeaders: () => ({ 'x-dev-clerk-id': 'user_local_dev' }),
 * });
 *
 * @example
 * // Desktop with Clerk
 * configureApiClient({
 *   baseUrl: 'https://api.microflash.app',
 *   getAuthHeaders: async () => {
 *     const token = await clerk.session?.getToken();
 *     return token ? { Authorization: `Bearer ${token}` } : {};
 *   },
 * });
 */
export function configureApiClient(clientConfig: ApiClientConfig): void {
  config = clientConfig;
}

/**
 * Get the current API client configuration.
 * Throws if not configured.
 */
export function getApiClientConfig(): ApiClientConfig {
  if (!config) {
    throw new Error(
      'API client not configured. Call configureApiClient() first.',
    );
  }
  return config;
}

/**
 * Check if the API client is configured.
 */
export function isApiClientConfigured(): boolean {
  return config !== null;
}

/**
 * Make an authenticated API request.
 *
 * Handles:
 * - 204 No Content responses (returns undefined)
 * - Non-JSON error bodies gracefully
 * - Standard JSON responses
 */
export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const { baseUrl, getAuthHeaders } = getApiClientConfig();
  const url = `${baseUrl}${endpoint}`;

  // Get auth headers (may be async for Clerk token)
  const authHeaders = await getAuthHeaders();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 204 No Content (e.g., DELETE responses)
  if (response.status === 204) {
    return undefined as T;
  }

  // Try to parse JSON, handle non-JSON responses gracefully
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    // Non-JSON response body
    if (!response.ok) {
      throw new ApiError(
        response.status,
        'UNKNOWN',
        `Request failed with status ${response.status}`,
      );
    }
    // Successful non-JSON response (shouldn't happen, but handle gracefully)
    return undefined as T;
  }

  if (!response.ok) {
    const errorData = data as { error?: { code?: string; message?: string } };
    const error = errorData.error || {
      code: 'UNKNOWN',
      message: 'Unknown error',
    };
    throw new ApiError(
      response.status,
      error.code || 'UNKNOWN',
      error.message || 'Unknown error',
    );
  }

  return data as T;
}
