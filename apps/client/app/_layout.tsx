import { useEffect, useRef } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { abandonSprint } from '@/lib/api';

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * iOS notification category ID for sprint notifications.
 * Must match the category registered on the server.
 */
const NOTIFICATION_CATEGORY_ID = 'due_cards';

/**
 * Action identifiers for notification buttons.
 */
const ACTION_REVIEW_NOW = 'review_now';
const ACTION_SNOOZE_60 = 'snooze_60';

/**
 * Configure how notifications are handled when app is in foreground.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register iOS notification category with action buttons.
 * This must be called at app startup.
 */
async function registerNotificationCategories() {
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY_ID, [
    {
      identifier: ACTION_REVIEW_NOW,
      buttonTitle: 'Review Now',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: ACTION_SNOOZE_60,
      buttonTitle: 'Snooze 1h',
      options: {
        opensAppToForeground: true,
      },
    },
  ]);
}

/**
 * Handle notification response (user tapped notification or action button).
 * Sprint-based: notifications contain sprintId, not cardIds.
 */
async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
) {
  const { actionIdentifier, notification } = response;
  const data = notification.request.content.data as {
    type?: string;
    sprintId?: string;
    url?: string;
    cardCount?: number;
  };

  console.log('[Notifications] Response received:', {
    actionIdentifier,
    data,
  });

  // Handle snooze action - abandons the sprint and snoozes remaining cards
  if (actionIdentifier === ACTION_SNOOZE_60) {
    if (data.sprintId) {
      try {
        await abandonSprint(data.sprintId);
        console.log('[Notifications] Abandoned sprint:', data.sprintId);
      } catch (error) {
        console.error('[Notifications] Failed to abandon sprint:', error);
      }
    }
    return;
  }

  // Handle review action or default tap - navigate to sprint
  if (
    actionIdentifier === ACTION_REVIEW_NOW ||
    actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
  ) {
    if (data.sprintId) {
      // Navigate to sprint with return params for proper back navigation
      router.push({
        pathname: '/sprint/[id]',
        params: {
          id: data.sprintId,
          returnTo: '/',
          launchSource: 'PUSH',
        },
      });
    } else if (data.url) {
      router.push(data.url as any);
    } else {
      // Fallback to Home
      router.push('/');
    }
  }
}

/**
 * Hook to set up notification response handling.
 */
function useNotificationObserver() {
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Register notification categories on mount
    registerNotificationCategories();

    // Check if app was launched from a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationResponse(response);
      }
    });

    // Listen for notification responses while app is running
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationResponse(response);
      });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Set up notification handling
  useNotificationObserver();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="deck/[id]" options={{ headerBackTitle: 'Decks' }} />
        <Stack.Screen
          name="sprint/[id]"
          options={{ headerBackTitle: 'Back', title: 'Sprint Review' }}
        />
        <Stack.Screen
          name="sprint/complete"
          options={{ headerShown: false, title: 'Sprint Complete' }}
        />
        <Stack.Screen
          name="notification-controls"
          options={{ title: 'Notification Controls' }}
        />
        <Stack.Screen name="browse" options={{ title: 'Review Ahead' }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: 'Modal' }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
