import request from 'supertest';
import express from 'express';
import reviewsRouter from '@/routes/reviews';

// Create a test app with the router
const app = express();
app.use(express.json());
app.use('/api/reviews', reviewsRouter);

// Add 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

describe('Reviews Routes - Unit Tests', () => {
  describe('POST /api/reviews', () => {
    it('should return 201 for submit review (stub)', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .send({ cardId: 'card-1', rating: 'GOOD' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/reviews', () => {
    it('should return 200 for review history (stub)', async () => {
      const response = await request(app).get('/api/reviews');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/reviews/card/:cardId', () => {
    it('should return 200 for card reviews (stub)', async () => {
      const response = await request(app).get('/api/reviews/card/card-123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });
});
