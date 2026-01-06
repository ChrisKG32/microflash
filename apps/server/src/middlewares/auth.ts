import { clerkMiddleware, getAuth, type AuthObject } from '@clerk/express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Re-export clerkMiddleware for use in index.ts
export { clerkMiddleware, getAuth };

// Re-export AuthObject type for use in route handlers
export type { AuthObject };

/**
 * Middleware that requires authentication.
 * Returns 401 JSON response if user is not authenticated.
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
  res: Response,
  next: NextFunction,
) => {
  const auth = getAuth(req);

  if (!auth.userId) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  next();
};
