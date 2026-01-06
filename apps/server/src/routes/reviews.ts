import { Router, type Router as RouterType } from 'express';
import { prisma } from '@/lib/prisma';
import { createReviewSchema, type CreateReviewInput } from '@/lib/validation';
import { requireUser } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { asyncHandler, ApiError } from '@/middlewares/error-handler';
import {
  calculateNextReview,
  type FSRSState,
  type RatingType,
} from '@/services/fsrs';

const router: RouterType = Router();

/**
 * POST /api/reviews - Submit a card review
 *
 * Accepts a cardId and rating, calculates the new FSRS state,
 * creates a review record, and updates the card.
 */
router.post(
  '/',
  requireUser,
  validate({ body: createReviewSchema }),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { cardId, rating } = req.validated!.body as CreateReviewInput;
    const reviewTime = new Date();

    // Fetch the card to review
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { deck: true },
    });

    if (!card) {
      throw new ApiError(404, 'NOT_FOUND', 'Card not found');
    }

    // Verify user owns the card (through deck ownership)
    if (card.deck.userId !== user.id) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to review this card',
      );
    }

    // Build current FSRS state from card
    const currentState: FSRSState = {
      stability: card.stability,
      difficulty: card.difficulty,
      elapsedDays: card.elapsedDays,
      scheduledDays: card.scheduledDays,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      lastReview: card.lastReview,
    };

    // Calculate new FSRS state based on rating
    const { state: newState, nextReviewDate } = calculateNextReview(
      currentState,
      rating as RatingType,
      reviewTime,
    );

    // Use a transaction to ensure atomicity
    const [review, updatedCard] = await prisma.$transaction([
      // Create review record
      prisma.review.create({
        data: {
          cardId,
          userId: user.id,
          rating: rating,
        },
      }),
      // Update card with new FSRS state
      prisma.card.update({
        where: { id: cardId },
        data: {
          stability: newState.stability,
          difficulty: newState.difficulty,
          elapsedDays: newState.elapsedDays,
          scheduledDays: newState.scheduledDays,
          reps: newState.reps,
          lapses: newState.lapses,
          state: newState.state,
          lastReview: newState.lastReview,
          nextReviewDate,
          // Reset notification flag since card was just reviewed
          lastNotificationSent: null,
        },
      }),
    ]);

    // Return the review and updated card
    res.status(201).json({
      review: {
        id: review.id,
        cardId: review.cardId,
        rating: review.rating,
        createdAt: review.createdAt.toISOString(),
      },
      card: {
        id: updatedCard.id,
        front: updatedCard.front,
        back: updatedCard.back,
        deckId: updatedCard.deckId,
        // FSRS state
        state: updatedCard.state,
        stability: updatedCard.stability,
        difficulty: updatedCard.difficulty,
        reps: updatedCard.reps,
        lapses: updatedCard.lapses,
        // Scheduling
        nextReview: updatedCard.nextReviewDate.toISOString(),
        lastReview: updatedCard.lastReview?.toISOString() ?? null,
      },
    });
  }),
);

// GET /api/reviews - Get review history
router.get(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;

    const reviews = await prisma.review.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to last 100 reviews
      include: {
        card: {
          select: {
            id: true,
            front: true,
            back: true,
          },
        },
      },
    });

    res.json({
      reviews: reviews.map((review) => ({
        id: review.id,
        cardId: review.cardId,
        rating: review.rating,
        createdAt: review.createdAt.toISOString(),
        card: {
          id: review.card.id,
          front: review.card.front,
          back: review.card.back,
        },
      })),
    });
  }),
);

// GET /api/reviews/card/:cardId - Get reviews for specific card
router.get(
  '/card/:cardId',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { cardId } = req.params;

    // Verify card exists and user owns it
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { deck: true },
    });

    if (!card) {
      throw new ApiError(404, 'NOT_FOUND', 'Card not found');
    }

    if (card.deck.userId !== user.id) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to view reviews for this card',
      );
    }

    const reviews = await prisma.review.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      reviews: reviews.map((review) => ({
        id: review.id,
        cardId: review.cardId,
        rating: review.rating,
        createdAt: review.createdAt.toISOString(),
      })),
    });
  }),
);

export default router;
