import type {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from 'express';
import { ApiError, type ErrorResponse } from '../lib/errors.js';

/**
 * Global error handling middleware.
 * Catches all errors and returns consistent JSON responses.
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Log the error for debugging (in production, use a proper logger)
  console.error('[Error]', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle known API errors
  if (err instanceof ApiError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as Error & { code?: string };

    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      const response: ErrorResponse = {
        error: {
          code: 'CONFLICT',
          message: 'A record with this value already exists',
        },
      };
      res.status(409).json(response);
      return;
    }

    // Record not found
    if (prismaError.code === 'P2025') {
      const response: ErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
        },
      };
      res.status(404).json(response);
      return;
    }
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && 'body' in err) {
    const response: ErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid JSON in request body',
      },
    };
    res.status(400).json(response);
    return;
  }

  // Default to 500 Internal Server Error for unknown errors
  // Don't expose internal error details to the client
  const response: ErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'An unexpected error occurred',
    },
  };
  res.status(500).json(response);
};

/**
 * Wrapper for async route handlers to catch errors.
 * Eliminates the need for try-catch in every route.
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler for unmatched routes.
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const response: ErrorResponse = {
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  };
  res.status(404).json(response);
};
