import request from 'supertest';
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaClient } from '@/generated/prisma';

// Create a mock prisma client
const prismaMock = mockDeep<PrismaClient>();

// Mock getAuth to return a specific userId
const mockGetAuth = jest.fn();

// Mock the prisma module
jest.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

// Mock the auth middleware
jest.mock('@/middlewares/auth', () => ({
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: mockGetAuth,
}));

// Import after mocks are set up
import cardsRouter from '@/routes/cards';

// Helper to create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());

  app.use('/api/cards', cardsRouter);

  // Add error handler for tests
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  // Add 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  return app;
}

const app = createTestApp();

describe('Cards Routes - Unit Tests', () => {
  beforeEach(() => {
    mockReset(prismaMock);
    mockGetAuth.mockReset();
    // Default: authenticated user
    mockGetAuth.mockReturnValue({ userId: 'clerk-user-123' });
  });

  describe('GET /api/cards', () => {
    it('should return 200 for list cards (stub)', async () => {
      const response = await request(app).get('/api/cards');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/cards', () => {
    it('should return 400 when front is missing', async () => {
      const response = await request(app)
        .post('/api/cards')
        .send({ back: 'Answer', deckId: 'deck-1' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'front' }),
      );
    });

    it('should return 400 when back is missing', async () => {
      const response = await request(app)
        .post('/api/cards')
        .send({ front: 'Question', deckId: 'deck-1' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'back' }),
      );
    });

    it('should return 400 when deckId is missing', async () => {
      const response = await request(app)
        .post('/api/cards')
        .send({ front: 'Question', back: 'Answer' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'deckId' }),
      );
    });

    it('should return 401 when user not found in database', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/cards')
        .send({ front: 'Question', back: 'Answer', deckId: 'deck-1' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('User not found');
    });

    it('should return 404 when deck not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-internal-id',
        clerkId: 'clerk-user-123',
        pushToken: null,
        notificationsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.deck.findUnique.mockResolvedValue(null);

      const response = await request(app).post('/api/cards').send({
        front: 'Question',
        back: 'Answer',
        deckId: 'nonexistent-deck',
      });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when user does not own the deck', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-internal-id',
        clerkId: 'clerk-user-123',
        pushToken: null,
        notificationsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-1',
        title: 'Test Deck',
        description: null,
        userId: 'different-user-id', // Different user owns this deck
        parentDeckId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/cards')
        .send({ front: 'Question', back: 'Answer', deckId: 'deck-1' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 201 with created card when valid', async () => {
      const now = new Date();

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-internal-id',
        clerkId: 'clerk-user-123',
        pushToken: null,
        notificationsEnabled: true,
        createdAt: now,
        updatedAt: now,
      });
      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-1',
        title: 'Test Deck',
        description: null,
        userId: 'user-internal-id', // Same user owns this deck
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
      });
      prismaMock.card.create.mockResolvedValue({
        id: 'card-new-123',
        front: 'Question',
        back: 'Answer',
        deckId: 'deck-1',
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        state: 'NEW',
        lastReview: null,
        nextReviewDate: now,
        lastNotificationSent: null,
        snoozedUntil: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = await request(app)
        .post('/api/cards')
        .send({ front: 'Question', back: 'Answer', deckId: 'deck-1' });

      expect(response.status).toBe(201);
      expect(response.body.card).toHaveProperty('id', 'card-new-123');
      expect(response.body.card).toHaveProperty('front', 'Question');
      expect(response.body.card).toHaveProperty('back', 'Answer');
      expect(response.body.card).toHaveProperty('deckId', 'deck-1');
      expect(response.body.card).toHaveProperty('nextReview');
      expect(response.body.card).toHaveProperty('createdAt');
      expect(prismaMock.card.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          front: 'Question',
          back: 'Answer',
          deckId: 'deck-1',
        }),
      });
    });

    it('should trim whitespace from front and back', async () => {
      const now = new Date();

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-internal-id',
        clerkId: 'clerk-user-123',
        pushToken: null,
        notificationsEnabled: true,
        createdAt: now,
        updatedAt: now,
      });
      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-1',
        title: 'Test Deck',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
      });
      prismaMock.card.create.mockResolvedValue({
        id: 'card-new-123',
        front: 'Question',
        back: 'Answer',
        deckId: 'deck-1',
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        state: 'NEW',
        lastReview: null,
        nextReviewDate: now,
        lastNotificationSent: null,
        snoozedUntil: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = await request(app)
        .post('/api/cards')
        .send({ front: '  Question  ', back: '  Answer  ', deckId: 'deck-1' });

      expect(response.status).toBe(201);
      expect(prismaMock.card.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          front: 'Question',
          back: 'Answer',
        }),
      });
    });

    it('should return 500 on database error', async () => {
      const now = new Date();

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-internal-id',
        clerkId: 'clerk-user-123',
        pushToken: null,
        notificationsEnabled: true,
        createdAt: now,
        updatedAt: now,
      });
      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-1',
        title: 'Test Deck',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
      });
      prismaMock.card.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/cards')
        .send({ front: 'Question', back: 'Answer', deckId: 'deck-1' });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
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
