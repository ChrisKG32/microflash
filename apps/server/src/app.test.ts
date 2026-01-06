import { jest } from '@jest/globals';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

// Mock the auth middleware before importing the app
jest.unstable_mockModule('@/middlewares/auth.js', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) =>
    next(),
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: () => ({ userId: 'test-user' }),
}));

// Dynamic import after mock is set up
const { app } = await import('./index.js');

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
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Route not found' });
    });

    it('should return 404 for unknown POST routes', async () => {
      const response = await request(app)
        .post('/api/nonexistent')
        .send({ data: 'test' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Route not found' });
    });
  });
});
