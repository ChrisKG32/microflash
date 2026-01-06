import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaClient, Prisma } from '@/generated/prisma/index.js';
import DeckGetPayload = Prisma.DeckGetPayload;

// Create a mock prisma client
const prismaMock = mockDeep<PrismaClient>();

// Mock the prisma module before importing the router
jest.unstable_mockModule('@/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

// Dynamic import after mock is set up
const { default: decksRouter } = await import('@/routes/decks.js');

// Create a test app with the router
const app = express();
app.use(express.json());
app.use('/api/decks', decksRouter);

// Add 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

describe('Decks Routes - Unit Tests', () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  describe('GET /api/decks', () => {
    it('should return decks for the authenticated user', async () => {
      const mockDecks = [
        {
          id: 'deck-1',
          title: 'JavaScript Basics',
          description: 'Learn JS fundamentals',
          userId: 'cmhvc9rh100002gq791i0fsqd',
          parentDeckId: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          subDecks: [],
          _count: { cards: 10 },
        },
      ] as DeckGetPayload<{
        include: { subDecks: true; _count: { select: { cards: true } } };
      }>[];

      // Cast needed because mockResolvedValue expects Deck[], but findMany with
      // include returns DeckWithRelations[] at runtime
      prismaMock.deck.findMany.mockResolvedValue(mockDecks);

      const response = await request(app).get('/api/decks');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('decks');
      expect(response.body).toHaveProperty('total');
      expect(prismaMock.deck.findMany).toHaveBeenCalled();
    });

    it('should return empty array when user has no decks', async () => {
      prismaMock.deck.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/decks');

      expect(response.status).toBe(200);
      expect(response.body.decks).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.deck.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/decks');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/decks', () => {
    it('should return 201 for create deck (stub)', async () => {
      const response = await request(app)
        .post('/api/decks')
        .send({ title: 'New Deck' });

      expect(response.status).toBe(201);
    });
  });

  describe('GET /api/decks/:id', () => {
    it('should return deck by id (stub)', async () => {
      const response = await request(app).get('/api/decks/deck-123');

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/decks/:id', () => {
    it('should return 204 for delete deck (stub)', async () => {
      const response = await request(app).delete('/api/decks/deck-123');

      expect(response.status).toBe(204);
    });
  });
});
