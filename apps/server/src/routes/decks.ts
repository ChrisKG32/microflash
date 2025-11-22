import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/decks - List all decks for authenticated user
router.get('/', async (req, res) => {
  try {
    // TODO: Get userId from authentication middleware
    // For now, we'll use a hardcoded test user from seed data
    const userId = 'cmhvc9rh100002gq791i0fsqd'; // Placeholder - will be replaced with req.auth.userId

    // Fetch all decks for the user, including subdeck relationships
    const decks = await prisma.deck.findMany({
      where: {
        userId: userId,
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
router.post('/', async (req, res) => {
  res.status(201).json({ message: 'POST /api/decks - Not implemented yet' });
});

// GET /api/decks/:id - Get single deck
router.get('/:id', async (req, res) => {
  res.json({ message: `GET /api/decks/${req.params.id} - Not implemented yet` });
});

// PATCH /api/decks/:id - Update deck
router.patch('/:id', async (req, res) => {
  res.json({ message: `PATCH /api/decks/${req.params.id} - Not implemented yet` });
});

// DELETE /api/decks/:id - Delete deck
router.delete('/:id', async (req, res) => {
  res.status(204).send();
});

export default router;
