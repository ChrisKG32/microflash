import request from 'supertest';
import express from 'express';
import cardsRouter from './cards.js';

// Create a test app with the router
const app = express();
app.use(express.json());
app.use('/api/cards', cardsRouter);

// Add 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

describe('Cards Routes - Unit Tests', () => {
  describe('GET /api/cards', () => {
    it('should return 200 for list cards (stub)', async () => {
      const response = await request(app).get('/api/cards');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/cards', () => {
    it('should return 201 for create card (stub)', async () => {
      const response = await request(app)
        .post('/api/cards')
        .send({ front: 'Question', back: 'Answer', deckId: 'deck-1' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/cards/:id', () => {
    it('should return 200 for get card by id (stub)', async () => {
      const response = await request(app).get('/api/cards/card-123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/cards/:id', () => {
    it('should return 200 for update card (stub)', async () => {
      const response = await request(app)
        .patch('/api/cards/card-123')
        .send({ front: 'Updated question' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/cards/:id', () => {
    it('should return 204 for delete card (stub)', async () => {
      const response = await request(app).delete('/api/cards/card-123');

      expect(response.status).toBe(204);
    });
  });

  describe('GET /api/cards/due', () => {
    // Note: This route is currently shadowed by GET /api/cards/:id
    // Once fixed, this test should pass
    it('should return 200 for due cards (stub)', async () => {
      const response = await request(app).get('/api/cards/due');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });
});
