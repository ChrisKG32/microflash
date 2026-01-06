import express, { type Express } from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@/middlewares/auth';
import { errorHandler } from '@/middlewares/error-handler';
import { startScheduler, stopScheduler } from '@/services/scheduler';

// Import routes
import decksRouter from '@/routes/decks';
import cardsRouter from '@/routes/cards';
import reviewsRouter from '@/routes/reviews';
import notificationsRouter from '@/routes/notifications';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Clerk authentication middleware - attaches auth state to all requests
// Individual routes can use requireAuth or getAuth to check authentication
app.use(clerkMiddleware());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/decks', decksRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/notifications', notificationsRouter);

// 404 handler - returns consistent error shape
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Global error handler - must be last middleware
app.use(errorHandler);

// Only start server if this file is run directly (not imported for testing)
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Start the notification scheduler after server is listening
    startScheduler();
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('Shutting down gracefully...');
    stopScheduler();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Export for testing
export { app };
