/**
 * Onboarding Routes
 *
 * Handles onboarding flow endpoints:
 * - Mark notifications prompted
 * - Create fixture sprint
 * - Complete onboarding
 */

import { Router, type Router as RouterType } from 'express';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/middlewares/auth';
import { asyncHandler, ApiError } from '@/middlewares/error-handler';
import { ensureOnboardingFixture } from '@/services/onboarding-fixture';
import {
  formatSprintResponse,
  type SprintWithCards,
} from '@/services/sprint-service';

const router: RouterType = Router();

/**
 * POST /api/onboarding/notifications-prompted
 *
 * Mark that the user was prompted for notifications.
 * Called after showing the OS permission prompt (regardless of allow/deny).
 */
router.post(
  '/notifications-prompted',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;

    await prisma.user.update({
      where: { id: user.id },
      data: { notificationsPromptedAt: new Date() },
    });

    res.json({ success: true });
  }),
);

/**
 * POST /api/onboarding/fixture-sprint
 *
 * Create a sprint using the onboarding fixture deck.
 * Ensures the fixture exists, then creates a sprint with all 3 cards.
 *
 * Response:
 * - sprint: SprintDTO
 */
router.post(
  '/fixture-sprint',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;

    // Ensure fixture exists
    const fixtureDeckId = await ensureOnboardingFixture(user.id);

    // Get all cards from the fixture deck
    const fixtureCards = await prisma.card.findMany({
      where: { deckId: fixtureDeckId },
      include: {
        deck: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (fixtureCards.length === 0) {
      throw new ApiError(
        500,
        'FIXTURE_EMPTY',
        'Onboarding fixture has no cards',
      );
    }

    // Create sprint with all fixture cards
    const sprint = await prisma.sprint.create({
      data: {
        userId: user.id,
        deckId: fixtureDeckId,
        status: 'PENDING',
        source: 'HOME',
        sprintCards: {
          create: fixtureCards.map((card, index) => ({
            cardId: card.id,
            order: index + 1,
          })),
        },
      },
      include: {
        deck: { select: { id: true, title: true } },
        sprintCards: {
          orderBy: { order: 'asc' },
          include: {
            card: {
              include: {
                deck: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      sprint: formatSprintResponse(sprint as SprintWithCards),
    });
  }),
);

/**
 * POST /api/onboarding/complete
 *
 * Mark onboarding as complete and delete the fixture deck.
 *
 * Requirements:
 * - User must have at least one non-fixture deck
 * - Notifications must have been prompted
 *
 * Actions:
 * - Set onboardingComplete = true
 * - Delete fixture deck + cards
 */
router.post(
  '/complete',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;

    // Verify user has at least one non-fixture deck
    const userDeckCount = await prisma.deck.count({
      where: {
        userId: user.id,
        isOnboardingFixture: false,
      },
    });

    if (userDeckCount === 0) {
      throw new ApiError(
        400,
        'NO_USER_DECK',
        'You must create at least one deck before completing onboarding',
      );
    }

    // Verify notifications were prompted
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { notificationsPromptedAt: true },
    });

    if (!currentUser?.notificationsPromptedAt) {
      throw new ApiError(
        400,
        'NOTIFICATIONS_NOT_PROMPTED',
        'Notifications prompt must be shown before completing onboarding',
      );
    }

    // Complete onboarding and delete fixture in a transaction
    await prisma.$transaction(async (tx) => {
      // Mark onboarding complete
      await tx.user.update({
        where: { id: user.id },
        data: { onboardingComplete: true },
      });

      // Delete fixture deck (cascade deletes cards)
      await tx.deck.deleteMany({
        where: {
          userId: user.id,
          isOnboardingFixture: true,
        },
      });
    });

    res.json({ success: true });
  }),
);

export default router;
