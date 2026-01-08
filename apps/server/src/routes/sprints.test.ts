/**
 * Sprint Routes Tests
 */

import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import type { User, Deck, Card } from '@/generated/prisma';

// Mock user for tests
const mockUser: User = {
  id: 'user-1',
  clerkId: 'clerk-user-1',
  pushToken: 'ExponentPushToken[test]',
  notificationsEnabled: true,
  onboardingComplete: true,
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

// Mock deck
const mockDeck: Deck & { cards?: Card[] } = {
  id: 'deck-1',
  title: 'Test Deck',
  description: null,
  priority: 50,
  parentDeckId: null,
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock cards (due for review)
const now = new Date();
const pastDate = new Date(now.getTime() - 60000); // 1 minute ago

const mockCards: Card[] = [
  {
    id: 'card-1',
    front: 'Question 1',
    back: 'Answer 1',
    priority: 75,
    deckId: 'deck-1',
    stability: 1,
    difficulty: 0.3,
    elapsedDays: 1,
    scheduledDays: 1,
    reps: 1,
    lapses: 0,
    state: 'REVIEW',
    lastReview: pastDate,
    nextReviewDate: pastDate,
    lastNotificationSent: null,
    snoozedUntil: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  {
    id: 'card-2',
    front: 'Question 2',
    back: 'Answer 2',
    priority: 50,
    deckId: 'deck-1',
    stability: 1,
    difficulty: 0.3,
    elapsedDays: 1,
    scheduledDays: 1,
    reps: 1,
    lapses: 0,
    state: 'REVIEW',
    lastReview: pastDate,
    nextReviewDate: pastDate,
    lastNotificationSent: null,
    snoozedUntil: null,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date(),
  },
  {
    id: 'card-3',
    front: 'Question 3',
    back: 'Answer 3',
    priority: 25,
    deckId: 'deck-1',
    stability: 1,
    difficulty: 0.3,
    elapsedDays: 1,
    scheduledDays: 1,
    reps: 1,
    lapses: 0,
    state: 'REVIEW',
    lastReview: pastDate,
    nextReviewDate: pastDate,
    lastNotificationSent: null,
    snoozedUntil: null,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date(),
  },
];

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    sprint: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sprintCard: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    card: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    review: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '@/lib/prisma';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Mock requireUser middleware
  const requireUser = (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = mockUser;
    next();
  };

  // Import and mount routes
  const sprintsRouter = Router();

  // POST /start
  sprintsRouter.post('/start', requireUser, async (req, res, next) => {
    try {
      const { startSprint, formatSprintResponse } = await import(
        '@/services/sprint-service'
      );
      const { sprint, resumed } = await startSprint({
        userId: mockUser.id,
        deckId: req.body.deckId,
        source: req.body.source || 'HOME',
      });
      res.status(resumed ? 200 : 201).json({
        sprint: formatSprintResponse(sprint),
        resumed,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_ELIGIBLE_CARDS') {
        return res.status(404).json({
          error: {
            code: 'NO_ELIGIBLE_CARDS',
            message: 'No cards are due for review',
          },
        });
      }
      next(error);
    }
  });

  // GET /:id
  sprintsRouter.get('/:id', requireUser, async (req, res, next) => {
    try {
      const { getSprintById, formatSprintResponse } = await import(
        '@/services/sprint-service'
      );
      const sprint = await getSprintById(req.params.id, mockUser.id);
      res.json({
        sprint: formatSprintResponse(sprint),
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'SPRINT_NOT_FOUND') {
          return res.status(404).json({
            error: { code: 'SPRINT_NOT_FOUND', message: 'Sprint not found' },
          });
        }
        if (error.message === 'SPRINT_NOT_OWNED') {
          return res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to access this sprint',
            },
          });
        }
      }
      next(error);
    }
  });

  // POST /:id/review
  sprintsRouter.post('/:id/review', requireUser, async (req, res, next) => {
    try {
      const { submitSprintReview, formatSprintResponse } = await import(
        '@/services/sprint-service'
      );
      const { sprint, updatedCard } = await submitSprintReview({
        sprintId: req.params.id,
        userId: mockUser.id,
        cardId: req.body.cardId,
        rating: req.body.rating,
      });
      res.json({
        sprint: formatSprintResponse(sprint),
        updatedCard: {
          id: updatedCard.id,
          nextReviewDate: updatedCard.nextReviewDate.toISOString(),
          state: updatedCard.state,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'SPRINT_NOT_FOUND':
            return res.status(404).json({
              error: { code: 'SPRINT_NOT_FOUND', message: 'Sprint not found' },
            });
          case 'SPRINT_NOT_OWNED':
            return res.status(403).json({
              error: {
                code: 'FORBIDDEN',
                message: 'You do not have permission to access this sprint',
              },
            });
          case 'SPRINT_EXPIRED':
            return res.status(409).json({
              error: {
                code: 'SPRINT_EXPIRED',
                message:
                  'Sprint has expired and was auto-abandoned. Please start a new sprint.',
              },
            });
          case 'SPRINT_NOT_ACTIVE':
            return res.status(409).json({
              error: {
                code: 'SPRINT_NOT_ACTIVE',
                message:
                  'Sprint is not active. Only active sprints can receive reviews.',
              },
            });
          case 'CARD_NOT_IN_SPRINT':
            return res.status(400).json({
              error: {
                code: 'CARD_NOT_IN_SPRINT',
                message: 'The specified card is not part of this sprint',
              },
            });
          case 'CARD_ALREADY_REVIEWED':
            return res.status(409).json({
              error: {
                code: 'CARD_ALREADY_REVIEWED',
                message: 'This card has already been reviewed in this sprint',
              },
            });
        }
      }
      next(error);
    }
  });

  // POST /:id/complete
  sprintsRouter.post('/:id/complete', requireUser, async (req, res, next) => {
    try {
      const { completeSprint, formatSprintResponse } = await import(
        '@/services/sprint-service'
      );
      const { sprint, stats } = await completeSprint(
        req.params.id,
        mockUser.id,
      );
      res.json({
        sprint: formatSprintResponse(sprint),
        stats,
      });
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'SPRINT_NOT_FOUND':
            return res.status(404).json({
              error: { code: 'SPRINT_NOT_FOUND', message: 'Sprint not found' },
            });
          case 'SPRINT_NOT_OWNED':
            return res.status(403).json({
              error: {
                code: 'FORBIDDEN',
                message: 'You do not have permission to access this sprint',
              },
            });
          case 'SPRINT_ABANDONED':
            return res.status(409).json({
              error: {
                code: 'SPRINT_ABANDONED',
                message: 'Cannot complete an abandoned sprint',
              },
            });
          case 'SPRINT_NOT_ACTIVE':
            return res.status(409).json({
              error: {
                code: 'SPRINT_NOT_ACTIVE',
                message:
                  'Sprint is not active. Only active sprints can be completed.',
              },
            });
          case 'SPRINT_INCOMPLETE':
            return res.status(400).json({
              error: {
                code: 'SPRINT_INCOMPLETE',
                message:
                  'Cannot complete sprint: not all cards have been reviewed',
              },
            });
        }
      }
      next(error);
    }
  });

  // POST /:id/abandon
  sprintsRouter.post('/:id/abandon', requireUser, async (req, res, next) => {
    try {
      const { abandonSprint, formatSprintResponse } = await import(
        '@/services/sprint-service'
      );
      const { sprint, snoozedCardCount } = await abandonSprint(
        req.params.id,
        mockUser.id,
      );
      res.json({
        sprint: formatSprintResponse(sprint),
        snoozedCardCount,
      });
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'SPRINT_NOT_FOUND':
            return res.status(404).json({
              error: { code: 'SPRINT_NOT_FOUND', message: 'Sprint not found' },
            });
          case 'SPRINT_NOT_OWNED':
            return res.status(403).json({
              error: {
                code: 'FORBIDDEN',
                message: 'You do not have permission to access this sprint',
              },
            });
        }
      }
      next(error);
    }
  });

  // POST /:id/review
  sprintsRouter.post('/:id/review', requireUser, async (req, res, next) => {
    try {
      const { submitSprintReview, formatSprintResponse } = await import(
        '@/services/sprint-service'
      );
      const { sprint, updatedCard } = await submitSprintReview({
        sprintId: req.params.id,
        userId: mockUser.id,
        cardId: req.body.cardId,
        rating: req.body.rating,
      });
      res.json({
        sprint: formatSprintResponse(sprint),
        updatedCard: {
          id: updatedCard.id,
          nextReviewDate: updatedCard.nextReviewDate.toISOString(),
          state: updatedCard.state,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'SPRINT_NOT_FOUND':
            return res.status(404).json({
              error: { code: 'SPRINT_NOT_FOUND', message: 'Sprint not found' },
            });
          case 'SPRINT_NOT_OWNED':
            return res.status(403).json({
              error: {
                code: 'FORBIDDEN',
                message: 'You do not have permission to access this sprint',
              },
            });
          case 'SPRINT_EXPIRED':
            return res.status(409).json({
              error: {
                code: 'SPRINT_EXPIRED',
                message:
                  'Sprint has expired and was auto-abandoned. Please start a new sprint.',
              },
            });
          case 'SPRINT_NOT_ACTIVE':
            return res.status(409).json({
              error: {
                code: 'SPRINT_NOT_ACTIVE',
                message:
                  'Sprint is not active. Only active sprints can receive reviews.',
              },
            });
          case 'CARD_NOT_IN_SPRINT':
            return res.status(400).json({
              error: {
                code: 'CARD_NOT_IN_SPRINT',
                message: 'The specified card is not part of this sprint',
              },
            });
          case 'CARD_ALREADY_REVIEWED':
            return res.status(409).json({
              error: {
                code: 'CARD_ALREADY_REVIEWED',
                message: 'This card has already been reviewed in this sprint',
              },
            });
        }
      }
      next(error);
    }
  });

  app.use('/api/sprints', sprintsRouter);

  return app;
}

