import {
  startScheduler,
  stopScheduler,
  isSchedulerRunning,
} from '@/services/scheduler';

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

// Mock notification orchestrator
jest.mock('@/services/notification-orchestrator', () => ({
  sendDueCardNotifications: jest.fn().mockResolvedValue({
    totalCardsFound: 0,
    totalUsersNotified: 0,
    totalNotificationsSent: 0,
    successfulNotifications: 0,
    failedNotifications: 0,
    cardsMarkedAsNotified: 0,
  }),
}));

// Import cron for type-safe access in tests
import * as cron from 'node-cron';

describe('Scheduler Service', () => {
  beforeEach(() => {
    // Reset scheduler state between tests
    stopScheduler();
    jest.clearAllMocks();
  });

  afterAll(() => {
    stopScheduler();
  });

  describe('startScheduler', () => {
    it('should start the scheduler', () => {
      startScheduler();

      expect(cron.schedule).toHaveBeenCalledWith(
        '*/15 * * * *',
        expect.any(Function),
        expect.objectContaining({
          scheduled: true,
          timezone: 'UTC',
        }),
      );
      expect(isSchedulerRunning()).toBe(true);
    });

    it('should not start multiple schedulers', () => {
      startScheduler();
      startScheduler();

      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopScheduler', () => {
    it('should stop the scheduler', () => {
      startScheduler();
      expect(isSchedulerRunning()).toBe(true);

      stopScheduler();
      expect(isSchedulerRunning()).toBe(false);
    });

    it('should handle stopping when not running', () => {
      expect(isSchedulerRunning()).toBe(false);
      stopScheduler(); // Should not throw
      expect(isSchedulerRunning()).toBe(false);
    });
  });

  describe('isSchedulerRunning', () => {
    it('should return false initially', () => {
      expect(isSchedulerRunning()).toBe(false);
    });

    it('should return true after starting', () => {
      startScheduler();
      expect(isSchedulerRunning()).toBe(true);
    });

    it('should return false after stopping', () => {
      startScheduler();
      stopScheduler();
      expect(isSchedulerRunning()).toBe(false);
    });
  });
});
