/**
 * Sprint Routes
 *
 * Handles sprint lifecycle: start, get, review, complete, abandon.
 */

import { Router, type Router as RouterType } from 'express';
import { requireUser } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { asyncHandler, ApiError } from '@/middlewares/error-handler';
import {
  createSprintSchema,
  submitSprintReviewSchema,
  type CreateSprintInput,
  type SubmitSprintReviewInput,
} from '@/lib/validation';
import {
  startSprint,
  getSprintById,
  submitSprintReview,
  formatSprintResponse,
} from '@/services/sprint-service';

const router: RouterType = Router();

/**
 * POST /api/sprints/start - Start a new sprint or resume existing
 *
 * Resume-first logic:
 * - If user has an active resumable sprint, return it
 * - Otherwise, create a new sprint with eligible cards
 *
 * Request body:
 * - deckId?: string - Optional deck constraint
 * - source?: 'HOME' | 'DECK' | 'PUSH' - Where the sprint originated
 *
 * Response:
 * - sprint: SprintDTO
 * - resumed: boolean
 */
router.post(
  '/start',
  requireUser,
  validate({ body: createSprintSchema }),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { deckId, source } = req.validated!.body as CreateSprintInput;

    try {
      const { sprint, resumed } = await startSprint({
        userId: user.id,
        deckId,
        source,
      });

      res.status(resumed ? 200 : 201).json({
        sprint: formatSprintResponse(sprint),
        resumed,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_ELIGIBLE_CARDS') {
        throw new ApiError(
          404,
          'NO_ELIGIBLE_CARDS',
          'No cards are due for review',
        );
      }
      throw error;
    }
  }),
);

/**
 * GET /api/sprints/:id - Get a sprint by ID
 *
 * Auto-expire behavior:
 * - If sprint is ACTIVE but past resumableUntil, auto-abandon it
 * - If sprint is PENDING, activate it (set startedAt, status=ACTIVE)
 *
 * Response:
 * - sprint: SprintDTO
 */
router.get(
  '/:id',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { id } = req.params;

    try {
      const sprint = await getSprintById(id, user.id);

      res.json({
        sprint: formatSprintResponse(sprint),
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'SPRINT_NOT_FOUND') {
          throw new ApiError(404, 'SPRINT_NOT_FOUND', 'Sprint not found');
        }
        if (error.message === 'SPRINT_NOT_OWNED') {
          throw new ApiError(
            403,
            'FORBIDDEN',
            'You do not have permission to access this sprint',
          );
        }
      }
      throw error;
    }
  }),
);

/**
 * POST /api/sprints/:id/review - Submit a review for a card in a sprint
 *
 * Grades a card within a sprint, updates FSRS state, and extends resumableUntil.
 *
 * Request body:
 * - cardId: string - The card to review
 * - rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY' - The grade
 *
 * Response:
 * - sprint: SprintDTO (updated)
 * - updatedCard: { id, nextReviewDate, state }
 */
router.post(
  '/:id/review',
  requireUser,
  validate({ body: submitSprintReviewSchema }),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { id: sprintId } = req.params;
    const { cardId, rating } = req.validated!.body as SubmitSprintReviewInput;

    try {
      const { sprint, updatedCard } = await submitSprintReview({
        sprintId,
        userId: user.id,
        cardId,
        rating,
      });

      res.json({
        sprint: formatSprintResponse(sprint),
        updatedCard: {
          id: updatedCard.id,
          nextReviewDate: updatedCard.nextReviewDate.toISOString(),
          state: updatedCard.state,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'SPRINT_NOT_FOUND':
            throw new ApiError(404, 'SPRINT_NOT_FOUND', 'Sprint not found');
          case 'SPRINT_NOT_OWNED':
            throw new ApiError(
              403,
              'FORBIDDEN',
              'You do not have permission to access this sprint',
            );
          case 'SPRINT_EXPIRED':
            throw new ApiError(
              409,
              'SPRINT_EXPIRED',
              'Sprint has expired and was auto-abandoned. Please start a new sprint.',
            );
          case 'SPRINT_NOT_ACTIVE':
            throw new ApiError(
              409,
              'SPRINT_NOT_ACTIVE',
              'Sprint is not active. Only active sprints can receive reviews.',
            );
          case 'CARD_NOT_IN_SPRINT':
            throw new ApiError(
              400,
              'CARD_NOT_IN_SPRINT',
              'The specified card is not part of this sprint',
            );
          case 'CARD_ALREADY_REVIEWED':
            throw new ApiError(
              409,
              'CARD_ALREADY_REVIEWED',
              'This card has already been reviewed in this sprint',
            );
        }
      }
      throw error;
    }
  }),
);

export default router;
