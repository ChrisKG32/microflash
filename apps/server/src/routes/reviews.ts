import { Router, type Router as RouterType } from 'express';

const router: RouterType = Router();

// POST /api/reviews - Submit a card review
router.post('/', async (req, res) => {
  res.status(201).json({ message: 'POST /api/reviews - Not implemented yet' });
});

// GET /api/reviews - Get review history
router.get('/', async (req, res) => {
  res.json({ message: 'GET /api/reviews - Not implemented yet' });
});

// GET /api/reviews/card/:cardId - Get reviews for specific card
router.get('/card/:cardId', async (req, res) => {
  res.json({
    message: `GET /api/reviews/card/${req.params.cardId} - Not implemented yet`,
  });
});

export default router;
