import { Router, type Router as RouterType } from 'express';
import { prisma } from '@/lib/prisma';
import { createDeckSchema, type CreateDeckInput } from '@/lib/validation';
import { requireUser } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { asyncHandler, ApiError } from '@/middlewares/error-handler';

const router: RouterType = Router();

// GET /api/decks - List all decks for authenticated user
router.get(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    // User is guaranteed to exist by requireUser middleware
    const user = req.user!;

    // Fetch all decks for the user, including subdeck relationships
    const decks = await prisma.deck.findMany({
      where: {
        userId: user.id,
      },
      include: {
        subDecks: true, // Include child decks
        _count: {
          select: {
            cards: true, // Count cards in each deck
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Organize into parent decks with nested subdecks
    const parentDecks = decks.filter((deck) => !deck.parentDeckId);

    const decksWithSubdecks = parentDecks.map((parent) => ({
      id: parent.id,
      title: parent.title,
      description: parent.description,
      cardCount: parent._count.cards,
      createdAt: parent.createdAt,
      updatedAt: parent.updatedAt,
      subdecks: parent.subDecks.map((subdeck) => ({
        id: subdeck.id,
        title: subdeck.title,
        description: subdeck.description,
        cardCount: decks.find((d) => d.id === subdeck.id)?._count.cards || 0,
        createdAt: subdeck.createdAt,
        updatedAt: subdeck.updatedAt,
      })),
    }));

    res.json({
      decks: decksWithSubdecks,
      total: parentDecks.length,
    });
  }),
);

// POST /api/decks - Create a new deck
router.post(
  '/',
  requireUser,
  validate({ body: createDeckSchema }),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { title, description, parentDeckId } = req.validated!
      .body as CreateDeckInput;

    // If parentDeckId is provided, verify it exists and belongs to user
    if (parentDeckId) {
      const parentDeck = await prisma.deck.findUnique({
        where: { id: parentDeckId },
      });

      if (!parentDeck) {
        throw new ApiError(404, 'NOT_FOUND', 'Parent deck not found');
      }

      if (parentDeck.userId !== user.id) {
        throw new ApiError(
          403,
          'FORBIDDEN',
          'You do not have permission to create a subdeck here',
        );
      }

      // Check subdeck depth (max 2 levels)
      if (parentDeck.parentDeckId) {
        throw new ApiError(
          400,
          'INVALID_DEPTH',
          'Subdecks can only be one level deep',
        );
      }
    }

    const deck = await prisma.deck.create({
      data: {
        title: title.trim(),
        description: description?.trim() ?? null,
        userId: user.id,
        parentDeckId: parentDeckId ?? null,
      },
    });

    res.status(201).json({
      deck: {
        id: deck.id,
        title: deck.title,
        description: deck.description,
        parentDeckId: deck.parentDeckId,
        createdAt: deck.createdAt.toISOString(),
        updatedAt: deck.updatedAt.toISOString(),
      },
    });
  }),
);

// GET /api/decks/:id - Get single deck
router.get('/:id', async (req, res) => {
  res.json({
    message: `GET /api/decks/${req.params.id} - Not implemented yet`,
  });
});

// PATCH /api/decks/:id - Update deck
router.patch('/:id', async (req, res) => {
  res.json({
    message: `PATCH /api/decks/${req.params.id} - Not implemented yet`,
  });
});

// DELETE /api/decks/:id - Delete deck
router.delete('/:id', async (_req, res) => {
  res.status(204).send();
});

export default router;
