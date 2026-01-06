import { clerkMiddleware, getAuth, type AuthObject } from '@clerk/express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/middlewares/error-handler';

// Re-export clerkMiddleware for use in index.ts
export { clerkMiddleware, getAuth };

// Re-export AuthObject type for use in route handlers
export type { AuthObject };

/**
 * Middleware that requires authentication.
 * Calls next(ApiError) if user is not authenticated, letting the global
 * error handler return a consistent 401 JSON response.
 *
 * Unlike Clerk's built-in requireAuth() which redirects to a sign-in page,
 * this middleware is designed for API routes and returns JSON errors.
 *
 * Usage:
 *   router.get('/protected', requireAuth, (req, res) => {
 *     const { userId } = getAuth(req);
 *     // ...
 *   });
 */
export const requireAuth: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const auth = getAuth(req);

  if (!auth.userId) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  next();
};

/**
 * Middleware that requires authentication AND loads the Prisma user.
 * Attaches the user object to `req.user` for use in route handlers.
 *
 * This middleware:
 * 1. Verifies Clerk authentication (via getAuth)
 * 2. Loads the internal Prisma user by clerkId
 * 3. Attaches the user to req.user
 *
 * On failure, calls next(ApiError) to let the global error handler respond.
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
    const auth = getAuth(req);

    if (!auth.userId) {
      next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: auth.userId },
    });

    if (!user) {
      next(new ApiError(401, 'UNAUTHORIZED', 'User not found'));
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
