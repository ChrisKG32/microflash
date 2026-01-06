import { Router, type Router as RouterType } from 'express';
import { prisma } from '@/lib/prisma';
import { createCardSchema, type CreateCardInput } from '@/lib/validation';
import { requireUser } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { asyncHandler, ApiError } from '@/middlewares/error-handler';
import { initializeFSRS, calculateInitialReviewDate } from '@/services/fsrs';

const router: RouterType = Router();

// GET /api/cards - List cards (filterable by deckId)
router.get('/', async (_req, res) => {
  res.json({ message: 'GET /api/cards - Not implemented yet' });
});

// POST /api/cards - Create a new card
router.post(
  '/',
  requireUser,
  validate({ body: createCardSchema }),
  asyncHandler(async (req, res) => {
    // User is guaranteed to exist by requireUser middleware
    const user = req.user!;

    // Body is validated and typed by validate middleware
    const { front, back, deckId } = req.validated!.body as CreateCardInput;

    // Verify deck exists and belongs to user
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      throw new ApiError(404, 'NOT_FOUND', 'Deck not found');
    }

    if (deck.userId !== user.id) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to add cards to this deck',
      );
    }

    // Initialize FSRS state for the new card
    const fsrsState = initializeFSRS();
    const nextReviewDate = calculateInitialReviewDate();

    // Create card with initial FSRS state
    const card = await prisma.card.create({
      data: {
        front: front.trim(),
        back: back.trim(),
        deckId,
        // FSRS state fields
        stability: fsrsState.stability,
        difficulty: fsrsState.difficulty,
        elapsedDays: fsrsState.elapsedDays,
        scheduledDays: fsrsState.scheduledDays,
        reps: fsrsState.reps,
        lapses: fsrsState.lapses,
        state: fsrsState.state,
        lastReview: fsrsState.lastReview,
        nextReviewDate,
      },
    });

    // Return created card with FSRS state
    res.status(201).json({
      card: {
        id: card.id,
        front: card.front,
        back: card.back,
        deckId: card.deckId,
        // FSRS state
        state: card.state,
        stability: card.stability,
        difficulty: card.difficulty,
        reps: card.reps,
        lapses: card.lapses,
        // Scheduling
        nextReview: card.nextReviewDate.toISOString(),
        createdAt: card.createdAt.toISOString(),
      },
    });
  }),
);

// GET /api/cards/:id - Get single card
router.get('/:id', async (req, res) => {
  res.json({
    message: `GET /api/cards/${req.params.id} - Not implemented yet`,
  });
});

// PATCH /api/cards/:id - Update card
router.patch('/:id', async (req, res) => {
  res.json({
    message: `PATCH /api/cards/${req.params.id} - Not implemented yet`,
  });
});

// DELETE /api/cards/:id - Delete card
router.delete('/:id', async (_req, res) => {
  res.status(204).send();
});

// GET /api/cards/due - Get cards due for review
router.get('/due', async (_req, res) => {
  res.json({ message: 'GET /api/cards/due - Not implemented yet' });
});

export default router;
