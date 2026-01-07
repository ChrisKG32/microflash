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
    it('should return 401 when user not found', async () => {
      shouldAttachUser = false;

      const response = await request(app)
        .post('/api/decks')
        .send({ title: 'New Deck' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 when title is missing', async () => {
      const response = await request(app).post('/api/decks').send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when title is empty', async () => {
      const response = await request(app)
        .post('/api/decks')
        .send({ title: '' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when unknown fields are provided', async () => {
      const response = await request(app)
        .post('/api/decks')
        .send({ title: 'New Deck', unknownField: 'value' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 201 with created deck when valid', async () => {
      const now = new Date();

      prismaMock.deck.create.mockResolvedValue({
        id: 'deck-new-123',
        title: 'New Deck',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = await request(app)
        .post('/api/decks')
        .send({ title: 'New Deck' });

      expect(response.status).toBe(201);
      expect(response.body.deck).toHaveProperty('id', 'deck-new-123');
      expect(response.body.deck).toHaveProperty('title', 'New Deck');
      expect(prismaMock.deck.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'New Deck',
          userId: 'user-internal-id',
        }),
      });
    });

    it('should create deck with description', async () => {
      const now = new Date();

      prismaMock.deck.create.mockResolvedValue({
        id: 'deck-new-123',
        title: 'New Deck',
        description: 'A test deck',
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = await request(app)
        .post('/api/decks')
        .send({ title: 'New Deck', description: 'A test deck' });

      expect(response.status).toBe(201);
      expect(response.body.deck).toHaveProperty('description', 'A test deck');
    });

    it('should trim whitespace from title', async () => {
      const now = new Date();

      prismaMock.deck.create.mockResolvedValue({
        id: 'deck-new-123',
        title: 'New Deck',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = await request(app)
        .post('/api/decks')
        .send({ title: '  New Deck  ' });

      expect(response.status).toBe(201);
      expect(prismaMock.deck.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'New Deck',
        }),
      });
    });

    it('should return 404 when parent deck not found', async () => {
      prismaMock.deck.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/decks')
        .send({ title: 'Subdeck', parentDeckId: 'nonexistent' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when parent deck belongs to different user', async () => {
      const now = new Date();

      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'parent-deck',
        title: 'Parent',
        description: null,
        userId: 'different-user-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = await request(app)
        .post('/api/decks')
        .send({ title: 'Subdeck', parentDeckId: 'parent-deck' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 when trying to create subdeck more than 2 levels deep', async () => {
      const now = new Date();

      // Parent deck already has a parent (is a subdeck)
      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'subdeck',
        title: 'Subdeck',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: 'grandparent-deck', // Already a subdeck
        createdAt: now,
        updatedAt: now,
      });

      const response = await request(app)
        .post('/api/decks')
        .send({ title: 'Sub-subdeck', parentDeckId: 'subdeck' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_DEPTH');
    });
  });

  describe('GET /api/decks/:id', () => {
    it('should return 401 when user not found', async () => {
      shouldAttachUser = false;

      const response = await request(app).get('/api/decks/deck-123');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 404 when deck not found', async () => {
      prismaMock.deck.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/decks/deck-123');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when deck belongs to different user', async () => {
      const now = new Date();

      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-123',
        title: 'Test Deck',
        description: null,
        userId: 'different-user-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
        subDecks: [],
        _count: { cards: 5 },
      } as never);

      const response = await request(app).get('/api/decks/deck-123');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return deck with subdecks and card counts', async () => {
      const now = new Date();

      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-123',
        title: 'Test Deck',
        description: 'A test deck',
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
        subDecks: [
          {
            id: 'subdeck-1',
            title: 'Subdeck 1',
            description: null,
            createdAt: now,
            updatedAt: now,
            _count: { cards: 3 },
          },
        ],
        _count: { cards: 10 },
      } as never);

      const response = await request(app).get('/api/decks/deck-123');

      expect(response.status).toBe(200);
      expect(response.body.deck).toHaveProperty('id', 'deck-123');
      expect(response.body.deck).toHaveProperty('title', 'Test Deck');
      expect(response.body.deck).toHaveProperty('cardCount', 10);
      expect(response.body.deck.subdecks).toHaveLength(1);
      expect(response.body.deck.subdecks[0]).toHaveProperty('cardCount', 3);
    });
  });

  describe('PATCH /api/decks/:id', () => {
    it('should return 401 when user not found', async () => {
      shouldAttachUser = false;

      const response = await request(app)
        .patch('/api/decks/deck-123')
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 404 when deck not found', async () => {
      prismaMock.deck.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/decks/deck-123')
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when deck belongs to different user', async () => {
      const now = new Date();

      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-123',
        title: 'Test Deck',
        description: null,
        userId: 'different-user-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
        subDecks: [],
      } as never);

      const response = await request(app)
        .patch('/api/decks/deck-123')
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should update deck title successfully', async () => {
      const now = new Date();

      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-123',
        title: 'Old Title',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
        subDecks: [],
      } as never);

      prismaMock.deck.update.mockResolvedValue({
        id: 'deck-123',
        title: 'Updated Title',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
        subDecks: [],
        _count: { cards: 5 },
      } as never);

      const response = await request(app)
        .patch('/api/decks/deck-123')
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
      expect(response.body.deck).toHaveProperty('title', 'Updated Title');
    });

    it('should return 400 when trying to set deck as its own parent', async () => {
      const now = new Date();

      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-123',
        title: 'Test Deck',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
        subDecks: [],
      } as never);

      const response = await request(app)
        .patch('/api/decks/deck-123')
        .send({ parentDeckId: 'deck-123' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PARENT');
    });

    it('should return 400 when moving deck with subdecks to become a subdeck', async () => {
      const now = new Date();

      // First call: get the deck being updated (has subdecks)
      prismaMock.deck.findUnique.mockResolvedValueOnce({
        id: 'deck-123',
        title: 'Test Deck',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
        subDecks: [{ id: 'subdeck-1' }],
      } as never);

      // Second call: get the new parent deck
      prismaMock.deck.findUnique.mockResolvedValueOnce({
        id: 'parent-deck',
        title: 'Parent',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = await request(app)
        .patch('/api/decks/deck-123')
        .send({ parentDeckId: 'parent-deck' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_DEPTH');
    });

    it('should return 400 when new parent is already a subdeck (max depth = 2)', async () => {
      const now = new Date();

      // First call: get the deck being updated
      prismaMock.deck.findUnique.mockResolvedValueOnce({
        id: 'deck-123',
        title: 'Test Deck',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
        subDecks: [],
      } as never);

      // Second call: get the new parent deck (which is already a subdeck)
      prismaMock.deck.findUnique.mockResolvedValueOnce({
        id: 'subdeck-parent',
        title: 'Subdeck Parent',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: 'grandparent-deck',
        createdAt: now,
        updatedAt: now,
      });

      const response = await request(app)
        .patch('/api/decks/deck-123')
        .send({ parentDeckId: 'subdeck-parent' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_DEPTH');
    });

    it('should allow setting parentDeckId to null (making it a root deck)', async () => {
      const now = new Date();

      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-123',
        title: 'Test Deck',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: 'old-parent',
        createdAt: now,
        updatedAt: now,
        subDecks: [],
      } as never);

      prismaMock.deck.update.mockResolvedValue({
        id: 'deck-123',
        title: 'Test Deck',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
        subDecks: [],
        _count: { cards: 5 },
      } as never);

      const response = await request(app)
        .patch('/api/decks/deck-123')
        .send({ parentDeckId: null });

      expect(response.status).toBe(200);
      expect(response.body.deck).toHaveProperty('parentDeckId', null);
    });
  });

  describe('DELETE /api/decks/:id', () => {
    it('should return 401 when user not found', async () => {
      shouldAttachUser = false;

      const response = await request(app).delete('/api/decks/deck-123');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 404 when deck not found', async () => {
      prismaMock.deck.findUnique.mockResolvedValue(null);

      const response = await request(app).delete('/api/decks/deck-123');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when deck belongs to different user', async () => {
      const now = new Date();

      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-123',
        title: 'Test Deck',
        description: null,
        userId: 'different-user-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = await request(app).delete('/api/decks/deck-123');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should delete deck and return 204', async () => {
      const now = new Date();

      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-123',
        title: 'Test Deck',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
      });

      prismaMock.deck.delete.mockResolvedValue({
        id: 'deck-123',
        title: 'Test Deck',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = await request(app).delete('/api/decks/deck-123');

      expect(response.status).toBe(204);
      expect(prismaMock.deck.delete).toHaveBeenCalledWith({
        where: { id: 'deck-123' },
      });
    });
  });
});
