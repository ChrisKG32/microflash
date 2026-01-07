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

// Mock user to attach to req.user
const mockUser = {
  id: 'user-internal-id',
  clerkId: 'clerk-user-123',
  pushToken: null,
  notificationsEnabled: true,
  onboardingComplete: false,
  notificationsPromptedAt: null,
  quietHoursStart: null,
  quietHoursEnd: null,
  maxNotificationsPerDay: 10,
  notificationCooldownMinutes: 120,
  backlogThreshold: 5,
  timezone: 'UTC',
  lastPushSentAt: null,
  notificationsCountToday: 0,
  notificationsCountThisWeek: 0,
  sprintSize: 5,
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
import cardsRouter from '@/routes/cards';
import { errorHandler } from '@/middlewares/error-handler';

// Helper to create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());

  app.use('/api/cards', cardsRouter);

  // Global error handler
  app.use(errorHandler);

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
    shouldAttachUser = true;
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

    it('should return 400 when unknown fields are provided (strict schema)', async () => {
      const response = await request(app).post('/api/cards').send({
        front: 'Question',
        back: 'Answer',
        deckId: 'deck-1',
        unknownField: 'should be rejected',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 when user not found in database', async () => {
      shouldAttachUser = false;

      const response = await request(app)
        .post('/api/cards')
        .send({ front: 'Question', back: 'Answer', deckId: 'deck-1' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('User not found');
    });

    it('should return 404 when deck not found', async () => {
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
      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-1',
        title: 'Test Deck',
        description: null,
        priority: 'MEDIUM',
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

      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-1',
        title: 'Test Deck',
        description: null,
        priority: 'MEDIUM',
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
        priority: 'MEDIUM',
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

      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-1',
        title: 'Test Deck',
        description: null,
        priority: 'MEDIUM',
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
        priority: 'MEDIUM',
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

      prismaMock.deck.findUnique.mockResolvedValue({
        id: 'deck-1',
        title: 'Test Deck',
        description: null,
        priority: 'MEDIUM',
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
    it('should return 401 when user not found', async () => {
      shouldAttachUser = false;

      const response = await request(app).get('/api/cards/due');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return due cards for authenticated user', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago

      prismaMock.card.findMany.mockResolvedValue([
        {
          id: 'card-1',
          front: 'Question 1',
          back: 'Answer 1',
          deckId: 'deck-1',
          stability: 1.0,
          difficulty: 5.0,
          elapsedDays: 0,
          scheduledDays: 1,
          reps: 1,
          lapses: 0,
          state: 'LEARNING',
          lastReview: pastDate,
          nextReviewDate: pastDate, // Due in the past
          lastNotificationSent: null,
          snoozedUntil: null,
          createdAt: now,
          updatedAt: now,
          deck: {
            id: 'deck-1',
            title: 'Test Deck',
          },
        },
      ] as never);

      const response = await request(app).get('/api/cards/due');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cards');
      expect(response.body).toHaveProperty('total');
      expect(response.body.cards).toHaveLength(1);
      expect(response.body.cards[0]).toHaveProperty('id', 'card-1');
      expect(response.body.cards[0]).toHaveProperty('front', 'Question 1');
      expect(response.body.cards[0]).toHaveProperty('deckTitle', 'Test Deck');
      expect(prismaMock.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            nextReviewDate: expect.any(Object),
            deck: { userId: 'user-internal-id' },
          }),
        }),
      );
    });

    it('should return empty array when no cards are due', async () => {
      prismaMock.card.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/cards/due');

      expect(response.status).toBe(200);
      expect(response.body.cards).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should NOT be shadowed by GET /api/cards/:id route', async () => {
      // This test verifies the route ordering fix
      // /due should be matched before /:id
      prismaMock.card.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/cards/due');

      // Should NOT return a "Not implemented yet" message
      expect(response.body).not.toHaveProperty('message');
      // Should return the proper due cards response shape
      expect(response.body).toHaveProperty('cards');
      expect(response.body).toHaveProperty('total');
    });
  });

  describe('GET /api/cards', () => {
    it('should return 401 when user not found', async () => {
      shouldAttachUser = false;

      const response = await request(app).get('/api/cards');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return all cards for authenticated user', async () => {
      const now = new Date();

      prismaMock.card.findMany.mockResolvedValue([
        {
          id: 'card-1',
          front: 'Question 1',
          back: 'Answer 1',
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
          deck: {
            id: 'deck-1',
            title: 'Test Deck',
          },
        },
      ] as never);

      const response = await request(app).get('/api/cards');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cards');
      expect(response.body).toHaveProperty('total');
      expect(response.body.cards).toHaveLength(1);
    });

    it('should filter cards by deckId when provided', async () => {
      prismaMock.card.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/cards?deckId=deck-123');

      expect(response.status).toBe(200);
      expect(prismaMock.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deckId: 'deck-123',
          }),
        }),
      );
    });
  });
});
