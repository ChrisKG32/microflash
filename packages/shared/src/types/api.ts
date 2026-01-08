/**
 * Common API response types
 */

/**
 * Standard error response shape
 */
export interface ApiErrorDTO {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Paginated list response wrapper
 */
export interface PaginatedResponseDTO<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Simple success response
 */
export interface SuccessResponseDTO {
  success: boolean;
  message: string;
}
