import { Router, type Router as RouterType } from 'express';
import { prisma } from '@/lib/prisma';
import { createCardSchema, type CreateCardInput } from '@/lib/validation';
import { requireUser } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { asyncHandler, ApiError } from '@/middlewares/error-handler';

const router: RouterType = Router();

/**
 * Calculate initial nextReviewDate for a new card.
 * New cards are immediately due for their first review.
 */
function calculateInitialNextReviewDate(): Date {
  return new Date();
}

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

    // Create card with initial FSRS state
    // FSRS fields use Prisma schema defaults (stability=0, difficulty=0, etc.)
    // We only need to set nextReviewDate explicitly
    const card = await prisma.card.create({
      data: {
        front: front.trim(),
        back: back.trim(),
        deckId,
        nextReviewDate: calculateInitialNextReviewDate(),
      },
    });

    // Return created card
    res.status(201).json({
      card: {
        id: card.id,
        front: card.front,
        back: card.back,
        deckId: card.deckId,
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
