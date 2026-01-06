import { Router, type Router as RouterType } from 'express';
import { prisma } from '@/lib/prisma.js';
import { requireAuth, getAuth } from '@/middlewares/auth.js';

const router: RouterType = Router();

// GET /api/decks - List all decks for authenticated user
router.get('/', requireAuth, async (req, res) => {
  try {
    // Get Clerk userId from auth middleware
    const { userId: clerkUserId } = getAuth(req);

    // Look up internal user by Clerk ID
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
  } catch (error) {
    console.error('Error fetching decks:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch decks',
      },
    });
  }
});

// POST /api/decks - Create a new deck
router.post('/', async (_req, res) => {
  res.status(201).json({ message: 'POST /api/decks - Not implemented yet' });
});

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
