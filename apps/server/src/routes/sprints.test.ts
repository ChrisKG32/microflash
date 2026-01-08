/**
 * Sprint Routes Tests
 */

import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import type { User, Deck, Card, Sprint, SprintCard } from '@/generated/prisma';

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
    },
    card: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
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
});
