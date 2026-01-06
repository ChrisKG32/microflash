import { Router, type Router as RouterType } from 'express';

const router: RouterType = Router();

// GET /api/cards - List cards (filterable by deckId)
router.get('/', async (req, res) => {
  res.json({ message: 'GET /api/cards - Not implemented yet' });
});

// POST /api/cards - Create a new card
router.post('/', async (req, res) => {
  res.status(201).json({ message: 'POST /api/cards - Not implemented yet' });
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
router.delete('/:id', async (req, res) => {
  res.status(204).send();
});

// GET /api/cards/due - Get cards due for review
router.get('/due', async (req, res) => {
  res.json({ message: 'GET /api/cards/due - Not implemented yet' });
});

export default router;
