import { clerkMiddleware, getAuth, requireAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

/**
 * Extend Express Request type to include userId
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      clerkUserId?: string;
    }
  }
}

/**
 * Base Clerk middleware - initializes Clerk auth on all requests.
 * This should be applied globally before any routes.
 *
 * Requires CLERK_SECRET_KEY environment variable to be set.
 */
export { clerkMiddleware };

/**
 * Clerk's built-in requireAuth middleware.
 * Use this for simple authentication checks without database user lookup.
 */
export { requireAuth };

/**
 * Custom middleware that requires authentication and attaches user info to request.
 * - Validates Clerk JWT token from Authorization header
 * - Extracts Clerk user ID and attaches as `req.clerkUserId`
 * - Looks up or creates user in database and attaches internal ID as `req.userId`
 *
 * Use this when you need the internal database user ID.
 *
 * @example
 * router.get('/api/decks', requireDbUser, async (req, res) => {
 *   const userId = req.userId; // Internal database user ID
 *   // ...
 * });
 */
export async function requireDbUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(req);

    if (!auth.userId) {
      throw new AuthenticationError('Authentication required');
    }

    // Attach Clerk user ID
    req.clerkUserId = auth.userId;

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { clerkId: auth.userId },
      select: { id: true },
    });

    if (!user) {
      // Auto-create user on first authenticated request
      user = await prisma.user.create({
        data: { clerkId: auth.userId },
        select: { id: true },
      });
    }

    req.userId = user.id;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      // Log unexpected errors but return generic auth error to client
      console.error('[Auth Error]', error);
      next(new AuthenticationError('Authentication failed'));
    }
  }
}

/**
 * Optional authentication middleware.
 * Attaches user info if authenticated, but allows unauthenticated requests.
 *
 * @example
 * router.get('/api/public', optionalAuth, async (req, res) => {
 *   if (req.userId) {
 *     // User is authenticated
 *   } else {
 *     // Anonymous user
 *   }
 * });
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(req);

    if (auth.userId) {
      req.clerkUserId = auth.userId;

      const user = await prisma.user.findUnique({
        where: { clerkId: auth.userId },
        select: { id: true },
      });

      if (user) {
        req.userId = user.id;
      }
    }

    next();
  } catch (error) {
    // For optional auth, log but don't fail the request
    console.error('[Optional Auth Error]', error);
    next();
  }
}
