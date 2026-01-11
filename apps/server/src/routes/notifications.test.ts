import request from 'supertest';
import express from 'express';
import { ZodError } from 'zod';
import notificationsRouter from '@/routes/notifications';
import { prisma } from '@/lib/prisma';
import { isValidExpoPushToken } from '@/services/push-notifications';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    card: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/services/push-notifications', () => ({
  isValidExpoPushToken: jest.fn(),
}));

jest.mock('@/middlewares/auth', () => ({
  requireUser: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = {
      id: 'user-1',
      clerkId: 'clerk-1',
      pushToken: 'ExponentPushToken[xxx]',
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
    next();
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockIsValidExpoPushToken = isValidExpoPushToken as jest.MockedFunction<
  typeof isValidExpoPushToken
>;

// Create a test app with the router
const app = express();
app.use(express.json());
app.use('/api/notifications', notificationsRouter);

// Add error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    // Handle Zod validation errors
    if (err instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
        },
      });
      return;
    }

    interface ErrorWithStatus extends Error {
      statusCode?: number;
      code?: string;
    }
    const typedErr = err as ErrorWithStatus;
    const statusCode = typedErr.statusCode || 500;
    res.status(statusCode).json({
      error: {
        code: typedErr.code || 'INTERNAL_ERROR',
        message: err.message,
      },
    });
  },
);

