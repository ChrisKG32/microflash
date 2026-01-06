import { Router, type Router as RouterType, type Request } from 'express';
import { prisma } from '@/lib/prisma.js';
import { createCardSchema } from '@/lib/validation.js';
import { requireAuth, getAuth } from '@/middlewares/auth.js';

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
router.post('/', requireAuth, async (req: Request, res, next) => {
  try {
    // 1. Get Clerk userId from auth middleware
    const { userId: clerkUserId } = getAuth(req);

    // 2. Validate input using Zod schema
    const validationResult = createCardSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'unknown',
            message: issue.message,
          })),
        },
      });
    }

    const { front, back, deckId } = validationResult.data;

    // 3. Look up internal user by Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId! },
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found',
        },
      });
    }

    // 4. Verify deck exists and belongs to user
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Deck not found',
        },
      });
    }

    if (deck.userId !== user.id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to add cards to this deck',
        },
      });
    }

    // 5. Create card with initial FSRS state
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

    // 6. Return created card
    return res.status(201).json({
      card: {
        id: card.id,
        front: card.front,
        back: card.back,
        deckId: card.deckId,
        nextReview: card.nextReviewDate.toISOString(),
        createdAt: card.createdAt.toISOString(),
      },
    });
  } catch (error) {
    // Pass to global error handler
    next(error);
  }
});

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
