import request from 'supertest';
import express, { type Express, type Request, type Response } from 'express';
import { z } from 'zod';
import { validate } from '@/middlewares/validate';
import { errorHandler } from '@/middlewares/error-handler';

// Test schemas
const bodySchema = z
  .object({
    name: z.string({ error: 'Name is required' }),
    age: z.number({ error: 'Age must be a number' }),
  })
  .strict();

const querySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

const paramsSchema = z.object({
  id: z.string().min(1, { error: 'ID is required' }),
});

// Helper to create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());

  // Route with body validation
  app.post(
    '/body',
    validate({ body: bodySchema }),
    (req: Request, res: Response) => {
      res.json({ validated: req.validated?.body });
    },
  );

  // Route with query validation
  app.get(
    '/query',
    validate({ query: querySchema }),
    (req: Request, res: Response) => {
      res.json({ validated: req.validated?.query });
    },
  );

  // Route with params validation
  app.get(
    '/params/:id',
    validate({ params: paramsSchema }),
    (req: Request, res: Response) => {
      res.json({ validated: req.validated?.params });
    },
  );

  // Route with multiple validations
  app.post(
    '/multi/:id',
    validate({ body: bodySchema, params: paramsSchema, query: querySchema }),
    (req: Request, res: Response) => {
      res.json({
        body: req.validated?.body,
        params: req.validated?.params,
        query: req.validated?.query,
      });
    },
  );

  // Route without validation
  app.get('/no-validation', (_req: Request, res: Response) => {
    res.json({ message: 'success' });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

describe('Validate Middleware - Unit Tests', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Body validation', () => {
    it('should return 400 when body is invalid', async () => {
      const response = await request(app)
        .post('/body')
        .send({ name: 123, age: 'not a number' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid request data');
      expect(response.body.error.details).toBeDefined();
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app).post('/body').send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });

    it('should return 400 when unknown fields are provided (strict schema)', async () => {
      const response = await request(app)
        .post('/body')
        .send({ name: 'John', age: 30, unknownField: 'should be rejected' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should attach validated body to req.validated.body', async () => {
      const response = await request(app)
        .post('/body')
        .send({ name: 'John', age: 30 });

      expect(response.status).toBe(200);
      expect(response.body.validated).toEqual({ name: 'John', age: 30 });
    });
  });

  describe('Query validation', () => {
    it('should attach validated query to req.validated.query', async () => {
      const response = await request(app).get('/query?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.validated).toEqual({ page: 1, limit: 10 });
    });

    it('should coerce query string values to numbers', async () => {
      const response = await request(app).get('/query?page=5');

      expect(response.status).toBe(200);
      expect(response.body.validated.page).toBe(5);
      expect(typeof response.body.validated.page).toBe('number');
    });

    it('should handle missing optional query params', async () => {
      const response = await request(app).get('/query');

      expect(response.status).toBe(200);
      expect(response.body.validated).toEqual({});
    });
  });

  describe('Params validation', () => {
    it('should attach validated params to req.validated.params', async () => {
      const response = await request(app).get('/params/123');

      expect(response.status).toBe(200);
      expect(response.body.validated).toEqual({ id: '123' });
    });
  });

  describe('Multiple validations', () => {
    it('should validate body, params, and query together', async () => {
      const response = await request(app)
        .post('/multi/abc?page=2')
        .send({ name: 'Jane', age: 25 });

      expect(response.status).toBe(200);
      expect(response.body.body).toEqual({ name: 'Jane', age: 25 });
      expect(response.body.params).toEqual({ id: 'abc' });
      expect(response.body.query).toEqual({ page: 2 });
    });

    it('should return 400 if any validation fails', async () => {
      const response = await request(app)
        .post('/multi/abc?page=2')
        .send({ name: 123, age: 'invalid' }); // Invalid body

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('No validation', () => {
    it('should not interfere with routes without validation', async () => {
      const response = await request(app).get('/no-validation');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('success');
    });
  });

  describe('Error format', () => {
    it('should include field-level details in error response', async () => {
      const response = await request(app).post('/body').send({});

      expect(response.status).toBe(400);
      expect(Array.isArray(response.body.error.details)).toBe(true);
      expect(response.body.error.details[0]).toHaveProperty('field');
      expect(response.body.error.details[0]).toHaveProperty('message');
    });

    it('should handle unrecognized_keys errors from strict schemas', async () => {
      const response = await request(app)
        .post('/body')
        .send({ name: 'John', age: 30, extra: 'field' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      // The error details should indicate the unknown field
      expect(response.body.error.details).toBeDefined();
    });
  });
});