describe('Sprint Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe('POST /api/sprints/start', () => {
    it('creates a new sprint when no resumable sprint exists', async () => {
      // No existing resumable sprint
      (mockedPrisma.sprint.findFirst as jest.Mock).mockResolvedValue(null);

      // User sprint size
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        sprintSize: 5,
      });

      // No cards in active sprints
      (mockedPrisma.sprintCard.findMany as jest.Mock).mockResolvedValue([]);

      // Eligible cards
      (mockedPrisma.card.findMany as jest.Mock).mockResolvedValue(
        mockCards.map((c) => ({
          ...c,
          deck: {
            id: mockDeck.id,
            title: mockDeck.title,
            priority: mockDeck.priority,
          },
        })),
      );

      // Created sprint
      const createdSprint = {
        id: 'sprint-1',
        userId: 'user-1',
        deckId: null,
        status: 'ACTIVE',
        source: 'HOME',
        createdAt: now,
        startedAt: now,
        completedAt: null,
        resumableUntil: new Date(now.getTime() + 30 * 60000),
        abandonedAt: null,
        deck: null,
        sprintCards: mockCards.map((c, i) => ({
          id: `sc-${i + 1}`,
          order: i + 1,
          result: null,
          card: {
            ...c,
            deck: { id: mockDeck.id, title: mockDeck.title },
          },
        })),
      };
      (mockedPrisma.sprint.create as jest.Mock).mockResolvedValue(
        createdSprint,
      );

      const response = await request(app)
        .post('/api/sprints/start')
        .send({ source: 'HOME' });

      expect(response.status).toBe(201);
      expect(response.body.resumed).toBe(false);
      expect(response.body.sprint).toBeDefined();
      expect(response.body.sprint.id).toBe('sprint-1');
      expect(response.body.sprint.status).toBe('ACTIVE');
      expect(response.body.sprint.source).toBe('HOME');
      expect(response.body.sprint.cards).toHaveLength(3);
      expect(response.body.sprint.progress).toEqual({
        total: 3,
        reviewed: 0,
        remaining: 3,
      });
    });

    it('returns existing resumable sprint', async () => {
      const resumableUntil = new Date(now.getTime() + 15 * 60000); // 15 min from now

      const existingSprint = {
        id: 'sprint-existing',
        userId: 'user-1',
        deckId: null,
        status: 'ACTIVE',
        source: 'HOME',
        createdAt: new Date(now.getTime() - 10 * 60000),
        startedAt: new Date(now.getTime() - 10 * 60000),
        completedAt: null,
        resumableUntil,
        abandonedAt: null,
        deck: null,
        sprintCards: [
          {
            id: 'sc-1',
            order: 1,
            result: 'PASS',
            card: {
              ...mockCards[0],
              deck: { id: mockDeck.id, title: mockDeck.title },
            },
          },
          {
            id: 'sc-2',
            order: 2,
            result: null,
            card: {
              ...mockCards[1],
              deck: { id: mockDeck.id, title: mockDeck.title },
            },
          },
        ],
      };

      (mockedPrisma.sprint.findFirst as jest.Mock).mockResolvedValue(
        existingSprint,
      );

      const response = await request(app).post('/api/sprints/start').send({});

      expect(response.status).toBe(200);
      expect(response.body.resumed).toBe(true);
      expect(response.body.sprint.id).toBe('sprint-existing');
      expect(response.body.sprint.progress).toEqual({
        total: 2,
        reviewed: 1,
        remaining: 1,
      });
    });

    it('returns 404 when no eligible cards', async () => {
      // No existing resumable sprint
      (mockedPrisma.sprint.findFirst as jest.Mock).mockResolvedValue(null);

      // User sprint size
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        sprintSize: 5,
      });

      // No cards in active sprints
      (mockedPrisma.sprintCard.findMany as jest.Mock).mockResolvedValue([]);

      // No eligible cards
      (mockedPrisma.card.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app).post('/api/sprints/start').send({});

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NO_ELIGIBLE_CARDS');
    });

    it('creates deck-constrained sprint when deckId provided', async () => {
      // No existing resumable sprint
      (mockedPrisma.sprint.findFirst as jest.Mock).mockResolvedValue(null);

      // User sprint size
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        sprintSize: 5,
      });

      // No cards in active sprints
      (mockedPrisma.sprintCard.findMany as jest.Mock).mockResolvedValue([]);

      // Eligible cards from specific deck
      (mockedPrisma.card.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockCards[0],
          deck: {
            id: mockDeck.id,
            title: mockDeck.title,
            priority: mockDeck.priority,
          },
        },
      ]);

      // Created sprint
      const createdSprint = {
        id: 'sprint-deck',
        userId: 'user-1',
        deckId: 'deck-1',
        status: 'ACTIVE',
        source: 'DECK',
        createdAt: now,
        startedAt: now,
        completedAt: null,
        resumableUntil: new Date(now.getTime() + 30 * 60000),
        abandonedAt: null,
        deck: { id: mockDeck.id, title: mockDeck.title },
        sprintCards: [
          {
            id: 'sc-1',
            order: 1,
            result: null,
            card: {
              ...mockCards[0],
              deck: { id: mockDeck.id, title: mockDeck.title },
            },
          },
        ],
      };
      (mockedPrisma.sprint.create as jest.Mock).mockResolvedValue(
        createdSprint,
      );

      const response = await request(app)
        .post('/api/sprints/start')
        .send({ deckId: 'deck-1', source: 'DECK' });

      expect(response.status).toBe(201);
      expect(response.body.sprint.deckId).toBe('deck-1');
      expect(response.body.sprint.source).toBe('DECK');
    });
  });

  describe('GET /api/sprints/:id', () => {
    it('returns sprint by ID', async () => {
      const existingSprint = {
        id: 'sprint-1',
        userId: 'user-1',
        deckId: null,
        status: 'ACTIVE',
        source: 'HOME',
        createdAt: now,
        startedAt: now,
        completedAt: null,
        resumableUntil: new Date(now.getTime() + 15 * 60000),
        abandonedAt: null,
        deck: null,
        sprintCards: [
          {
            id: 'sc-1',
            order: 1,
            result: null,
            card: {
              ...mockCards[0],
              deck: { id: mockDeck.id, title: mockDeck.title },
            },
          },
        ],
      };

      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        existingSprint,
      );

      const response = await request(app).get('/api/sprints/sprint-1');

      expect(response.status).toBe(200);
      expect(response.body.sprint.id).toBe('sprint-1');
      expect(response.body.sprint.status).toBe('ACTIVE');
    });

    it('returns 404 for non-existent sprint', async () => {
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/sprints/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('SPRINT_NOT_FOUND');
    });

    it('returns 403 for sprint owned by another user', async () => {
      const otherUserSprint = {
        id: 'sprint-other',
        userId: 'other-user',
        deckId: null,
        status: 'ACTIVE',
        source: 'HOME',
        createdAt: now,
        startedAt: now,
        completedAt: null,
        resumableUntil: new Date(now.getTime() + 15 * 60000),
        abandonedAt: null,
        deck: null,
        sprintCards: [],
      };

      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        otherUserSprint,
      );

      const response = await request(app).get('/api/sprints/sprint-other');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('auto-abandons expired sprint and snoozes remaining cards', async () => {
      const expiredResumableUntil = new Date(now.getTime() - 5 * 60000); // 5 min ago

      const expiredSprint = {
        id: 'sprint-expired',
        userId: 'user-1',
        deckId: null,
        status: 'ACTIVE',
        source: 'HOME',
        createdAt: new Date(now.getTime() - 60 * 60000),
        startedAt: new Date(now.getTime() - 60 * 60000),
        completedAt: null,
        resumableUntil: expiredResumableUntil,
        abandonedAt: null,
        deck: null,
        sprintCards: [
          {
            id: 'sc-1',
            order: 1,
            result: 'PASS',
            card: {
              ...mockCards[0],
              deck: { id: mockDeck.id, title: mockDeck.title },
            },
          },
          {
            id: 'sc-2',
            order: 2,
            result: null, // Unreviewed - should be snoozed
            card: {
              ...mockCards[1],
              deck: { id: mockDeck.id, title: mockDeck.title },
            },
          },
        ],
      };

      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        expiredSprint,
      );

      // Mock finding unreviewed cards
      (mockedPrisma.sprintCard.findMany as jest.Mock).mockResolvedValue([
        { cardId: 'card-2' },
      ]);

      // Mock transaction for abandon
      const abandonedSprint = {
        ...expiredSprint,
        status: 'ABANDONED',
        abandonedAt: now,
      };
      (mockedPrisma.$transaction as jest.Mock).mockResolvedValue([
        abandonedSprint,
      ]);

      const response = await request(app).get('/api/sprints/sprint-expired');

      expect(response.status).toBe(200);
      expect(response.body.sprint.status).toBe('ABANDONED');
      expect(response.body.sprint.abandonedAt).toBeDefined();
    });

    it('activates PENDING sprint on first access', async () => {
      const pendingSprint = {
        id: 'sprint-pending',
        userId: 'user-1',
        deckId: null,
        status: 'PENDING',
        source: 'PUSH',
        createdAt: now,
        startedAt: null,
        completedAt: null,
        resumableUntil: null,
        abandonedAt: null,
        deck: null,
        sprintCards: [
          {
            id: 'sc-1',
            order: 1,
            result: null,
            card: {
              ...mockCards[0],
              deck: { id: mockDeck.id, title: mockDeck.title },
            },
          },
        ],
      };

      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        pendingSprint,
      );

      const activatedSprint = {
        ...pendingSprint,
        status: 'ACTIVE',
        startedAt: now,
        resumableUntil: new Date(now.getTime() + 30 * 60000),
      };
      (mockedPrisma.sprint.update as jest.Mock).mockResolvedValue(
        activatedSprint,
      );

      const response = await request(app).get('/api/sprints/sprint-pending');

      expect(response.status).toBe(200);
      expect(response.body.sprint.status).toBe('ACTIVE');
      expect(response.body.sprint.startedAt).toBeDefined();
      expect(response.body.sprint.resumableUntil).toBeDefined();
    });
  });

  describe('POST /api/sprints/:id/review', () => {
    const activeSprint = {
      id: 'sprint-1',
      userId: 'user-1',
      deckId: null,
      status: 'ACTIVE',
      source: 'HOME',
      createdAt: now,
      startedAt: now,
      completedAt: null,
      resumableUntil: new Date(now.getTime() + 15 * 60000), // 15 min from now
      abandonedAt: null,
      deck: null,
      sprintCards: [
        {
          id: 'sc-1',
          order: 1,
          result: null,
          card: {
            ...mockCards[0],
            deck: { id: mockDeck.id, title: mockDeck.title },
          },
        },
        {
          id: 'sc-2',
          order: 2,
          result: null,
          card: {
            ...mockCards[1],
            deck: { id: mockDeck.id, title: mockDeck.title },
          },
        },
      ],
    };

    it('successfully submits a review and updates card FSRS state', async () => {
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        activeSprint,
      );

      const newNextReviewDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day
      const updatedCard = {
        ...mockCards[0],
        nextReviewDate: newNextReviewDate,
        state: 'REVIEW',
        reps: 2,
      };

      const updatedSprint = {
        ...activeSprint,
        resumableUntil: new Date(now.getTime() + 30 * 60000), // Extended
        sprintCards: [
          {
            ...activeSprint.sprintCards[0],
            result: 'PASS',
          },
          activeSprint.sprintCards[1],
        ],
      };

      (mockedPrisma.$transaction as jest.Mock).mockResolvedValue([
        { id: 'review-1' }, // review.create
        updatedCard, // card.update
        { id: 'sc-1', result: 'PASS' }, // sprintCard.update
        updatedSprint, // sprint.update
      ]);

      const response = await request(app)
        .post('/api/sprints/sprint-1/review')
        .send({ cardId: 'card-1', rating: 'GOOD' });

      expect(response.status).toBe(200);
      expect(response.body.sprint).toBeDefined();
      expect(response.body.sprint.progress.reviewed).toBe(1);
      expect(response.body.updatedCard).toBeDefined();
      expect(response.body.updatedCard.id).toBe('card-1');
      expect(response.body.updatedCard.nextReviewDate).toBeDefined();
    });

    it('returns 404 for non-existent sprint', async () => {
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/sprints/non-existent/review')
        .send({ cardId: 'card-1', rating: 'GOOD' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('SPRINT_NOT_FOUND');
    });

    it('returns 403 for sprint owned by another user', async () => {
      const otherUserSprint = {
        ...activeSprint,
        userId: 'other-user',
      };
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        otherUserSprint,
      );

      const response = await request(app)
        .post('/api/sprints/sprint-1/review')
        .send({ cardId: 'card-1', rating: 'GOOD' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 409 for expired sprint and auto-abandons', async () => {
      const expiredSprint = {
        ...activeSprint,
        resumableUntil: new Date(now.getTime() - 5 * 60000), // 5 min ago
      };
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        expiredSprint,
      );

      // Mock for auto-abandon
      (mockedPrisma.sprintCard.findMany as jest.Mock).mockResolvedValue([
        { cardId: 'card-1' },
        { cardId: 'card-2' },
      ]);
      (mockedPrisma.$transaction as jest.Mock).mockResolvedValue([
        { ...expiredSprint, status: 'ABANDONED', abandonedAt: now },
      ]);

      const response = await request(app)
        .post('/api/sprints/sprint-1/review')
        .send({ cardId: 'card-1', rating: 'GOOD' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('SPRINT_EXPIRED');
    });

    it('returns 409 for non-active sprint', async () => {
      const completedSprint = {
        ...activeSprint,
        status: 'COMPLETED',
        completedAt: now,
      };
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        completedSprint,
      );

      const response = await request(app)
        .post('/api/sprints/sprint-1/review')
        .send({ cardId: 'card-1', rating: 'GOOD' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('SPRINT_NOT_ACTIVE');
    });

    it('returns 400 for card not in sprint', async () => {
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        activeSprint,
      );

      const response = await request(app)
        .post('/api/sprints/sprint-1/review')
        .send({ cardId: 'card-not-in-sprint', rating: 'GOOD' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('CARD_NOT_IN_SPRINT');
    });

    it('returns 409 for already reviewed card', async () => {
      const sprintWithReviewedCard = {
        ...activeSprint,
        sprintCards: [
          {
            ...activeSprint.sprintCards[0],
            result: 'PASS', // Already reviewed
          },
          activeSprint.sprintCards[1],
        ],
      };
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        sprintWithReviewedCard,
      );

      const response = await request(app)
        .post('/api/sprints/sprint-1/review')
        .send({ cardId: 'card-1', rating: 'GOOD' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CARD_ALREADY_REVIEWED');
    });

    it('maps AGAIN rating to FAIL result', async () => {
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        activeSprint,
      );

      const newNextReviewDate = new Date(now.getTime() + 60 * 1000); // 1 minute (learning step)
      const updatedCard = {
        ...mockCards[0],
        nextReviewDate: newNextReviewDate,
        state: 'RELEARNING',
        lapses: 1,
      };

      const updatedSprint = {
        ...activeSprint,
        resumableUntil: new Date(now.getTime() + 30 * 60000),
        sprintCards: [
          {
            ...activeSprint.sprintCards[0],
            result: 'FAIL', // AGAIN maps to FAIL
          },
          activeSprint.sprintCards[1],
        ],
      };

      (mockedPrisma.$transaction as jest.Mock).mockResolvedValue([
        { id: 'review-1' },
        updatedCard,
        { id: 'sc-1', result: 'FAIL' },
        updatedSprint,
      ]);

      const response = await request(app)
        .post('/api/sprints/sprint-1/review')
        .send({ cardId: 'card-1', rating: 'AGAIN' });

      expect(response.status).toBe(200);
      expect(response.body.sprint.cards[0].result).toBe('FAIL');
    });

    it('extends resumableUntil on successful review', async () => {
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        activeSprint,
      );

      const newResumableUntil = new Date(now.getTime() + 30 * 60000);
      const updatedSprint = {
        ...activeSprint,
        resumableUntil: newResumableUntil,
        sprintCards: [
          {
            ...activeSprint.sprintCards[0],
            result: 'PASS',
          },
          activeSprint.sprintCards[1],
        ],
      };

      (mockedPrisma.$transaction as jest.Mock).mockResolvedValue([
        { id: 'review-1' },
        { ...mockCards[0], nextReviewDate: new Date() },
        { id: 'sc-1', result: 'PASS' },
        updatedSprint,
      ]);

      const response = await request(app)
        .post('/api/sprints/sprint-1/review')
        .send({ cardId: 'card-1', rating: 'GOOD' });

      expect(response.status).toBe(200);
      expect(response.body.sprint.resumableUntil).toBeDefined();
    });
  });

  describe('POST /api/sprints/:id/complete', () => {
    const completedSprintCards = [
      {
        id: 'sc-1',
        order: 1,
        result: 'PASS',
        card: {
          ...mockCards[0],
          deck: { id: mockDeck.id, title: mockDeck.title },
        },
      },
      {
        id: 'sc-2',
        order: 2,
        result: 'FAIL',
        card: {
          ...mockCards[1],
          deck: { id: mockDeck.id, title: mockDeck.title },
        },
      },
    ];

    const activeSprintAllReviewed = {
      id: 'sprint-1',
      userId: 'user-1',
      deckId: null,
      status: 'ACTIVE',
      source: 'HOME',
      createdAt: now,
      startedAt: new Date(now.getTime() - 5 * 60000), // 5 min ago
      completedAt: null,
      resumableUntil: new Date(now.getTime() + 15 * 60000),
      abandonedAt: null,
      deck: null,
      sprintCards: completedSprintCards,
    };

    it('successfully completes a sprint with all cards reviewed', async () => {
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        activeSprintAllReviewed,
      );

      const completedSprint = {
        ...activeSprintAllReviewed,
        status: 'COMPLETED',
        completedAt: now,
      };
      (mockedPrisma.sprint.update as jest.Mock).mockResolvedValue(
        completedSprint,
      );

      const response = await request(app).post(
        '/api/sprints/sprint-1/complete',
      );

      expect(response.status).toBe(200);
      expect(response.body.sprint.status).toBe('COMPLETED');
      expect(response.body.sprint.completedAt).toBeDefined();
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.totalCards).toBe(2);
      expect(response.body.stats.passCount).toBe(1);
      expect(response.body.stats.failCount).toBe(1);
      expect(response.body.stats.durationSeconds).toBeDefined();
    });

    it('returns idempotently for already completed sprint', async () => {
      const alreadyCompletedSprint = {
        ...activeSprintAllReviewed,
        status: 'COMPLETED',
        completedAt: new Date(now.getTime() - 60000),
      };
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        alreadyCompletedSprint,
      );

      const response = await request(app).post(
        '/api/sprints/sprint-1/complete',
      );

      expect(response.status).toBe(200);
      expect(response.body.sprint.status).toBe('COMPLETED');
      expect(response.body.stats).toBeDefined();
    });

    it('returns 404 for non-existent sprint', async () => {
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).post(
        '/api/sprints/non-existent/complete',
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('SPRINT_NOT_FOUND');
    });

    it('returns 403 for sprint owned by another user', async () => {
      const otherUserSprint = {
        ...activeSprintAllReviewed,
        userId: 'other-user',
      };
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        otherUserSprint,
      );

      const response = await request(app).post(
        '/api/sprints/sprint-1/complete',
      );

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 409 for abandoned sprint', async () => {
      const abandonedSprint = {
        ...activeSprintAllReviewed,
        status: 'ABANDONED',
        abandonedAt: now,
      };
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        abandonedSprint,
      );

      const response = await request(app).post(
        '/api/sprints/sprint-1/complete',
      );

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('SPRINT_ABANDONED');
    });

    it('returns 400 for incomplete sprint (unreviewed cards)', async () => {
      const incompleteSprintCards = [
        {
          id: 'sc-1',
          order: 1,
          result: 'PASS',
          card: {
            ...mockCards[0],
            deck: { id: mockDeck.id, title: mockDeck.title },
          },
        },
        {
          id: 'sc-2',
          order: 2,
          result: null, // Not reviewed
          card: {
            ...mockCards[1],
            deck: { id: mockDeck.id, title: mockDeck.title },
          },
        },
      ];

      const incompleteSprint = {
        ...activeSprintAllReviewed,
        sprintCards: incompleteSprintCards,
      };
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        incompleteSprint,
      );

      const response = await request(app).post(
        '/api/sprints/sprint-1/complete',
      );

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('SPRINT_INCOMPLETE');
    });
  });

  describe('POST /api/sprints/:id/abandon', () => {
    const activeSprintWithUnreviewed = {
      id: 'sprint-1',
      userId: 'user-1',
      deckId: null,
      status: 'ACTIVE',
      source: 'HOME',
      createdAt: now,
      startedAt: now,
      completedAt: null,
      resumableUntil: new Date(now.getTime() + 15 * 60000),
      abandonedAt: null,
      deck: null,
      sprintCards: [
        {
          id: 'sc-1',
          order: 1,
          result: 'PASS',
          card: {
            ...mockCards[0],
            deck: { id: mockDeck.id, title: mockDeck.title },
          },
        },
        {
          id: 'sc-2',
          order: 2,
          result: null, // Unreviewed - will be snoozed
          card: {
            ...mockCards[1],
            deck: { id: mockDeck.id, title: mockDeck.title },
          },
        },
      ],
    };

    it('successfully abandons sprint and snoozes unreviewed cards', async () => {
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue({
        ...activeSprintWithUnreviewed,
        sprintCards: [{ id: 'sc-2' }], // Only unreviewed cards for count
      });

      // Mock finding unreviewed cards
      (mockedPrisma.sprintCard.findMany as jest.Mock).mockResolvedValue([
        { cardId: 'card-2' },
      ]);

      const abandonedSprint = {
        ...activeSprintWithUnreviewed,
        status: 'ABANDONED',
        abandonedAt: now,
      };
      (mockedPrisma.$transaction as jest.Mock).mockResolvedValue([
        abandonedSprint,
      ]);

      const response = await request(app).post('/api/sprints/sprint-1/abandon');

      expect(response.status).toBe(200);
      expect(response.body.sprint.status).toBe('ABANDONED');
      expect(response.body.sprint.abandonedAt).toBeDefined();
      expect(response.body.snoozedCardCount).toBe(1);
    });

    it('returns idempotently for already abandoned sprint', async () => {
      const alreadyAbandonedSprint = {
        ...activeSprintWithUnreviewed,
        status: 'ABANDONED',
        abandonedAt: new Date(now.getTime() - 60000),
      };
      (mockedPrisma.sprint.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          ...alreadyAbandonedSprint,
          sprintCards: [],
        })
        .mockResolvedValueOnce(alreadyAbandonedSprint);

      const response = await request(app).post('/api/sprints/sprint-1/abandon');

      expect(response.status).toBe(200);
      expect(response.body.sprint.status).toBe('ABANDONED');
      expect(response.body.snoozedCardCount).toBe(0);
    });

    it('returns idempotently for already completed sprint', async () => {
      const completedSprint = {
        ...activeSprintWithUnreviewed,
        status: 'COMPLETED',
        completedAt: now,
      };
      (mockedPrisma.sprint.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          ...completedSprint,
          sprintCards: [],
        })
        .mockResolvedValueOnce(completedSprint);

      const response = await request(app).post('/api/sprints/sprint-1/abandon');

      expect(response.status).toBe(200);
      expect(response.body.sprint.status).toBe('COMPLETED');
      expect(response.body.snoozedCardCount).toBe(0);
    });

    it('returns 404 for non-existent sprint', async () => {
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).post(
        '/api/sprints/non-existent/abandon',
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('SPRINT_NOT_FOUND');
    });

    it('returns 403 for sprint owned by another user', async () => {
      const otherUserSprint = {
        ...activeSprintWithUnreviewed,
        userId: 'other-user',
      };
      (mockedPrisma.sprint.findUnique as jest.Mock).mockResolvedValue(
        otherUserSprint,
      );

      const response = await request(app).post('/api/sprints/sprint-1/abandon');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Sprint Card Priority Ordering', () => {
    it('orders cards by card priority DESC then deck priority DESC', async () => {
      // No existing resumable sprint
      (mockedPrisma.sprint.findFirst as jest.Mock).mockResolvedValue(null);

      // User sprint size
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        sprintSize: 10,
      });

      // No cards in active sprints
      (mockedPrisma.sprintCard.findMany as jest.Mock).mockResolvedValue([]);

      // Cards with different priorities from different decks
      const highPriorityDeck = {
        id: 'deck-high',
        title: 'High Priority Deck',
        priority: 90,
      };
      const lowPriorityDeck = {
        id: 'deck-low',
        title: 'Low Priority Deck',
        priority: 30,
      };

      const cardsWithPriorities = [
        {
          ...mockCards[0],
          id: 'card-low-priority',
          priority: 20,
          deck: lowPriorityDeck,
        },
        {
          ...mockCards[1],
          id: 'card-high-priority',
          priority: 90,
          deck: highPriorityDeck,
        },
        {
          ...mockCards[2],
          id: 'card-medium-priority',
          priority: 50,
          deck: highPriorityDeck,
        },
        {
          ...mockCards[0],
          id: 'card-same-priority-high-deck',
          priority: 50,
          deck: highPriorityDeck,
        },
        {
          ...mockCards[1],
          id: 'card-same-priority-low-deck',
          priority: 50,
          deck: lowPriorityDeck,
        },
      ];

      (mockedPrisma.card.findMany as jest.Mock).mockResolvedValue(
        cardsWithPriorities,
      );

      // Created sprint - cards should be ordered by priority
      const createdSprint = {
        id: 'sprint-priority-test',
        userId: 'user-1',
        deckId: null,
        status: 'ACTIVE',
        source: 'HOME',
        createdAt: now,
        startedAt: now,
        completedAt: null,
        resumableUntil: new Date(now.getTime() + 30 * 60000),
        abandonedAt: null,
        deck: null,
        sprintCards: [
          // Expected order: card-high-priority (90), card-same-priority-high-deck (50, deck 90),
          // card-medium-priority (50, deck 90), card-same-priority-low-deck (50, deck 30),
          // card-low-priority (20)
          {
            id: 'sc-1',
            order: 1,
            result: null,
            card: cardsWithPriorities[1], // card-high-priority (90)
          },
          {
            id: 'sc-2',
            order: 2,
            result: null,
            card: cardsWithPriorities[3], // card-same-priority-high-deck (50, deck 90)
          },
          {
            id: 'sc-3',
            order: 3,
            result: null,
            card: cardsWithPriorities[2], // card-medium-priority (50, deck 90)
          },
          {
            id: 'sc-4',
            order: 4,
            result: null,
            card: cardsWithPriorities[4], // card-same-priority-low-deck (50, deck 30)
          },
          {
            id: 'sc-5',
            order: 5,
            result: null,
            card: cardsWithPriorities[0], // card-low-priority (20)
          },
        ],
      };
      (mockedPrisma.sprint.create as jest.Mock).mockResolvedValue(
        createdSprint,
      );

      const response = await request(app)
        .post('/api/sprints/start')
        .send({ source: 'HOME' });

      expect(response.status).toBe(201);
      expect(response.body.sprint.cards).toHaveLength(5);

      // Verify the order: highest card priority first
      const cardIds = response.body.sprint.cards.map(
        (sc: { card: { id: string } }) => sc.card.id,
      );
      expect(cardIds[0]).toBe('card-high-priority'); // Priority 90
      expect(cardIds[4]).toBe('card-low-priority'); // Priority 20

      // Cards with same priority should be ordered by deck priority
      // card-same-priority-high-deck (deck 90) should come before card-same-priority-low-deck (deck 30)
      const sameCardPriorityIndices = cardIds.reduce(
        (acc: { [key: string]: number }, id: string, idx: number) => {
          if (id.includes('same-priority')) {
            acc[id] = idx;
          }
          return acc;
        },
        {},
      );

      expect(
        sameCardPriorityIndices['card-same-priority-high-deck'],
      ).toBeLessThan(sameCardPriorityIndices['card-same-priority-low-deck']);
    });
  });
});
