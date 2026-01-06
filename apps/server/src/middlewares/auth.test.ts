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

// Mock @clerk/express before importing our auth module
const mockGetAuth = jest.fn();
jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) =>
    next(),
  getAuth: mockGetAuth,
}));

// Mock the prisma module
jest.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

// Import after mocks are set up
import { requireAuth, requireUser } from '@/middlewares/auth';
import { errorHandler } from '@/middlewares/error-handler';

// Helper to create test app for requireAuth
function createRequireAuthTestApp(): Express {
  const app = express();
  app.use(express.json());

  // Protected route using requireAuth
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ message: 'success', userId: mockGetAuth(req).userId });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

// Helper to create test app for requireUser
function createRequireUserTestApp(): Express {
  const app = express();
  app.use(express.json());

  // Protected route using requireUser
  app.get('/protected', requireUser, (req: Request, res: Response) => {
    res.json({
      message: 'success',
      user: {
        id: req.user!.id,
        clerkId: req.user!.clerkId,
      },
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

describe('Auth Middleware - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReset(prismaMock);
  });

  describe('requireAuth', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null });

      const app = createRequireAuthTestApp();
      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should return 401 when userId is undefined', async () => {
      mockGetAuth.mockReturnValue({ userId: undefined });

      const app = createRequireAuthTestApp();
      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should allow request when user is authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: 'user_123' });

      const app = createRequireAuthTestApp();
      const response = await request(app).get('/protected');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('success');
      expect(response.body.userId).toBe('user_123');
    });

    it('should call next() for authenticated users', async () => {
      mockGetAuth.mockReturnValue({ userId: 'user_456' });

      const app = createRequireAuthTestApp();
      const response = await request(app).get('/protected');

      expect(response.status).toBe(200);
      expect(mockGetAuth).toHaveBeenCalled();
    });
  });

  describe('requireUser', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null });

      const app = createRequireUserTestApp();
      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should return 401 when userId is undefined', async () => {
      mockGetAuth.mockReturnValue({ userId: undefined });

      const app = createRequireUserTestApp();
      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when user not found in database', async () => {
      mockGetAuth.mockReturnValue({ userId: 'clerk_123' });
      prismaMock.user.findUnique.mockResolvedValue(null);

      const app = createRequireUserTestApp();
      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('User not found');
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'clerk_123' },
      });
    });

    it('should attach user to request when found', async () => {
      const mockUser = {
        id: 'user-internal-id',
        clerkId: 'clerk_123',
        pushToken: null,
        notificationsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetAuth.mockReturnValue({ userId: 'clerk_123' });
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const app = createRequireUserTestApp();
      const response = await request(app).get('/protected');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('success');
      expect(response.body.user.id).toBe('user-internal-id');
      expect(response.body.user.clerkId).toBe('clerk_123');
    });

    it('should call prisma with correct clerkId', async () => {
      const mockUser = {
        id: 'user-internal-id',
        clerkId: 'clerk_456',
        pushToken: null,
        notificationsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetAuth.mockReturnValue({ userId: 'clerk_456' });
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const app = createRequireUserTestApp();
      await request(app).get('/protected');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'clerk_456' },
      });
    });

    it('should return 500 on database error', async () => {
      mockGetAuth.mockReturnValue({ userId: 'clerk_123' });
      prismaMock.user.findUnique.mockRejectedValue(new Error('Database error'));

      const app = createRequireUserTestApp();
      const response = await request(app).get('/protected');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
