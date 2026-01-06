import request from 'supertest';
import express from 'express';
import notificationsRouter from './notifications.js';

// Create a test app with the router
const app = express();
app.use(express.json());
app.use('/api/notifications', notificationsRouter);

// Add 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

describe('Notifications Routes - Unit Tests', () => {
  describe('POST /api/notifications/register', () => {
    it('should return 200 for register push token (stub)', async () => {
      const response = await request(app)
        .post('/api/notifications/register')
        .send({ pushToken: 'ExponentPushToken[xxx]' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/notifications/:id/snooze', () => {
    it('should return 200 for snooze notification (stub)', async () => {
      const response = await request(app)
        .post('/api/notifications/notif-123/snooze')
        .send({ duration: 30 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/notifications/preferences', () => {
    it('should return 200 for update preferences (stub)', async () => {
      const response = await request(app)
        .patch('/api/notifications/preferences')
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });
});
