/**
 * Hook for managing push notifications.
 *
 * Handles:
 * - Permission requests
 * - Notification handlers (received + response)
 * - Local notification scheduling (for testing)
 * - Push token retrieval (for real device use)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationState {
  /** Whether we have notification permission */
  hasPermission: boolean;
  /** The Expo push token (only available on real devices) */
  expoPushToken: string | null;
  /** Whether we're on a physical device (required for remote push) */
  isDevice: boolean;
  /** Last received notification */
  lastNotification: Notifications.Notification | null;
  /** Last notification response (user tapped notification) */
  lastResponse: Notifications.NotificationResponse | null;
  /** Whether permission check is in progress */
  isLoading: boolean;
  /** Any error that occurred */
  error: string | null;
}

export interface UseNotificationsReturn extends NotificationState {
  /** Request notification permissions */
  requestPermissions: () => Promise<boolean>;
  /** Schedule a local notification (for testing) */
  scheduleLocalNotification: (
    title: string,
    body: string,
    delaySeconds?: number,
    options?: {
      categoryIdentifier?: string;
      data?: Record<string, unknown>;
    },
  ) => Promise<string>;
  /** Cancel a scheduled notification */
  cancelNotification: (identifier: string) => Promise<void>;
  /** Cancel all scheduled notifications */
  cancelAllNotifications: () => Promise<void>;
}

/**
 * Hook for managing notifications.
 *
 * Usage:
 * ```tsx
 * const { hasPermission, requestPermissions, scheduleLocalNotification } = useNotifications();
 *
 * // Request permissions on mount or user action
 * await requestPermissions();
 *
 * // Schedule a test notification
 * await scheduleLocalNotification('Test', 'This is a test notification', 5);
 * ```
 */
export function useNotifications(): UseNotificationsReturn {
  const [state, setState] = useState<NotificationState>({
    hasPermission: false,
    expoPushToken: null,
    isDevice: Device.isDevice,
    lastNotification: null,
    lastResponse: null,
    isLoading: true,
    error: null,
  });

  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Check current permission status on mount
  useEffect(() => {
    checkPermissions();
    setupListeners();

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const checkPermissions = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const hasPermission = status === 'granted';

      setState((prev) => ({
        ...prev,
        hasPermission,
        isLoading: false,
      }));

      // If we have permission and are on a real device, try to get push token
      if (hasPermission && Device.isDevice) {
        await getPushToken();
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check permissions',
      }));
    }
  };

  const setupListeners = () => {
    // Listen for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('[Notifications] Received:', notification);
        setState((prev) => ({
          ...prev,
          lastNotification: notification,
        }));
      });

    // Listen for user interactions with notifications
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('[Notifications] Response:', response);
        setState((prev) => ({
          ...prev,
          lastResponse: response,
        }));

        // Handle navigation based on notification data
        const data = response.notification.request.content.data;
        if (data?.cardId) {
          // TODO: Navigate to card review screen
          console.log('[Notifications] Should navigate to card:', data.cardId);
        }
      });
  };

  const getPushToken = async (): Promise<string | null> => {
    if (!Device.isDevice) {
      console.log(
        '[Notifications] Push tokens only available on physical devices',
      );
      return null;
    }

    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        console.warn('[Notifications] No EAS project ID found');
        return null;
      }

      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      console.log('[Notifications] Push token:', token);
      setState((prev) => ({
        ...prev,
        expoPushToken: token,
      }));

      return token;
    } catch (error) {
      console.error('[Notifications] Failed to get push token:', error);
      return null;
    }
  };

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      // On Android, we need to set up notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      const hasPermission = finalStatus === 'granted';

      setState((prev) => ({
        ...prev,
        hasPermission,
        error: hasPermission ? null : 'Permission not granted',
      }));

      // If granted and on real device, get push token
      if (hasPermission && Device.isDevice) {
        await getPushToken();
      }

      return hasPermission;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to request permissions';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  const scheduleLocalNotification = useCallback(
    async (
      title: string,
      body: string,
      delaySeconds: number = 5,
      options?: {
        categoryIdentifier?: string;
        data?: Record<string, unknown>;
      },
    ): Promise<string> => {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: options?.data ?? { type: 'test', timestamp: Date.now() },
          categoryIdentifier: options?.categoryIdentifier,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds,
        },
      });

      console.log(
        `[Notifications] Scheduled local notification: ${identifier} (in ${delaySeconds}s)`,
      );
      return identifier;
    },
    [],
  );

  const cancelNotification = useCallback(
    async (identifier: string): Promise<void> => {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log(`[Notifications] Cancelled notification: ${identifier}`);
    },
    [],
  );

  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] Cancelled all scheduled notifications');
  }, []);

  return {
    ...state,
    requestPermissions,
    scheduleLocalNotification,
    cancelNotification,
    cancelAllNotifications,
  };
}
