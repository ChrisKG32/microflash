import { Router, type Router as RouterType } from 'express';
import { prisma } from '@/lib/prisma';
import {
  createCardSchema,
  type CreateCardInput,
  updateCardSchema,
  type UpdateCardInput,
  cardIdsSchema,
  type CardIdsInput,
} from '@/lib/validation';
import { requireUser } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { asyncHandler, ApiError } from '@/middlewares/error-handler';
import { initializeFSRS, calculateInitialReviewDate } from '@/services/fsrs';

const router: RouterType = Router();

// GET /api/cards/due - Get cards due for review
// IMPORTANT: This route MUST be defined before /:id to avoid being shadowed
router.get(
  '/due',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;

    // Find all cards due for review (nextReviewDate <= now)
    // that belong to the authenticated user (via deck ownership)
    const now = new Date();

    const dueCards = await prisma.card.findMany({
      where: {
        nextReviewDate: { lte: now },
        deck: {
          userId: user.id,
        },
      },
      include: {
        deck: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        nextReviewDate: 'asc',
      },
    });

    res.json({
      cards: dueCards.map((card) => ({
        id: card.id,
        front: card.front,
        back: card.back,
        deckId: card.deckId,
        deckTitle: card.deck.title,
        state: card.state,
        nextReview: card.nextReviewDate.toISOString(),
        lastReview: card.lastReview?.toISOString() ?? null,
        reps: card.reps,
        lapses: card.lapses,
      })),
      total: dueCards.length,
    });
  }),
);

// POST /api/cards/by-ids - Get specific cards by their IDs
// Used by notification deep links to fetch exact cards for a review session
router.post(
  '/by-ids',
  requireUser,
  validate({ body: cardIdsSchema }),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { cardIds } = req.validated!.body as CardIdsInput;

    // Fetch cards that belong to the user (via deck ownership)
    const cards = await prisma.card.findMany({
      where: {
        id: { in: cardIds },
        deck: {
          userId: user.id,
        },
      },
      include: {
        deck: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Return cards in the same order as requested cardIds
    const cardMap = new Map(cards.map((card) => [card.id, card]));
    const orderedCards = cardIds
      .map((id) => cardMap.get(id))
      .filter((card): card is NonNullable<typeof card> => card !== undefined);

    res.json({
      cards: orderedCards.map((card) => ({
        id: card.id,
        front: card.front,
        back: card.back,
        deckId: card.deckId,
        deckTitle: card.deck.title,
        state: card.state,
        nextReview: card.nextReviewDate.toISOString(),
        lastReview: card.lastReview?.toISOString() ?? null,
        reps: card.reps,
        lapses: card.lapses,
      })),
      total: orderedCards.length,
      // Include which requested IDs were not found (for debugging)
      notFound: cardIds.filter((id) => !cardMap.has(id)),
    });
  }),
);

// GET /api/cards - List cards (filterable by deckId)
router.get(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { deckId } = req.query;

    // Build where clause
    const where: {
      deck: { userId: string };
      deckId?: string;
    } = {
      deck: { userId: user.id },
    };

    if (typeof deckId === 'string' && deckId.length > 0) {
      where.deckId = deckId;
    }

    const cards = await prisma.card.findMany({
      where,
      include: {
        deck: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      cards: cards.map((card) => ({
        id: card.id,
        front: card.front,
        back: card.back,
        deckId: card.deckId,
        deckTitle: card.deck.title,
        state: card.state,
        nextReview: card.nextReviewDate.toISOString(),
        lastReview: card.lastReview?.toISOString() ?? null,
        reps: card.reps,
        lapses: card.lapses,
        createdAt: card.createdAt.toISOString(),
      })),
      total: cards.length,
    });
  }),
);

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
router.get(
  '/:id',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { id } = req.params;

    // Fetch card with deck info for ownership check
    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        deck: {
          select: {
            id: true,
            title: true,
            userId: true,
          },
        },
      },
    });

    if (!card) {
      throw new ApiError(404, 'NOT_FOUND', 'Card not found');
    }

    // Enforce ownership via deck
    if (card.deck.userId !== user.id) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to view this card',
      );
    }

    res.json({
      card: {
        id: card.id,
        front: card.front,
        back: card.back,
        deckId: card.deckId,
        deckTitle: card.deck.title,
        // FSRS state
        state: card.state,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsedDays,
        scheduledDays: card.scheduledDays,
        reps: card.reps,
        lapses: card.lapses,
        // Scheduling
        nextReview: card.nextReviewDate.toISOString(),
        lastReview: card.lastReview?.toISOString() ?? null,
        // Timestamps
        createdAt: card.createdAt.toISOString(),
        updatedAt: card.updatedAt.toISOString(),
      },
    });
  }),
);

