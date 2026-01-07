import request from 'supertest';
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';

// Mock user to attach to req.user
const mockUser = {
  id: 'user-internal-id',
  clerkId: 'clerk-user-123',
  pushToken: 'ExponentPushToken[test]',
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
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

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
          message: 'Authentication required',
        },
      });
    }
  },
}));

// Import after mocks are set up
import meRouter from '@/routes/me';
import { errorHandler } from '@/middlewares/error-handler';

// Helper to create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/me', meRouter);
  app.use(errorHandler);
  return app;
}

const app = createTestApp();

describe('Me Routes - Unit Tests', () => {
  beforeEach(() => {
    shouldAttachUser = true;
  });

  describe('GET /api/me', () => {
    it('should return 401 when not authenticated', async () => {
      shouldAttachUser = false;

      const response = await request(app).get('/api/me');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return current user info when authenticated', async () => {
      const response = await request(app).get('/api/me');

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('id', 'user-internal-id');
      expect(response.body.user).toHaveProperty('clerkId', 'clerk-user-123');
      expect(response.body.user).toHaveProperty('notificationsEnabled', true);
      expect(response.body.user).toHaveProperty('hasPushToken', true);
      expect(response.body.user).toHaveProperty('createdAt');
    });

    it('should return hasPushToken false when no push token', async () => {
      // Temporarily modify mock user
      const originalPushToken = mockUser.pushToken;
      mockUser.pushToken = null as unknown as string;

      const response = await request(app).get('/api/me');

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('hasPushToken', false);

      // Restore
      mockUser.pushToken = originalPushToken;
    });
  });
});
