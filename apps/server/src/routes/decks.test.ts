import { jest } from '@jest/globals';
import request from 'supertest';
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaClient, Prisma } from '@/generated/prisma/index.js';
import DeckGetPayload = Prisma.DeckGetPayload;

// Create a mock prisma client
const prismaMock = mockDeep<PrismaClient>();

// Mock getAuth to return a specific userId
const mockGetAuth = jest.fn();

// Mock the prisma module before importing the router
jest.unstable_mockModule('@/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

// Mock the auth middleware
jest.unstable_mockModule('@/middlewares/auth.js', () => ({
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: mockGetAuth,
}));

// Dynamic import after mock is set up
const { default: decksRouter } = await import('@/routes/decks.js');

// Helper to create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/decks', decksRouter);

  // Add 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  return app;
}

const app = createTestApp();

describe('Decks Routes - Unit Tests', () => {
  beforeEach(() => {
    mockReset(prismaMock);
    mockGetAuth.mockReset();
    // Default: authenticated user
    mockGetAuth.mockReturnValue({ userId: 'clerk-user-123' });
  });

  describe('GET /api/decks', () => {
    it('should return 401 when user not found in database', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/decks');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('User not found');
    });

    it('should return decks for the authenticated user', async () => {
      const now = new Date();

      // Mock user lookup
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-internal-id',
        clerkId: 'clerk-user-123',
        pushToken: null,
        notificationsEnabled: true,
        createdAt: now,
        updatedAt: now,
      });

      const mockDecks = [
        {
          id: 'deck-1',
          title: 'JavaScript Basics',
          description: 'Learn JS fundamentals',
          userId: 'user-internal-id',
          parentDeckId: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          subDecks: [],
          _count: { cards: 10 },
        },
      ] as DeckGetPayload<{
        include: { subDecks: true; _count: { select: { cards: true } } };
      }>[];

      prismaMock.deck.findMany.mockResolvedValue(mockDecks);

      const response = await request(app).get('/api/decks');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('decks');
      expect(response.body).toHaveProperty('total');
      expect(prismaMock.deck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-internal-id' },
        }),
      );
    });

    it('should return empty array when user has no decks', async () => {
      const now = new Date();

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-internal-id',
        clerkId: 'clerk-user-123',
        pushToken: null,
        notificationsEnabled: true,
        createdAt: now,
        updatedAt: now,
      });
      prismaMock.deck.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/decks');

      expect(response.status).toBe(200);
      expect(response.body.decks).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      const now = new Date();

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-internal-id',
        clerkId: 'clerk-user-123',
        pushToken: null,
        notificationsEnabled: true,
        createdAt: now,
        updatedAt: now,
      });
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
