import { Router, type Router as RouterType } from 'express';

const router: RouterType = Router();

// POST /api/notifications/register - Register push token
router.post('/register', async (req, res) => {
  res.json({
    message: 'POST /api/notifications/register - Not implemented yet',
  });
});

// POST /api/cards/:id/snooze - Snooze a card
router.post('/:id/snooze', async (req, res) => {
  res.json({
    message: `POST /api/cards/${req.params.id}/snooze - Not implemented yet`,
  });
});

// PATCH /api/notifications/preferences - Update notification preferences
router.patch('/preferences', async (req, res) => {
  res.json({
    message: 'PATCH /api/notifications/preferences - Not implemented yet',
  });
});

export default router;
