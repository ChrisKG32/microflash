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
import reviewsRouter from '@/routes/reviews';
import { errorHandler } from '@/middlewares/error-handler';

// Helper to create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());

  app.use('/api/reviews', reviewsRouter);

  // Global error handler
  app.use(errorHandler);

  // Add 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  return app;
}

const app = createTestApp();

describe('Reviews Routes - Unit Tests', () => {
  beforeEach(() => {
    mockReset(prismaMock);
    shouldAttachUser = true;
  });

  describe('POST /api/reviews', () => {
    const now = new Date();
    const mockCard = {
      id: 'card-1',
      front: 'Question',
      back: 'Answer',
      deckId: 'deck-1',
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 'NEW' as const,
      lastReview: null,
      nextReviewDate: now,
      lastNotificationSent: null,
      snoozedUntil: null,
      createdAt: now,
      updatedAt: now,
      deck: {
        id: 'deck-1',
        title: 'Test Deck',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
      },
    };

    it('should return 400 when cardId is missing', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .send({ rating: 'GOOD' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when rating is missing', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .send({ cardId: 'card-1' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when rating is invalid', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .send({ cardId: 'card-1', rating: 'INVALID' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 when user not authenticated', async () => {
      shouldAttachUser = false;

      const response = await request(app)
        .post('/api/reviews')
        .send({ cardId: 'card-1', rating: 'GOOD' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 404 when card not found', async () => {
      prismaMock.card.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/reviews')
        .send({ cardId: 'nonexistent', rating: 'GOOD' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when user does not own the card', async () => {
      prismaMock.card.findUnique.mockResolvedValue({
        ...mockCard,
        deck: {
          ...mockCard.deck,
          userId: 'different-user-id',
        },
      } as never);

      const response = await request(app)
        .post('/api/reviews')
        .send({ cardId: 'card-1', rating: 'GOOD' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 201 with review and updated card on success', async () => {
      prismaMock.card.findUnique.mockResolvedValue(mockCard as never);

      const mockReview = {
        id: 'review-1',
        cardId: 'card-1',
        userId: 'user-internal-id',
        rating: 'GOOD' as const,
        createdAt: now,
      };

      const updatedCard = {
        ...mockCard,
        state: 'REVIEW' as const,
        reps: 1,
        stability: 2.4,
        difficulty: 5,
        nextReviewDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        lastReview: now,
      };

      prismaMock.$transaction.mockResolvedValue([mockReview, updatedCard]);

      const response = await request(app)
        .post('/api/reviews')
        .send({ cardId: 'card-1', rating: 'GOOD' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('review');
      expect(response.body).toHaveProperty('card');
      expect(response.body.review.id).toBe('review-1');
      expect(response.body.review.rating).toBe('GOOD');
      expect(response.body.card.state).toBe('REVIEW');
    });
  });

  describe('GET /api/reviews', () => {
    it('should return 401 when user not authenticated', async () => {
      shouldAttachUser = false;

      const response = await request(app).get('/api/reviews');

      expect(response.status).toBe(401);
    });

    it('should return 200 with reviews list', async () => {
      const now = new Date();
      prismaMock.review.findMany.mockResolvedValue([
        {
          id: 'review-1',
          cardId: 'card-1',
          userId: 'user-internal-id',
          rating: 'GOOD',
          createdAt: now,
          card: {
            id: 'card-1',
            front: 'Question',
            back: 'Answer',
          },
        },
      ] as never);

      const response = await request(app).get('/api/reviews');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reviews');
      expect(Array.isArray(response.body.reviews)).toBe(true);
    });
  });

  describe('GET /api/reviews/card/:cardId', () => {
    const now = new Date();
    const mockCard = {
      id: 'card-1',
      front: 'Question',
      back: 'Answer',
      deckId: 'deck-1',
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 'NEW' as const,
      lastReview: null,
      nextReviewDate: now,
      lastNotificationSent: null,
      snoozedUntil: null,
      createdAt: now,
      updatedAt: now,
      deck: {
        id: 'deck-1',
        title: 'Test Deck',
        description: null,
        userId: 'user-internal-id',
        parentDeckId: null,
        createdAt: now,
        updatedAt: now,
      },
    };

    it('should return 401 when user not authenticated', async () => {
      shouldAttachUser = false;

      const response = await request(app).get('/api/reviews/card/card-1');

      expect(response.status).toBe(401);
    });

    it('should return 404 when card not found', async () => {
      prismaMock.card.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/reviews/card/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when user does not own the card', async () => {
      prismaMock.card.findUnique.mockResolvedValue({
        ...mockCard,
        deck: {
          ...mockCard.deck,
          userId: 'different-user-id',
        },
      } as never);

      const response = await request(app).get('/api/reviews/card/card-1');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 200 with reviews for card', async () => {
      prismaMock.card.findUnique.mockResolvedValue(mockCard as never);
      prismaMock.review.findMany.mockResolvedValue([
        {
          id: 'review-1',
          cardId: 'card-1',
          userId: 'user-internal-id',
          rating: 'GOOD',
          createdAt: now,
        },
      ]);

      const response = await request(app).get('/api/reviews/card/card-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reviews');
      expect(Array.isArray(response.body.reviews)).toBe(true);
    });
  });
});
