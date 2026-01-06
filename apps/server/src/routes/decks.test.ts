import request from 'supertest';
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaClient, Prisma } from '@/generated/prisma';
import DeckGetPayload = Prisma.DeckGetPayload;

// Create a mock prisma client
const prismaMock = mockDeep<PrismaClient>();

// Mock user to attach to req.user
const mockUser = {
  id: 'user-internal-id',
  clerkId: 'clerk-user-123',
  pushToken: null,
  notificationsEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock the prisma module
jest.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

// Mock the auth middleware - requireUser attaches req.user
let shouldAttachUser = true;
jest.mock('@/middlewares/auth', () => ({
  requireUser: (req: Request, res: Response, next: NextFunction) => {
    if (shouldAttachUser) {
      req.user = mockUser;
      next();
    } else {
      // Simulate user not found
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found',
        },
      });
    }
  },
}));

// Import after mocks are set up
import decksRouter from '@/routes/decks';
import { errorHandler } from '@/middlewares/error-handler';

// Helper to create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/decks', decksRouter);

  // Global error handler
  app.use(errorHandler);

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
    shouldAttachUser = true;
  });

  describe('GET /api/decks', () => {
    it('should return 401 when user not found in database', async () => {
      shouldAttachUser = false;

      const response = await request(app).get('/api/decks');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('User not found');
    });

    it('should return decks for the authenticated user', async () => {
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
