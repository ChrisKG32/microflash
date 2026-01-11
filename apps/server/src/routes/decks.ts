import { Router, type Router as RouterType } from 'express';
import { prisma } from '@/lib/prisma';
import {
  createDeckSchema,
  type CreateDeckInput,
  updateDeckSchema,
  type UpdateDeckInput,
} from '@/lib/validation';
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
    // Exclude onboarding fixture decks
    const decks = await prisma.deck.findMany({
      where: {
        userId: user.id,
        isOnboardingFixture: false,
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
      priority: parent.priority,
      cardCount: parent._count.cards,
      createdAt: parent.createdAt,
      updatedAt: parent.updatedAt,
      subdecks: parent.subDecks.map((subdeck) => ({
        id: subdeck.id,
        title: subdeck.title,
        description: subdeck.description,
        priority: subdeck.priority,
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
    const { title, description, parentDeckId, priority } = req.validated!
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
        ...(priority !== undefined && { priority }),
      },
    });

    res.status(201).json({
      deck: {
        id: deck.id,
        title: deck.title,
        description: deck.description,
        priority: deck.priority,
        parentDeckId: deck.parentDeckId,
        createdAt: deck.createdAt.toISOString(),
        updatedAt: deck.updatedAt.toISOString(),
      },
    });
  }),
);

// GET /api/decks/:id - Get single deck
router.get(
  '/:id',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { id } = req.params;

    // Fetch deck with subdecks and card counts
    const deck = await prisma.deck.findUnique({
      where: { id },
      include: {
        subDecks: {
          include: {
            _count: {
              select: { cards: true },
            },
          },
        },
        _count: {
          select: { cards: true },
        },
      },
    });

    if (!deck) {
      throw new ApiError(404, 'NOT_FOUND', 'Deck not found');
    }

    // Enforce ownership
    if (deck.userId !== user.id) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to view this deck',
      );
    }

    res.json({
      deck: {
        id: deck.id,
        title: deck.title,
        description: deck.description,
        priority: deck.priority,
        parentDeckId: deck.parentDeckId,
        cardCount: deck._count.cards,
        createdAt: deck.createdAt.toISOString(),
        updatedAt: deck.updatedAt.toISOString(),
        subdecks: deck.subDecks.map((subdeck) => ({
          id: subdeck.id,
          title: subdeck.title,
          description: subdeck.description,
          priority: subdeck.priority,
          cardCount: subdeck._count.cards,
          createdAt: subdeck.createdAt.toISOString(),
          updatedAt: subdeck.updatedAt.toISOString(),
        })),
      },
    });
  }),
);

// PATCH /api/decks/:id - Update deck
router.patch(
  '/:id',
  requireUser,
  validate({ body: updateDeckSchema }),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { id } = req.params;
    const updates = req.validated!.body as UpdateDeckInput;

    // Fetch the deck to verify ownership
    const deck = await prisma.deck.findUnique({
      where: { id },
      include: {
        subDecks: true,
      },
    });

    if (!deck) {
      throw new ApiError(404, 'NOT_FOUND', 'Deck not found');
    }

    // Enforce ownership
    if (deck.userId !== user.id) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to update this deck',
      );
    }

    // Handle parentDeckId change with depth validation
    if (updates.parentDeckId !== undefined) {
      // If setting to null, that's always allowed (making it a root deck)
      if (updates.parentDeckId !== null) {
        // Verify new parent exists and belongs to user
        const newParent = await prisma.deck.findUnique({
          where: { id: updates.parentDeckId },
        });

        if (!newParent) {
          throw new ApiError(404, 'NOT_FOUND', 'Parent deck not found');
        }

        if (newParent.userId !== user.id) {
          throw new ApiError(
            403,
            'FORBIDDEN',
            'You do not have permission to move deck to this parent',
          );
        }

        // Check if new parent is already a subdeck (max depth = 2)
        if (newParent.parentDeckId) {
          throw new ApiError(
            400,
            'INVALID_DEPTH',
            'Cannot move deck: maximum deck depth is 2 levels',
          );
        }

        // Check if this deck has subdecks (can't become a subdeck if it has children)
        if (deck.subDecks.length > 0) {
          throw new ApiError(
            400,
            'INVALID_DEPTH',
            'Cannot move deck with subdecks: maximum deck depth is 2 levels',
          );
        }

        // Prevent setting parent to self
        if (updates.parentDeckId === id) {
          throw new ApiError(
            400,
            'INVALID_PARENT',
            'A deck cannot be its own parent',
          );
        }
      }
    }

    // Build update data
    const updateData: {
      title?: string;
      description?: string | null;
      parentDeckId?: string | null;
      priority?: number;
    } = {};

    if (updates.title !== undefined) {
      updateData.title = updates.title.trim();
    }
    if (updates.description !== undefined) {
      updateData.description =
        updates.description === null ? null : updates.description.trim();
    }
    if (updates.parentDeckId !== undefined) {
      updateData.parentDeckId = updates.parentDeckId;
    }
    if (updates.priority !== undefined) {
      updateData.priority = updates.priority;
    }

    // Update the deck
    const updatedDeck = await prisma.deck.update({
      where: { id },
      data: updateData,
      include: {
        subDecks: {
          include: {
            _count: {
              select: { cards: true },
            },
          },
        },
        _count: {
          select: { cards: true },
        },
      },
    });

    res.json({
      deck: {
        id: updatedDeck.id,
        title: updatedDeck.title,
        description: updatedDeck.description,
        priority: updatedDeck.priority,
        parentDeckId: updatedDeck.parentDeckId,
        cardCount: updatedDeck._count.cards,
        createdAt: updatedDeck.createdAt.toISOString(),
        updatedAt: updatedDeck.updatedAt.toISOString(),
        subdecks: updatedDeck.subDecks.map((subdeck) => ({
          id: subdeck.id,
          title: subdeck.title,
          description: subdeck.description,
          priority: subdeck.priority,
          cardCount: subdeck._count.cards,
          createdAt: subdeck.createdAt.toISOString(),
          updatedAt: subdeck.updatedAt.toISOString(),
        })),
      },
    });
  }),
);

// DELETE /api/decks/:id - Delete deck
// Note: Prisma onDelete: Cascade handles deleting cards and subdecks automatically
router.delete(
  '/:id',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { id } = req.params;

    // Fetch the deck to verify ownership
    const deck = await prisma.deck.findUnique({
      where: { id },
    });

    if (!deck) {
      throw new ApiError(404, 'NOT_FOUND', 'Deck not found');
    }

    // Enforce ownership
    if (deck.userId !== user.id) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to delete this deck',
      );
    }

    // Delete the deck (cards and subdecks cascade automatically via Prisma)
    await prisma.deck.delete({
      where: { id },
    });

    res.status(204).send();
  }),
);

export default router;
