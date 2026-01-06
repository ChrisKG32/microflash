import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from './middlewares/auth.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import cardsRouter from './routes/cards.js';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - allow requests from client apps
const corsOptions: cors.CorsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:8081', 'http://localhost:19006'], // Expo dev server ports
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize Clerk authentication on all requests
// Requires CLERK_SECRET_KEY environment variable
app.use(clerkMiddleware());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/cards', cardsRouter);
// TODO: Add remaining routes
// app.use('/api/decks', decksRouter);
// app.use('/api/reviews', reviewsRouter);
// app.use('/api/notifications', notificationsRouter);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
