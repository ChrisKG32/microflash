import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/middlewares/error-handler';

/**
 * DEV_AUTH mode: When enabled, the server accepts a `x-dev-clerk-id` header
 * instead of requiring real Clerk authentication. This allows local development
 * without Clerk configuration.
 *
 * Enable by setting DEV_AUTH=1 in your environment.
 */
const isDevAuthEnabled = process.env.DEV_AUTH === '1';

/**
 * Header name for dev auth mode.
 */
const DEV_AUTH_HEADER = 'x-dev-clerk-id';

/**
 * Get the authenticated user's clerkId from the request.
 *
 * In DEV_AUTH mode: reads from x-dev-clerk-id header
 * In production: reads from Clerk's getAuth()
 */
function getClerkIdFromRequest(req: Request): string | null {
  if (isDevAuthEnabled) {
    const devClerkId = req.headers[DEV_AUTH_HEADER];
    if (typeof devClerkId === 'string' && devClerkId.length > 0) {
      return devClerkId;
    }
    return null;
  }

  // Production mode: use Clerk
  // Dynamic import to avoid requiring Clerk in dev mode
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAuth } = require('@clerk/express');
  const auth = getAuth(req);
  return auth?.userId ?? null;
}

/**
 * Returns the Clerk middleware for production use.
 * In DEV_AUTH mode, returns a no-op middleware.
 */
export function clerkMiddleware(): RequestHandler {
  if (isDevAuthEnabled) {
    // No-op middleware in dev mode
    return (_req: Request, _res: Response, next: NextFunction) => {
      next();
    };
  }

  // Production mode: use real Clerk middleware
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const clerk = require('@clerk/express');
  return clerk.clerkMiddleware();
}

/**
 * Middleware that requires authentication.
 * Calls next(ApiError) if user is not authenticated, letting the global
 * error handler return a consistent 401 JSON response.
 *
 * In DEV_AUTH mode: requires x-dev-clerk-id header
 * In production: requires valid Clerk session
 *
 * Usage:
 *   router.get('/protected', requireAuth, (req, res) => {
 *     // User is authenticated
 *   });
 */
export const requireAuth: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const clerkId = getClerkIdFromRequest(req);

  if (!clerkId) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  next();
};

/**
 * Middleware that requires authentication AND loads the Prisma user.
 * Attaches the user object to `req.user` for use in route handlers.
 *
 * In DEV_AUTH mode:
 * - Reads clerkId from x-dev-clerk-id header
 * - Auto-creates (upserts) the user if they don't exist
 *
 * In production:
 * - Reads clerkId from Clerk session
 * - Returns 401 if user doesn't exist in database
 *
 * Usage:
 *   router.post('/', requireUser, asyncHandler(async (req, res) => {
 *     const user = req.user!; // User is guaranteed to exist
 *     // ...
 *   }));
 */
export const requireUser: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const clerkId = getClerkIdFromRequest(req);

    if (!clerkId) {
      next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }

    let user;

    if (isDevAuthEnabled) {
      // In dev mode, upsert the user (create if doesn't exist)
      user = await prisma.user.upsert({
        where: { clerkId },
        update: {}, // No updates needed, just ensure it exists
        create: {
          clerkId,
          notificationsEnabled: true,
        },
      });
    } else {
      // In production, user must already exist
      user = await prisma.user.findUnique({
        where: { clerkId },
      });

      if (!user) {
        next(new ApiError(401, 'UNAUTHORIZED', 'User not found'));
        return;
      }
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
