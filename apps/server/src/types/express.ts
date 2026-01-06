import type { User } from '@/generated/prisma';

/**
 * Extend Express Request interface to include:
 * - user: Prisma User object (attached by requireUser middleware)
 * - validated: Validated request data (attached by validate middleware)
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * The authenticated Prisma user.
       * Populated by the `requireUser` middleware after verifying Clerk auth
       * and loading the user from the database.
       */
      user?: User;

      /**
       * Validated request data from Zod schemas.
       * Populated by the `validate` middleware.
       */
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
