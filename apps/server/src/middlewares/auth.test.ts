import request from 'supertest';
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';

// Mock @clerk/express before importing our auth module
const mockGetAuth = jest.fn();
jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) =>
    next(),
  getAuth: mockGetAuth,
}));

// Import after mock is set up
import { requireAuth } from '@/middlewares/auth';

// Helper to create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());

  // Protected route using requireAuth
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ message: 'success', userId: mockGetAuth(req).userId });
  });

  return app;
}

describe('Auth Middleware - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null });

      const app = createTestApp();
      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should return 401 when userId is undefined', async () => {
      mockGetAuth.mockReturnValue({ userId: undefined });

      const app = createTestApp();
      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should allow request when user is authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: 'user_123' });

      const app = createTestApp();
      const response = await request(app).get('/protected');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('success');
      expect(response.body.userId).toBe('user_123');
    });

    it('should call next() for authenticated users', async () => {
      mockGetAuth.mockReturnValue({ userId: 'user_456' });

      const app = createTestApp();
      const response = await request(app).get('/protected');

      expect(response.status).toBe(200);
      expect(mockGetAuth).toHaveBeenCalled();
    });
  });
});
