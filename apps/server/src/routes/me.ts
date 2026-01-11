import { Router, type Router as RouterType } from 'express';
import { requireUser } from '@/middlewares/auth';
import { asyncHandler } from '@/middlewares/error-handler';

const router: RouterType = Router();

/**
 * GET /api/me - Get current authenticated user
 *
 * Returns the current user's basic info. Useful for:
 * - Verifying auth is working
 * - Getting the internal user ID
 */
router.get(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;

    res.json({
      user: {
        id: user.id,
        clerkId: user.clerkId,
        notificationsEnabled: user.notificationsEnabled,
        hasPushToken: !!user.pushToken,
        onboardingComplete: user.onboardingComplete,
        notificationsPromptedAt:
          user.notificationsPromptedAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      },
    });
  }),
);

export default router;
