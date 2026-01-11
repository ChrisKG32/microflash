/**
 * Home Routes
 *
 * Provides the home screen summary endpoint.
 */

import { Router, type Router as RouterType } from 'express';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/middlewares/auth';
import { asyncHandler } from '@/middlewares/error-handler';
import {
  findResumableSprint,
  calculateProgress,
} from '@/services/sprint-service';
import { getUserPushEligibility } from '@/services/notification-eligibility';

const router: RouterType = Router();

/**
 * GET /api/home/summary - Get home screen summary
 *
 * Returns:
 * - dueCount: Total cards due for review
 * - overdueCount: Cards overdue by more than 24 hours
 * - resumableSprint: Active resumable sprint info (if any)
 * - nextEligiblePushTime: When user is next eligible for push (null until E4.1)
 * - notificationsEnabled: Whether notifications are enabled
 * - hasPushToken: Whether user has a valid push token
 */
router.get(
  '/summary',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count due cards (not snoozed, exclude onboarding fixture)
    const dueCount = await prisma.card.count({
      where: {
        deck: { userId: user.id, isOnboardingFixture: false },
        nextReviewDate: { lte: now },
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
      },
    });

    // Count overdue cards (due more than 24 hours ago, exclude onboarding fixture)
    const overdueCount = await prisma.card.count({
      where: {
        deck: { userId: user.id, isOnboardingFixture: false },
        nextReviewDate: { lte: twentyFourHoursAgo },
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
      },
    });

    // Check for resumable sprint
    const resumableSprint = await findResumableSprint(user.id);

    // Format resumable sprint for response
    let resumableSprintDTO = null;
    if (resumableSprint) {
      const progress = calculateProgress(resumableSprint.sprintCards);
      resumableSprintDTO = {
        id: resumableSprint.id,
        resumableUntil: resumableSprint.resumableUntil?.toISOString() ?? null,
        progress,
        deckTitle: resumableSprint.deck?.title ?? null,
      };
    }

    // Compute next eligible push time using eligibility engine
    const eligibility = await getUserPushEligibility(user, now);
    const nextEligiblePushTime =
      eligibility.nextEligibleAt?.toISOString() ?? null;

    res.json({
      summary: {
        dueCount,
        overdueCount,
        resumableSprint: resumableSprintDTO,
        nextEligiblePushTime,
        notificationsEnabled: user.notificationsEnabled,
        hasPushToken: !!user.pushToken,
      },
    });
  }),
);

export default router;
