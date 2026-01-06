import { Router } from 'express';
import { requireDbUser } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/error-handler.js';
import {
  validateBody,
  createCardSchema,
  type CreateCardInput,
} from '../lib/validation.js';
import { prisma } from '../lib/prisma.js';
import { initializeCardState } from '../services/fsrs.js';
import { NotFoundError, AuthorizationError } from '../lib/errors.js';

const router = Router();

/**
 * POST /api/cards
 * Create a new flashcard with FSRS state initialization.
 *
 * Requires authentication.
 * User can only add cards to their own decks.
 *
 * Request body:
 * - front: string (required) - Front content (supports Markdown/LaTeX)
 * - back: string (required) - Back content (supports Markdown/LaTeX)
 * - deckId: string (required) - ID of the deck to add the card to
 *
 * Response: 201 Created
 * - card: Created card object with FSRS state
 */
router.post(
  '/',
  requireDbUser,
  validateBody(createCardSchema),
  asyncHandler(async (req, res) => {
    const { front, back, deckId } = req.body as CreateCardInput;
    const userId = req.userId!;

    // Verify the deck exists and belongs to the user
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      select: { id: true, userId: true },
    });

    if (!deck) {
      throw new NotFoundError('Deck');
    }

    if (deck.userId !== userId) {
      throw new AuthorizationError('You can only add cards to your own decks');
    }

    // Initialize FSRS state for the new card
    const fsrsState = initializeCardState();

    // Create the card with FSRS state
    const card = await prisma.card.create({
      data: {
        front,
        back,
        deckId,
        stability: fsrsState.stability,
        difficulty: fsrsState.difficulty,
        elapsedDays: fsrsState.elapsedDays,
        scheduledDays: fsrsState.scheduledDays,
        reps: fsrsState.reps,
        lapses: fsrsState.lapses,
        state: fsrsState.state,
        lastReview: fsrsState.lastReview,
        nextReviewDate: fsrsState.nextReviewDate,
      },
      select: {
        id: true,
        front: true,
        back: true,
        deckId: true,
        nextReviewDate: true,
        state: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      card: {
        id: card.id,
        front: card.front,
        back: card.back,
        deckId: card.deckId,
        nextReview: card.nextReviewDate.toISOString(),
        state: card.state,
        createdAt: card.createdAt.toISOString(),
      },
    });
  }),
);

export default router;
