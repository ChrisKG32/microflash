import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

// Mock the auth middleware before importing the app
jest.mock('@/middlewares/auth', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) =>
    next(),
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
  requireUser: (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: () => ({ userId: 'test-user' }),
}));

// Mock the error handler to avoid issues with dynamic imports
jest.mock('@/middlewares/error-handler', () => ({
  errorHandler: (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  },
  asyncHandler:
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    },
  ApiError: class ApiError extends Error {
    constructor(
      public statusCode: number,
      public code: string,
      message: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Import after mocks are set up
import { app } from '@/index';

describe('App - Unit Tests', () => {
  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes with consistent error shape', async () => {
      const response = await request(app).get('/api/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Route not found');
    });

    it('should return 404 for unknown POST routes with consistent error shape', async () => {
      const response = await request(app)
        .post('/api/nonexistent')
        .send({ data: 'test' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Route not found');
    });
  });
});
