import express from 'express';
import cors from 'cors';

// Import routes
import decksRouter from '@/routes/decks.js';
import cardsRouter from '@/routes/cards.js';
import reviewsRouter from '@/routes/reviews.js';
import notificationsRouter from '@/routes/notifications.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/decks', decksRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/notifications', notificationsRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Only start server if this file is run directly (not imported for testing)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for testing
export { app };
