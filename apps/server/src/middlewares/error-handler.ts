import type {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from 'express';
import { ZodError } from 'zod';

/**
 * Standard API error response shape.
 * All error responses follow this format for consistency.
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

/**
 * Custom API error class for throwing errors with specific status codes.
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Format Zod validation errors into our standard error response format.
 */
function formatZodError(error: ZodError): ApiErrorResponse {
  const details = error.issues.map((issue) => ({
    field: issue.path.join('.') || 'unknown',
    message: issue.message,
  }));

  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details,
    },
  };
}

/**
 * Global error handler middleware.
 * Catches all errors and returns consistent JSON responses.
 *
 * Error handling order:
 * 1. Zod validation errors -> 400 with field-level details
 * 2. Custom ApiError -> specified status code
 * 3. Unknown errors -> 500 without exposing internals
 */
export const errorHandler: ErrorRequestHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Log error for debugging (but don't expose in response)
  console.error('Error:', error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json(formatZodError(error));
    return;
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    } as ApiErrorResponse);
    return;
  }

  // Handle unknown errors - don't expose internals
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  } as ApiErrorResponse);
};

/**
 * Async route handler wrapper that catches errors and passes them to the error handler.
 * Use this to wrap async route handlers so errors are properly caught.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => {
 *     // async code that might throw
 *   }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
