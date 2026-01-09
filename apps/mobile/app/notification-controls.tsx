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
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  createDevTestSprintNotification,
  ApiError,
  type NotificationPreferences,
} from '@/lib/api';

export default function NotificationControlsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

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
      Alert.alert(
        'Invalid Cooldown',
        'Cooldown must be at least 120 minutes (2 hours)',
      );
      return;
    }
    if (cooldown > 1440) {
      Alert.alert(
        'Invalid Cooldown',
        'Cooldown cannot exceed 1440 minutes (24 hours)',
      );
      return;
    }

    // Validate max per day
    const maxDay = parseInt(maxPerDay, 10);
    if (isNaN(maxDay) || maxDay < 1) {
      Alert.alert('Invalid Max Per Day', 'Must be at least 1');
      return;
    }
    if (maxDay > 50) {
      Alert.alert('Invalid Max Per Day', 'Cannot exceed 50');
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
      Alert.alert('Saved', 'Notification preferences updated');
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
        Alert.alert(
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

      Alert.alert(
        'Test Notification Scheduled',
        `A sprint notification with ${cardCount} card${cardCount === 1 ? '' : 's'} will appear in 30 seconds.\n\nSprint ID: ${sprintId}\nNotification ID: ${notificationId}`,
        [
          { text: 'OK' },
          {
            text: 'Cancel Notification',
            style: 'destructive',
            onPress: () => {
              Notifications.cancelScheduledNotificationAsync(notificationId);
              Alert.alert('Cancelled', 'Test notification cancelled.');
            },
          },
        ],
      );
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NO_ELIGIBLE_CARDS') {
        Alert.alert(
          'No Cards Due',
          'Create some cards first, then try again. Cards need to be due for review to create a test sprint.',
        );
      } else {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to schedule notification';
        setError(message);
        Alert.alert('Error', message);
      }
    } finally {
      setSchedulingTest(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Notification Controls' }} />
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading...
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Notification Controls' }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* OS Permission Section */}
        {hasOSPermission === false && (
          <View style={[styles.warningSection, { backgroundColor: '#FFF3CD' }]}>
            <Text style={styles.warningTitle}>Notifications Disabled</Text>
            <Text style={styles.warningText}>
              Push notifications are disabled at the system level. Enable them
              in your device settings to receive review reminders.
            </Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={openSettings}
            >
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingsButton, styles.secondaryButton]}
              onPress={requestPermission}
            >
              <Text
                style={[styles.settingsButtonText, styles.secondaryButtonText]}
              >
                Request Permission
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={[styles.errorSection, { backgroundColor: '#FFEBEE' }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Main Controls Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Notification Settings
          </Text>

          {/* Enable/Disable Toggle */}
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={[styles.label, { color: colors.text }]}>
                Enable Notifications
              </Text>
              <Text style={[styles.sublabel, { color: colors.textSecondary }]}>
                Receive push reminders when cards are due
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={notificationsEnabled ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          {/* Cooldown Input */}
          <View style={styles.inputRow}>
            <View style={styles.rowLabel}>
              <Text style={[styles.label, { color: colors.text }]}>
                Cooldown (minutes)
              </Text>
              <Text style={[styles.sublabel, { color: colors.textSecondary }]}>
                Minimum time between notifications (120-1440)
              </Text>
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              value={cooldownMinutes}
              onChangeText={handleCooldownChange}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="120"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Max Per Day Input */}
          <View style={styles.inputRow}>
            <View style={styles.rowLabel}>
              <Text style={[styles.label, { color: colors.text }]}>
                Max Per Day
              </Text>
              <Text style={[styles.sublabel, { color: colors.textSecondary }]}>
                Maximum notifications per day (1-50)
              </Text>
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              value={maxPerDay}
              onChangeText={handleMaxPerDayChange}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="10"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Status Section */}
        {prefs && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Status
            </Text>

            <View style={styles.statusRow}>
              <Text
                style={[styles.statusLabel, { color: colors.textSecondary }]}
              >
                Push Token
              </Text>
              <Text
                style={[
                  styles.statusValue,
                  { color: prefs.hasPushToken ? '#4CAF50' : '#F44336' },
                ]}
              >
                {prefs.hasPushToken ? 'Registered' : 'Not registered'}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text
                style={[styles.statusLabel, { color: colors.textSecondary }]}
              >
                Notifications Today
              </Text>
              <Text style={[styles.statusValue, { color: colors.text }]}>
                {prefs.notificationsCountToday} / {prefs.maxNotificationsPerDay}
              </Text>
            </View>

            {prefs.lastPushSentAt && (
              <View style={styles.statusRow}>
                <Text
                  style={[styles.statusLabel, { color: colors.textSecondary }]}
                >
                  Last Notification
                </Text>
                <Text style={[styles.statusValue, { color: colors.text }]}>
                  {new Date(prefs.lastPushSentAt).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Dev Testing Section - only in __DEV__ builds */}
        {__DEV__ && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Dev Testing
            </Text>
            <Text style={[styles.sublabel, { color: colors.textSecondary }]}>
              Test the notification flow by scheduling a local notification that
              mimics a real push notification.
            </Text>
            <TouchableOpacity
              style={[
                styles.testButton,
                schedulingTest && styles.testButtonDisabled,
              ]}
              onPress={scheduleTestNotification}
              disabled={schedulingTest}
            >
              {schedulingTest ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.testButtonText}>
                  Test Sprint Notification (30s)
                </Text>
              )}
            </TouchableOpacity>
            <Text
              style={[styles.testDescription, { color: colors.textSecondary }]}
            >
              Creates a real PENDING sprint on the server, then schedules a
              local notification for 30 seconds. Tap the notification to test
              navigation and the &quot;Snooze 1h&quot; action.
            </Text>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            !hasChanges && styles.saveButtonDisabled,
            saving && styles.saveButtonDisabled,
          ]}
          onPress={validateAndSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {hasChanges ? 'Save Changes' : 'No Changes'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  warningSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 12,
  },
  settingsButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  errorSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  rowLabel: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  sublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  input: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  testButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  testDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
});
