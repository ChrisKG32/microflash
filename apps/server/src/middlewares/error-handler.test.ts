import request from 'supertest';
import express, { type Express, type Request, type Response } from 'express';
import { z } from 'zod';
import { errorHandler, ApiError } from '@/middlewares/error-handler';

// Helper to create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());

  // Route that throws a Zod validation error
  app.post('/zod-error', (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string({ error: 'Name is required' }),
      age: z.number({ error: 'Age must be a number' }),
    });
    schema.parse(req.body); // Will throw ZodError if invalid
    res.json({ success: true });
  });

  // Route that throws a custom ApiError
  app.get('/api-error', (_req: Request, _res: Response) => {
    throw new ApiError(403, 'FORBIDDEN', 'Access denied');
  });

  // Route that throws a generic error
  app.get('/generic-error', (_req: Request, _res: Response) => {
    throw new Error('Something went wrong');
  });

  // Route that works normally
  app.get('/success', (_req: Request, res: Response) => {
    res.json({ message: 'success' });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

describe('Error Handler Middleware - Unit Tests', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Zod validation errors', () => {
    it('should return 400 with VALIDATION_ERROR code', async () => {
      const response = await request(app)
        .post('/zod-error')
        .send({ name: 123, age: 'not a number' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid request data');
    });

    it('should include field-level details', async () => {
      const response = await request(app).post('/zod-error').send({});

      expect(response.status).toBe(400);
      expect(response.body.error.details).toBeDefined();
      expect(Array.isArray(response.body.error.details)).toBe(true);
      expect(response.body.error.details.length).toBeGreaterThan(0);
      expect(response.body.error.details[0]).toHaveProperty('field');
      expect(response.body.error.details[0]).toHaveProperty('message');
    });
  });

  describe('Custom ApiError', () => {
    it('should return the specified status code', async () => {
      const response = await request(app).get('/api-error');

      expect(response.status).toBe(403);
    });

    it('should return the specified error code and message', async () => {
      const response = await request(app).get('/api-error');

      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('Access denied');
    });
  });

  describe('Generic errors', () => {
    it('should return 500 for unknown errors', async () => {
      const response = await request(app).get('/generic-error');

      expect(response.status).toBe(500);
    });

    it('should not expose internal error details', async () => {
      const response = await request(app).get('/generic-error');

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('An unexpected error occurred');
      // Should not contain the actual error message
      expect(response.body.error.message).not.toContain('Something went wrong');
    });
  });

  describe('Successful requests', () => {
    it('should not interfere with successful responses', async () => {
      const response = await request(app).get('/success');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('success');
    });
  });
});