describe('Notifications Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/notifications/register', () => {
    it('should register a valid push token', async () => {
      mockIsValidExpoPushToken.mockReturnValue(true);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        pushToken: 'ExponentPushToken[xxx]',
      });

      const response = await request(app)
        .post('/api/notifications/register')
        .send({ pushToken: 'ExponentPushToken[xxx]' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { pushToken: 'ExponentPushToken[xxx]' },
      });
    });

    it('should reject invalid push token format', async () => {
      mockIsValidExpoPushToken.mockReturnValue(false);

      const response = await request(app)
        .post('/api/notifications/register')
        .send({ pushToken: 'invalid-token' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PUSH_TOKEN');
    });

    it('should require push token in body', async () => {
      const response = await request(app)
        .post('/api/notifications/register')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/notifications/cards/:id/snooze', () => {
    it('should snooze a card', async () => {
      (mockPrisma.card.findUnique as jest.Mock).mockResolvedValue({
        id: 'card-1',
        deck: { userId: 'user-1' },
      });
      (mockPrisma.card.update as jest.Mock).mockResolvedValue({
        id: 'card-1',
        snoozedUntil: new Date(),
      });

      const response = await request(app)
        .post('/api/notifications/cards/card-1/snooze')
        .send({ duration: 30 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.snoozedUntil).toBeDefined();
    });

    it('should return 404 for non-existent card', async () => {
      (mockPrisma.card.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/notifications/cards/non-existent/snooze')
        .send({ duration: 30 });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('CARD_NOT_FOUND');
    });

    it('should return 403 for card owned by another user', async () => {
      (mockPrisma.card.findUnique as jest.Mock).mockResolvedValue({
        id: 'card-1',
        deck: { userId: 'other-user' },
      });

      const response = await request(app)
        .post('/api/notifications/cards/card-1/snooze')
        .send({ duration: 30 });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should use default duration of 30 minutes', async () => {
      (mockPrisma.card.findUnique as jest.Mock).mockResolvedValue({
        id: 'card-1',
        deck: { userId: 'user-1' },
      });
      (mockPrisma.card.update as jest.Mock).mockResolvedValue({
        id: 'card-1',
        snoozedUntil: new Date(),
      });

      const response = await request(app)
        .post('/api/notifications/cards/card-1/snooze')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('30 minutes');
    });
  });

  describe('DELETE /api/notifications/cards/:id/snooze', () => {
    it('should unsnooze a card', async () => {
      (mockPrisma.card.findUnique as jest.Mock).mockResolvedValue({
        id: 'card-1',
        deck: { userId: 'user-1' },
      });
      (mockPrisma.card.update as jest.Mock).mockResolvedValue({
        id: 'card-1',
        snoozedUntil: null,
      });

      const response = await request(app).delete(
        '/api/notifications/cards/card-1/snooze',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPrisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { snoozedUntil: null },
      });
    });
  });

  describe('PATCH /api/notifications/preferences', () => {
    it('should update notification preferences', async () => {
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        notificationsEnabled: false,
        notificationCooldownMinutes: 120,
        maxNotificationsPerDay: 10,
        pushToken: 'ExponentPushToken[xxx]',
        lastPushSentAt: null,
        notificationsCountToday: 0,
      });

      const response = await request(app)
        .patch('/api/notifications/preferences')
        .send({ notificationsEnabled: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.prefs.notificationsEnabled).toBe(false);
    });

    it('should update cooldown and max per day', async () => {
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        notificationsEnabled: true,
        notificationCooldownMinutes: 180,
        maxNotificationsPerDay: 5,
        pushToken: 'ExponentPushToken[xxx]',
        lastPushSentAt: null,
        notificationsCountToday: 0,
      });

      const response = await request(app)
        .patch('/api/notifications/preferences')
        .send({
          notificationCooldownMinutes: 180,
          maxNotificationsPerDay: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body.prefs.notificationCooldownMinutes).toBe(180);
      expect(response.body.prefs.maxNotificationsPerDay).toBe(5);
    });

    it('should reject cooldown less than 120 minutes', async () => {
      const response = await request(app)
        .patch('/api/notifications/preferences')
        .send({ notificationCooldownMinutes: 60 });

      expect(response.status).toBe(400);
    });

    it('should allow empty body (no changes)', async () => {
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        notificationsEnabled: true,
        notificationCooldownMinutes: 120,
        maxNotificationsPerDay: 10,
        pushToken: 'ExponentPushToken[xxx]',
        lastPushSentAt: null,
        notificationsCountToday: 0,
      });

      const response = await request(app)
        .patch('/api/notifications/preferences')
        .send({});

      expect(response.status).toBe(200);
    });

    it('should update quiet hours', async () => {
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        notificationsEnabled: true,
        notificationCooldownMinutes: 120,
        maxNotificationsPerDay: 10,
        pushToken: 'ExponentPushToken[xxx]',
        lastPushSentAt: null,
        notificationsCountToday: 0,
      });

      const response = await request(app)
        .patch('/api/notifications/preferences')
        .send({
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
        });

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
        },
        select: expect.any(Object),
      });
    });

    it('should reject invalid quiet hours format', async () => {
      const response = await request(app)
        .patch('/api/notifications/preferences')
        .send({
          quietHoursStart: '25:00', // Invalid hour
        });

      expect(response.status).toBe(400);
    });

    it('should update sprint size', async () => {
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        notificationsEnabled: true,
        notificationCooldownMinutes: 120,
        maxNotificationsPerDay: 10,
        pushToken: 'ExponentPushToken[xxx]',
        lastPushSentAt: null,
        notificationsCountToday: 0,
      });

      const response = await request(app)
        .patch('/api/notifications/preferences')
        .send({ sprintSize: 7 });

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { sprintSize: 7 },
        select: expect.any(Object),
      });
    });

    it('should reject sprint size less than 3', async () => {
      const response = await request(app)
        .patch('/api/notifications/preferences')
        .send({ sprintSize: 2 });

      expect(response.status).toBe(400);
    });

    it('should reject sprint size greater than 10', async () => {
      const response = await request(app)
        .patch('/api/notifications/preferences')
        .send({ sprintSize: 11 });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/notifications/preferences', () => {
    it('should return full notification preferences', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        notificationsEnabled: true,
        notificationCooldownMinutes: 120,
        maxNotificationsPerDay: 10,
        pushToken: 'ExponentPushToken[xxx]',
        lastPushSentAt: new Date('2024-01-15T10:00:00.000Z'),
        notificationsCountToday: 3,
      });

      const response = await request(app).get('/api/notifications/preferences');

      expect(response.status).toBe(200);
      expect(response.body.notificationsEnabled).toBe(true);
      expect(response.body.notificationCooldownMinutes).toBe(120);
      expect(response.body.maxNotificationsPerDay).toBe(10);
      expect(response.body.hasPushToken).toBe(true);
      expect(response.body.lastPushSentAt).toBe('2024-01-15T10:00:00.000Z');
      expect(response.body.notificationsCountToday).toBe(3);
    });
  });
});
