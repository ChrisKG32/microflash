import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';

import { useNotifications } from '@/hooks/use-notifications';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const {
    hasPermission,
    expoPushToken,
    isDevice,
    lastNotification,
    isLoading,
    error,
    requestPermissions,
    scheduleLocalNotification,
    cancelAllNotifications,
  } = useNotifications();

  const [scheduledIds, setScheduledIds] = useState<string[]>([]);

  const handleRequestPermissions = async () => {
    const granted = await requestPermissions();
    if (granted) {
      Alert.alert('Success', 'Notification permissions granted!');
    } else {
      Alert.alert(
        'Permission Denied',
        'Please enable notifications in Settings to receive reminders.',
      );
    }
  };

  const handleScheduleNotification = async (delaySeconds: number) => {
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Please grant notification permissions first.',
      );
      return;
    }

    try {
      // Use the due_cards category to test action buttons
      // Note: This uses a mock sprintId for testing; real sprints are created server-side
      const testSprintId = 'test-sprint-' + Date.now();
      const id = await scheduleLocalNotification(
        'Time for a micro-sprint!',
        `3 cards ready for review (Test - ${delaySeconds}s delay)`,
        delaySeconds,
        {
          categoryIdentifier: 'due_cards',
          data: {
            type: 'sprint',
            sprintId: testSprintId,
            url: `/sprint/${testSprintId}`,
          },
        },
      );
      setScheduledIds((prev) => [...prev, id]);
      Alert.alert(
        'Scheduled',
        `Notification will appear in ${delaySeconds} seconds with action buttons.`,
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to schedule notification');
      console.error(err);
    }
  };

  const handleCancelAll = async () => {
    await cancelAllNotifications();
    setScheduledIds([]);
    Alert.alert('Cancelled', 'All scheduled notifications cancelled.');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Notification Testing
      </Text>

      {/* Status Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Status
        </Text>

        <View style={styles.statusRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Permission:
          </Text>
          <Text
            style={[
              styles.value,
              { color: hasPermission ? '#4CAF50' : '#F44336' },
            ]}
          >
            {isLoading ? 'Checking...' : hasPermission ? 'Granted' : 'Denied'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Physical Device:
          </Text>
          <Text
            style={[styles.value, { color: isDevice ? '#4CAF50' : '#FF9800' }]}
          >
            {isDevice ? 'Yes' : 'No (Simulator)'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Push Token:
          </Text>
          <Text
            style={[
              styles.value,
              { color: expoPushToken ? '#4CAF50' : colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {expoPushToken
              ? `${expoPushToken.slice(0, 30)}...`
              : 'N/A (simulator)'}
          </Text>
        </View>

        {error && (
          <View style={styles.statusRow}>
            <Text style={[styles.label, { color: '#F44336' }]}>Error:</Text>
            <Text style={[styles.value, { color: '#F44336' }]}>{error}</Text>
          </View>
        )}
      </View>

      {/* Permission Section */}
      {!hasPermission && (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Enable Notifications
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Grant permission to receive reminders when cards are due for review.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleRequestPermissions}
          >
            <Text style={styles.buttonText}>Request Permission</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Test Notifications Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Test Local Notifications
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Schedule a local notification to test the notification system.
          {!isDevice &&
            ' Note: Remote push notifications require a physical device.'}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.testButton,
              !hasPermission && styles.buttonDisabled,
            ]}
            onPress={() => handleScheduleNotification(3)}
            disabled={!hasPermission}
          >
            <Text style={styles.buttonText}>3 sec</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.testButton,
              !hasPermission && styles.buttonDisabled,
            ]}
            onPress={() => handleScheduleNotification(10)}
            disabled={!hasPermission}
          >
            <Text style={styles.buttonText}>10 sec</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.testButton,
              !hasPermission && styles.buttonDisabled,
            ]}
            onPress={() => handleScheduleNotification(30)}
            disabled={!hasPermission}
          >
            <Text style={styles.buttonText}>30 sec</Text>
          </TouchableOpacity>
        </View>

        {scheduledIds.length > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancelAll}
          >
            <Text style={styles.buttonText}>
              Cancel All ({scheduledIds.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Last Notification Section */}
      {lastNotification && (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Last Received Notification
          </Text>
          <Text style={[styles.code, { color: colors.textSecondary }]}>
            Title: {lastNotification.request.content.title}
          </Text>
          <Text style={[styles.code, { color: colors.textSecondary }]}>
            Body: {lastNotification.request.content.body}
          </Text>
          <Text style={[styles.code, { color: colors.textSecondary }]}>
            Data: {JSON.stringify(lastNotification.request.content.data)}
          </Text>
        </View>
      )}

      {/* Info Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          About Push Notifications
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {isDevice
            ? 'You are on a physical device. Remote push notifications from the server will work once your Apple Developer account is active and credentials are configured.'
            : 'You are on a simulator. Local notifications work here, but remote push notifications require a physical device with proper APNs credentials.'}
        </Text>
      </View>
    </ScrollView>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  testButton: {
    backgroundColor: '#34C759',
    flex: 1,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    marginTop: 12,
  },
  buttonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: 4,
  },
});
