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
import meRouter from '@/routes/me';
import sprintsRouter from '@/routes/sprints';
import homeRouter from '@/routes/home';
import onboardingRouter from '@/routes/onboarding';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Log auth mode on startup
if (process.env.DEV_AUTH === '1') {
  console.log(
    '🔓 DEV_AUTH mode enabled - using x-dev-clerk-id header for auth',
  );
}

// Middleware
app.use(cors());
app.use(express.json());

// Clerk authentication middleware - attaches auth state to all requests
// In DEV_AUTH mode, this is a no-op middleware
// Individual routes can use requireAuth or requireUser to check authentication
app.use(clerkMiddleware());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/me', meRouter);
app.use('/api/decks', decksRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/sprints', sprintsRouter);
app.use('/api/home', homeRouter);
app.use('/api/onboarding', onboardingRouter);

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
