import { Router } from 'express';

const router = Router();

// GET /api/decks - List all decks for authenticated user
router.get('/', async (req, res) => {
  res.json({ message: 'GET /api/decks - Not implemented yet' });
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
