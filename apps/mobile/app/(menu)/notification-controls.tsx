/**
 * Notification Controls Screen
 *
 * Allows users to configure notification preferences:
 * - Toggle notifications on/off
 * - Set cooldown (min 2h)
 * - Set max notifications per day
 * - Show permission-denied guidance + "Open Settings" link
 */

import { useState, useEffect, useCallback } from 'react';
import { Linking, Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { Box } from '@/components/ui/box';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAppToast } from '@/components/feedback/use-app-toast';
import { useConfirm } from '@/components/feedback/use-confirm';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  createDevTestSprintNotification,
  ApiError,
  type NotificationPreferences,
} from '@/lib/api';

export default function NotificationControlsScreen() {
  const notify = useAppToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOSPermission, setHasOSPermission] = useState<boolean | null>(null);
  const [schedulingTest, setSchedulingTest] = useState(false);

  // Form state
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [cooldownMinutes, setCooldownMinutes] = useState('120');
  const [maxPerDay, setMaxPerDay] = useState('10');

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

  const fetchPreferences = useCallback(async () => {
    try {
      setError(null);
      const data = await getNotificationPreferences();
      setPrefs(data);
      setNotificationsEnabled(data.notificationsEnabled);
      setCooldownMinutes(String(data.notificationCooldownMinutes));
      setMaxPerDay(String(data.maxNotificationsPerDay));
      setHasChanges(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load preferences',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const checkOSPermission = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setHasOSPermission(status === 'granted');
  }, []);

  useEffect(() => {
    fetchPreferences();
    checkOSPermission();
  }, [fetchPreferences, checkOSPermission]);

  const handleToggleNotifications = (value: boolean) => {
    setNotificationsEnabled(value);
    setHasChanges(true);
  };

  const handleCooldownChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setCooldownMinutes(numericValue);
    setHasChanges(true);
  };

  const handleMaxPerDayChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setMaxPerDay(numericValue);
    setHasChanges(true);
  };

  const validateAndSave = async () => {
    // Validate cooldown
    const cooldown = parseInt(cooldownMinutes, 10);
    if (isNaN(cooldown) || cooldown < 120) {
      notify.error(
        'Invalid Cooldown',
        'Cooldown must be at least 120 minutes (2 hours)',
      );
      return;
    }
    if (cooldown > 1440) {
      notify.error(
        'Invalid Cooldown',
        'Cooldown cannot exceed 1440 minutes (24 hours)',
      );
      return;
    }

    // Validate max per day
    const maxDay = parseInt(maxPerDay, 10);
    if (isNaN(maxDay) || maxDay < 1) {
      notify.error('Invalid Max Per Day', 'Must be at least 1');
      return;
    }
    if (maxDay > 50) {
      notify.error('Invalid Max Per Day', 'Cannot exceed 50');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await updateNotificationPreferences({
        notificationsEnabled,
        notificationCooldownMinutes: cooldown,
        maxNotificationsPerDay: maxDay,
      });

      setPrefs(result.prefs);
      setHasChanges(false);
      notify.success('Saved', 'Notification preferences updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setHasOSPermission(status === 'granted');
  };

  /**
   * Schedule a test sprint notification for 30 seconds from now.
   * Only available in __DEV__ builds.
   */
  const scheduleTestNotification = async () => {
    setSchedulingTest(true);
    setError(null);

    try {
      // Ensure we have notification permission
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        notify.error(
          'Permission Required',
          'Please enable notifications to test this feature.',
        );
        setHasOSPermission(false);
        return;
      }

      setHasOSPermission(true);

      // Ensure Android notification channel exists
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Create a PENDING sprint on the server and get the notification payload
      const { sprintId, cardCount, notification } =
        await createDevTestSprintNotification();

      // Schedule a local notification for 30 seconds from now
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          sound: 'default',
          data: notification.data,
          // iOS: use categoryIdentifier for interactive actions
          categoryIdentifier: notification.categoryId,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 30,
          // Android: use the default channel
          ...(Platform.OS === 'android' && { channelId: 'default' }),
        },
      });

      // The original Alert had OK at index 0 and "Cancel Notification" marked
      // destructive, i.e. the affordances were inverted. Here the CONFIRM
      // action is the destructive one (cancel the pending notification) and
      // dismissing leaves it scheduled, which is the correct reading.
      const cancelIt = await confirm({
        title: 'Test Notification Scheduled',
        body: `A sprint notification with ${cardCount} card${cardCount === 1 ? '' : 's'} will appear in 30 seconds.\n\nSprint ID: ${sprintId}\nNotification ID: ${notificationId}`,
        confirmText: 'Cancel Notification',
        cancelText: 'OK',
        action: 'negative',
      });
      if (cancelIt) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        notify.info('Cancelled', 'Test notification cancelled.');
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NO_ELIGIBLE_CARDS') {
        notify.info(
          'No Cards Due',
          'Create some cards first, then try again. Cards need to be due for review to create a test sprint.',
        );
      } else {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to schedule notification';
        setError(message);
        notify.error('Error', message);
      }
    } finally {
      setSchedulingTest(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Notification Controls' }} />
        <Center className="flex-1 bg-background-50">
          <Spinner size="large" className="text-primary-500" />
          <Text size="sm" className="mt-3 text-typography-500">
            Loading...
          </Text>
        </Center>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Notification Controls' }} />
      <ScrollView
        className="flex-1 bg-background-50"
        contentContainerClassName="p-4 pb-8"
      >
        {/* OS Permission Section */}
        {hasOSPermission === false && (
          <VStack className="mb-4 rounded-xl bg-background-warning p-4">
            <Text size="md" className="mb-1 font-semibold text-warning-700">
              Notifications Disabled
            </Text>
            <Text size="sm" className="mb-3 text-warning-700">
              Push notifications are disabled at the system level. Enable them
              in your device settings to receive review reminders.
            </Text>
            <Button
              action="primary"
              className="mb-2"
              onPress={openSettings}
              testID="open-settings-button"
            >
              <ButtonText>Open Settings</ButtonText>
            </Button>
            <Button
              variant="outline"
              action="secondary"
              onPress={requestPermission}
              testID="request-permission-button"
            >
              <ButtonText>Request Permission</ButtonText>
            </Button>
          </VStack>
        )}

        {/* Error Display */}
        {error && (
          <Box className="mb-4 rounded-xl bg-background-error p-4">
            <Text size="sm" className="text-error-700">
              {error}
            </Text>
          </Box>
        )}

        {/* Main Controls Section */}
        <VStack className="mb-4 rounded-xl bg-background-0 p-4">
          <Heading size="md" className="mb-3">
            Notification Settings
          </Heading>

          {/* Enable/Disable Toggle */}
          <HStack className="items-center justify-between py-2">
            <VStack className="flex-1 pr-4">
              <Text size="md">Enable Notifications</Text>
              <Text size="xs" className="text-typography-500">
                Receive push reminders when cards are due
              </Text>
            </VStack>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              testID="notifications-switch"
            />
          </HStack>

          {/* Cooldown Input */}
          <HStack className="items-center justify-between py-2">
            <VStack className="flex-1 pr-4">
              <Text size="md">Cooldown (minutes)</Text>
              <Text size="xs" className="text-typography-500">
                Minimum time between notifications (120-1440)
              </Text>
            </VStack>
            <Input variant="outline" className="w-24">
              <InputField
                value={cooldownMinutes}
                onChangeText={handleCooldownChange}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="120"
                testID="cooldown-input"
              />
            </Input>
          </HStack>

          {/* Max Per Day Input */}
          <HStack className="items-center justify-between py-2">
            <VStack className="flex-1 pr-4">
              <Text size="md">Max Per Day</Text>
              <Text size="xs" className="text-typography-500">
                Maximum notifications per day (1-50)
              </Text>
            </VStack>
            <Input variant="outline" className="w-24">
              <InputField
                value={maxPerDay}
                onChangeText={handleMaxPerDayChange}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="10"
                testID="max-per-day-input"
              />
            </Input>
          </HStack>
        </VStack>

        {/* Status Section */}
        {prefs && (
          <VStack className="mb-4 rounded-xl bg-background-0 p-4">
            <Heading size="md" className="mb-3">
              Status
            </Heading>

            <HStack className="items-center justify-between py-2">
              <Text size="sm" className="text-typography-500">
                Push Token
              </Text>
              <Text
                size="sm"
                className={
                  prefs.hasPushToken
                    ? 'font-medium text-success-700'
                    : 'font-medium text-error-700'
                }
              >
                {prefs.hasPushToken ? 'Registered' : 'Not registered'}
              </Text>
            </HStack>

            <HStack className="items-center justify-between py-2">
              <Text size="sm" className="text-typography-500">
                Notifications Today
              </Text>
              <Text size="sm" className="font-medium">
                {prefs.notificationsCountToday} / {prefs.maxNotificationsPerDay}
              </Text>
            </HStack>

            {prefs.lastPushSentAt && (
              <HStack className="items-center justify-between py-2">
                <Text size="sm" className="text-typography-500">
                  Last Notification
                </Text>
                <Text size="sm" className="font-medium">
                  {new Date(prefs.lastPushSentAt).toLocaleString()}
                </Text>
              </HStack>
            )}
          </VStack>
        )}

        {/* Dev Testing Section - only in __DEV__ builds */}
        {__DEV__ && (
          <VStack className="mb-4 rounded-xl bg-background-0 p-4">
            <Heading size="md" className="mb-3">
              Dev Testing
            </Heading>
            <Text size="xs" className="mb-3 text-typography-500">
              Test the notification flow by scheduling a local notification that
              mimics a real push notification.
            </Text>
            {/* warning-500 is amber-9; white on it is 1.6:1, so this is a
                tinted button rather than a solid one. */}
            <Button
              variant="outline"
              action="secondary"
              className="border-warning-500"
              onPress={scheduleTestNotification}
              isDisabled={schedulingTest}
              testID="test-notification-button"
            >
              {schedulingTest ? (
                <ButtonSpinner className="text-warning-700" />
              ) : (
                <ButtonText className="text-warning-700">
                  Test Sprint Notification (30s)
                </ButtonText>
              )}
            </Button>
            <Text size="xs" className="mt-2 text-typography-500">
              Creates a real PENDING sprint on the server, then schedules a
              local notification for 30 seconds. Tap the notification to test
              navigation and the &quot;Snooze 1h&quot; action.
            </Text>
          </VStack>
        )}

        {/* Save Button */}
        <Button
          size="xl"
          action="primary"
          className="rounded-xl"
          onPress={validateAndSave}
          isDisabled={!hasChanges || saving}
          testID="save-button"
        >
          {saving ? (
            <ButtonSpinner className="text-typography-0" />
          ) : (
            <ButtonText>
              {hasChanges ? 'Save Changes' : 'No Changes'}
            </ButtonText>
          )}
        </Button>
      </ScrollView>
      <ConfirmDialog />
    </>
  );
}
