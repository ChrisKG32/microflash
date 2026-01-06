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
      const cron = require('node-cron');

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
      const cron = require('node-cron');

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
