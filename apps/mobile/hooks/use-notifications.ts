/**
 * Notification permission + push-token registration.
 *
 * Scope is deliberately narrow. The app's notification *bootstrap* — the
 * foreground handler, the iOS category with its Review/Snooze actions, and the
 * response listener that routes a tap into a sprint — lives in
 * app/_layout.tsx, which is guaranteed to run before any screen mounts. This
 * hook used to duplicate the handler and the response listener, so a tap was
 * observed twice and the two handlers could disagree; it also exported a
 * schedule/cancel API that nothing ever called.
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registerPushToken } from '@/lib/api';

/**
 * The Android notification channel every notification path needs.
 *
 * One owner: this was declared twice with *different* importance (MAX here,
 * HIGH in the notification-controls dev tester), and on Android the first
 * caller to run wins — so which one applied depended on navigation order.
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    // Android LED colour (ARGB), not a theme color — it never renders in-app.
    lightColor: '#FF231F7C',
  });
}

export interface NotificationState {
  /** Whether we have notification permission */
  hasPermission: boolean;
  /** The Expo push token (only available on real devices) */
  expoPushToken: string | null;
  /** Whether we're on a physical device (required for remote push) */
  isDevice: boolean;
  /** Whether permission check is in progress */
  isLoading: boolean;
  /** Any error that occurred */
  error: string | null;
}

export interface UseNotificationsReturn extends NotificationState {
  /** Request notification permissions, creating the Android channel first. */
  requestPermissions: () => Promise<boolean>;
  /** Re-read the OS permission status (e.g. after returning from Settings). */
  refreshPermission: () => Promise<void>;
}

async function getPushToken(): Promise<string | null> {
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

    try {
      await registerPushToken(token);
    } catch (error) {
      console.error('[Notifications] Failed to register token:', error);
      // Don't fail the overall operation - token is still valid locally
    }

    return token;
  } catch (error) {
    console.error('[Notifications] Failed to get push token:', error);
    return null;
  }
}

export function useNotifications(): UseNotificationsReturn {
  const [state, setState] = useState<NotificationState>({
    hasPermission: false,
    expoPushToken: null,
    isDevice: Device.isDevice,
    isLoading: true,
    error: null,
  });

  const refreshPermission = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const hasPermission = status === 'granted';
      const token = hasPermission ? await getPushToken() : null;

      setState((prev) => ({
        ...prev,
        hasPermission,
        expoPushToken: token ?? prev.expoPushToken,
        isLoading: false,
      }));
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
  }, []);

  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      await ensureAndroidChannel();

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      const finalStatus =
        existingStatus === 'granted'
          ? existingStatus
          : (await Notifications.requestPermissionsAsync()).status;

      const hasPermission = finalStatus === 'granted';
      const token = hasPermission ? await getPushToken() : null;

      setState((prev) => ({
        ...prev,
        hasPermission,
        expoPushToken: token ?? prev.expoPushToken,
        error: hasPermission ? null : 'Permission not granted',
      }));

      return hasPermission;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to request permissions';
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  return { ...state, requestPermissions, refreshPermission };
}
