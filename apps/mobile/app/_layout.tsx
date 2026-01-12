import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { abandonSprint, getMe } from '@/lib/api';

export const unstable_settings = {
  initialRouteName: '(tabs)',
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
      // For cold start: ensure we're on Review Home first, then push sprint
      // This creates the proper stack: MainTabs(Review) → Sprint Review
      router.replace('/(tabs)/review');
      // Use setTimeout to ensure replace completes before push
      setTimeout(() => {
        router.push({
          pathname: '/sprint/[id]',
          params: {
            id: data.sprintId,
            returnTo: '/(tabs)/review',
            launchSource: 'PUSH',
          },
        });
      }, 100);
    } else if (data.url) {
      router.push(data.url as any);
    } else {
      // Fallback to Home
      router.push('/(tabs)/review');
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

/**
 * Auth + Onboarding Gate
 *
 * Handles routing based on auth state and onboarding completion:
 * - Unauthenticated → (public)/welcome
 * - Authenticated but onboarding incomplete → onboarding/*
 * - Authenticated and onboarding complete → (tabs) (Review Home)
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  const checkAuthStatus = useCallback(async () => {
    try {
      const { user } = await getMe();

      // User is authenticated
      if (!user.onboardingComplete && !segments[0]?.includes('onboarding')) {
        // Onboarding incomplete → redirect to onboarding
        router.replace('/onboarding/notifications');
      }
      // If onboarding complete, let them access (tabs)
    } catch (error) {
      console.error('[AuthGate] Failed to check auth status:', error);
      // Auth failed (401 or network error) → redirect to public welcome
      // For now, we'll assume onboarding incomplete as a fallback
      // TODO: When Clerk is integrated, distinguish between 401 and other errors
      if (!segments[0]?.includes('onboarding')) {
        router.replace('/onboarding/notifications');
      }
    } finally {
      setLoading(false);
      setChecked(true);
    }
  }, [segments]);

  useEffect(() => {
    if (!checked) {
      checkAuthStatus();
    }
  }, [checkAuthStatus, checked]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196f3" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Set up notification handling
  useNotificationObserver();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthGate>
        <Stack>
          {/* Main Tabs (Review + Library) */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Menu Stack (Settings, Profile, Stats, etc.) */}
          <Stack.Screen name="(menu)" options={{ headerShown: false }} />

          {/* Public Stack (Welcome, Sign In) */}
          <Stack.Screen name="(public)" options={{ headerShown: false }} />

          {/* Onboarding Flow */}
          <Stack.Screen
            name="onboarding/notifications"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding/setup"
            options={{ headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="onboarding/create-deck"
            options={{ headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="onboarding/create-card"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding/fixture-sprint"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding/finish"
            options={{ headerShown: false }}
          />

          {/* Sprint Screens (Root-level, tab-agnostic) */}
          <Stack.Screen
            name="sprint/[id]"
            options={{ headerBackTitle: 'Back', title: 'Sprint Review' }}
          />
          <Stack.Screen
            name="sprint/complete"
            options={{ headerShown: false, title: 'Sprint Complete' }}
          />

          {/* Other Root-level Screens */}
          <Stack.Screen name="browse" options={{ title: 'Review Ahead' }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', title: 'Modal' }}
          />
        </Stack>
      </AuthGate>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