// PATCH /api/cards/:id - Update card
router.patch(
  '/:id',
  requireUser,
  validate({ body: updateCardSchema }),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { id } = req.params;
    const updates = req.validated!.body as UpdateCardInput;

    // Fetch card with deck info for ownership check
    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        deck: {
          select: {
            id: true,
            title: true,
            userId: true,
          },
        },
      },
    });

    if (!card) {
      throw new ApiError(404, 'NOT_FOUND', 'Card not found');
    }

    // Enforce ownership via deck
    if (card.deck.userId !== user.id) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to update this card',
      );
    }

    // If moving to a different deck, verify ownership of the new deck
    let newDeckTitle = card.deck.title;
    if (updates.deckId !== undefined && updates.deckId !== card.deckId) {
      const newDeck = await prisma.deck.findUnique({
        where: { id: updates.deckId },
      });

      if (!newDeck) {
        throw new ApiError(404, 'NOT_FOUND', 'Target deck not found');
      }

      if (newDeck.userId !== user.id) {
        throw new ApiError(
          403,
          'FORBIDDEN',
          'You do not have permission to move card to this deck',
        );
      }

      newDeckTitle = newDeck.title;
    }

    // Build update data
    const updateData: {
      front?: string;
      back?: string;
      deckId?: string;
    } = {};

    if (updates.front !== undefined) {
      updateData.front = updates.front.trim();
    }
    if (updates.back !== undefined) {
      updateData.back = updates.back.trim();
    }
    if (updates.deckId !== undefined) {
      updateData.deckId = updates.deckId;
    }

    // Update the card
    const updatedCard = await prisma.card.update({
      where: { id },
      data: updateData,
      include: {
        deck: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.json({
      card: {
        id: updatedCard.id,
        front: updatedCard.front,
        back: updatedCard.back,
        deckId: updatedCard.deckId,
        deckTitle: updatedCard.deck.title,
        // FSRS state
        state: updatedCard.state,
        stability: updatedCard.stability,
        difficulty: updatedCard.difficulty,
        elapsedDays: updatedCard.elapsedDays,
        scheduledDays: updatedCard.scheduledDays,
        reps: updatedCard.reps,
        lapses: updatedCard.lapses,
        // Scheduling
        nextReview: updatedCard.nextReviewDate.toISOString(),
        lastReview: updatedCard.lastReview?.toISOString() ?? null,
        // Timestamps
        createdAt: updatedCard.createdAt.toISOString(),
        updatedAt: updatedCard.updatedAt.toISOString(),
      },
    });
  }),
);

// DELETE /api/cards/:id - Delete card
router.delete(
  '/:id',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { id } = req.params;

    // Fetch card with deck info for ownership check
    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        deck: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!card) {
      throw new ApiError(404, 'NOT_FOUND', 'Card not found');
    }

    // Enforce ownership via deck
    if (card.deck.userId !== user.id) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to delete this card',
      );
    }

    // Delete the card
    await prisma.card.delete({
      where: { id },
    });

    res.status(204).send();
  }),
);

export default router;
