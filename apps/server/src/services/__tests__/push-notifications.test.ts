import {
  isValidExpoPushToken,
  sendPushNotification,
  sendBatchNotifications,
  checkPushNotificationReceipts,
  logNotificationResults,
  getExpoClient,
  resetExpoClient,
} from '@/services/push-notifications';

// Mock expo-server-sdk
jest.mock('expo-server-sdk', () => {
  const mockExpo = {
    sendPushNotificationsAsync: jest.fn(),
    getPushNotificationReceiptsAsync: jest.fn(),
    chunkPushNotifications: jest.fn((messages: unknown[]) => [messages]),
    chunkPushNotificationReceiptIds: jest.fn((ids: string[]) => [ids]),
  };

  const MockExpo = jest.fn(() => mockExpo) as jest.Mock & {
    isExpoPushToken: jest.Mock;
  };
  MockExpo.isExpoPushToken = jest.fn(
    (token: string) =>
      typeof token === 'string' && token.startsWith('ExponentPushToken['),
  );

  return {
    __esModule: true,
    default: MockExpo,
  };
});

describe('Push Notifications Service', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockExpo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    resetExpoClient();
    // Get the mock instance
    mockExpo = getExpoClient();
  });

  describe('isValidExpoPushToken', () => {
    it('should return true for valid Expo push tokens', () => {
      expect(isValidExpoPushToken('ExponentPushToken[xxx]')).toBe(true);
      expect(isValidExpoPushToken('ExponentPushToken[abc123]')).toBe(true);
    });

    it('should return false for invalid tokens', () => {
      expect(isValidExpoPushToken('')).toBe(false);
      expect(isValidExpoPushToken('invalid-token')).toBe(false);
      expect(isValidExpoPushToken('FCM-token-123')).toBe(false);
    });
  });

  describe('sendPushNotification', () => {
    it('should send a notification successfully', async () => {
      mockExpo.sendPushNotificationsAsync.mockResolvedValue([
        { status: 'ok', id: 'ticket-123' },
      ]);

      const result = await sendPushNotification(
        'ExponentPushToken[xxx]',
        'Test Title',
        'Test Body',
        { key: 'value' },
      );

      expect(result.success).toBe(true);
      expect(result.ticketId).toBe('ticket-123');
      expect(result.pushToken).toBe('ExponentPushToken[xxx]');
    });

    it('should return error for invalid token', async () => {
      const result = await sendPushNotification(
        'invalid-token',
        'Test Title',
        'Test Body',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid Expo push token');
      expect(mockExpo.sendPushNotificationsAsync).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockExpo.sendPushNotificationsAsync.mockResolvedValue([
        { status: 'error', message: 'DeviceNotRegistered' },
      ]);

      const result = await sendPushNotification(
        'ExponentPushToken[xxx]',
        'Test Title',
        'Test Body',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('DeviceNotRegistered');
    });

    it('should handle exceptions', async () => {
      mockExpo.sendPushNotificationsAsync.mockRejectedValue(
        new Error('Network error'),
      );

      const result = await sendPushNotification(
        'ExponentPushToken[xxx]',
        'Test Title',
        'Test Body',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('sendBatchNotifications', () => {
    it('should send multiple notifications', async () => {
      mockExpo.sendPushNotificationsAsync.mockResolvedValue([
        { status: 'ok', id: 'ticket-1' },
        { status: 'ok', id: 'ticket-2' },
      ]);

      const notifications = [
        {
          pushToken: 'ExponentPushToken[aaa]',
          title: 'Title 1',
          body: 'Body 1',
        },
        {
          pushToken: 'ExponentPushToken[bbb]',
          title: 'Title 2',
          body: 'Body 2',
        },
      ];

      const results = await sendBatchNotifications(notifications);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should filter out invalid tokens', async () => {
      mockExpo.sendPushNotificationsAsync.mockResolvedValue([
        { status: 'ok', id: 'ticket-1' },
      ]);

      const notifications = [
        {
          pushToken: 'ExponentPushToken[aaa]',
          title: 'Title 1',
          body: 'Body 1',
        },
        { pushToken: 'invalid-token', title: 'Title 2', body: 'Body 2' },
      ];

      const results = await sendBatchNotifications(notifications);

      expect(results).toHaveLength(2);
      expect(
        results.find((r) => r.pushToken === 'invalid-token')?.success,
      ).toBe(false);
      expect(
        results.find((r) => r.pushToken === 'ExponentPushToken[aaa]')?.success,
      ).toBe(true);
    });

    it('should return empty array for empty input', async () => {
      const results = await sendBatchNotifications([]);
      expect(results).toEqual([]);
    });

    it('should handle mixed success and failure', async () => {
      mockExpo.sendPushNotificationsAsync.mockResolvedValue([
        { status: 'ok', id: 'ticket-1' },
        { status: 'error', message: 'DeviceNotRegistered' },
      ]);

      const notifications = [
        {
          pushToken: 'ExponentPushToken[aaa]',
          title: 'Title 1',
          body: 'Body 1',
        },
        {
          pushToken: 'ExponentPushToken[bbb]',
          title: 'Title 2',
          body: 'Body 2',
        },
      ];

      const results = await sendBatchNotifications(notifications);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('DeviceNotRegistered');
    });
  });

  describe('checkPushNotificationReceipts', () => {
    it('should check receipts successfully', async () => {
      mockExpo.getPushNotificationReceiptsAsync.mockResolvedValue({
        'receipt-1': { status: 'ok' },
        'receipt-2': { status: 'ok' },
      });

      const results = await checkPushNotificationReceipts([
        'receipt-1',
        'receipt-2',
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('ok');
      expect(results[1].status).toBe('ok');
    });

    it('should handle DeviceNotRegistered errors', async () => {
      mockExpo.getPushNotificationReceiptsAsync.mockResolvedValue({
        'receipt-1': {
          status: 'error',
          message: 'Device not registered',
          details: { error: 'DeviceNotRegistered' },
        },
      });

      const results = await checkPushNotificationReceipts(['receipt-1']);

      expect(results[0].status).toBe('error');
      expect(results[0].shouldRemoveToken).toBe(true);
    });

    it('should return empty array for empty input', async () => {
      const results = await checkPushNotificationReceipts([]);
      expect(results).toEqual([]);
    });

    it('should handle missing receipts', async () => {
      mockExpo.getPushNotificationReceiptsAsync.mockResolvedValue({});

      const results = await checkPushNotificationReceipts(['receipt-1']);

      expect(results[0].status).toBe('error');
      expect(results[0].error).toBe('Receipt not found');
    });
  });

  describe('logNotificationResults', () => {
    it('should log results without throwing', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const results = [
        { pushToken: 'token-1', success: true, ticketId: 'ticket-1' },
        { pushToken: 'token-2', success: false, error: 'Failed' },
      ];

      expect(() => logNotificationResults(results)).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 successful, 1 failed'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send to token-2'),
      );

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
