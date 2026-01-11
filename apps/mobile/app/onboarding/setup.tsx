/**
 * Onboarding: Micro-sprint Setup
 *
 * Configure notification preferences with recommended defaults.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import Slider from '@react-native-community/slider';
import { updateNotificationPreferences } from '@/lib/api';

export default function OnboardingSetupScreen() {
  // Recommended defaults
  const [quietHoursStart, setQuietHoursStart] = useState('');
  const [quietHoursEnd, setQuietHoursEnd] = useState('');
  const [maxPerDay, setMaxPerDay] = useState(5);
  const [cooldown, setCooldown] = useState(120);
  const [sprintSize, setSprintSize] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateTime = (time: string): boolean => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  };

  const handleContinue = async () => {
    // Validate quiet hours
    if (!quietHoursStart.trim() || !quietHoursEnd.trim()) {
      Alert.alert(
        'Required',
        'Please enter both quiet hours start and end times (HH:MM format)',
      );
      return;
    }

    if (!validateTime(quietHoursStart) || !validateTime(quietHoursEnd)) {
      Alert.alert(
        'Invalid Format',
        'Please use HH:MM format (e.g., 22:00 or 07:00)',
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Save preferences
      await updateNotificationPreferences({
        quietHoursStart,
        quietHoursEnd,
        maxNotificationsPerDay: maxPerDay,
        notificationCooldownMinutes: cooldown,
        sprintSize,
      });

      // Continue to create deck
      router.push('/onboarding/create-deck');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Setup', headerBackTitle: 'Back' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Respectful Notifications</Text>
        <Text style={styles.description}>
          Configure when and how often you&apos;d like to be reminded. You can
          change these anytime.
        </Text>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={styles.label}>Quiet Hours (Required)</Text>
          <Text style={styles.hint}>No notifications during these hours</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeInput}>
              <Text style={styles.timeLabel}>Start</Text>
              <TextInput
                style={styles.input}
                placeholder="22:00"
                value={quietHoursStart}
                onChangeText={setQuietHoursStart}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
            <View style={styles.timeInput}>
              <Text style={styles.timeLabel}>End</Text>
              <TextInput
                style={styles.input}
                placeholder="07:00"
                value={quietHoursEnd}
                onChangeText={setQuietHoursEnd}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>
        </View>

        {/* Max Per Day */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Max Notifications/Day</Text>
            <Text style={styles.value}>{maxPerDay} (Recommended)</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={maxPerDay}
            onValueChange={setMaxPerDay}
            minimumTrackTintColor="#2196f3"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#2196f3"
          />
        </View>

        {/* Cooldown */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Cooldown (minutes)</Text>
            <Text style={styles.value}>{cooldown} (Recommended)</Text>
          </View>
          <Text style={styles.hint}>Minimum time between notifications</Text>
          <Slider
            style={styles.slider}
            minimumValue={120}
            maximumValue={480}
            step={30}
            value={cooldown}
            onValueChange={setCooldown}
            minimumTrackTintColor="#2196f3"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#2196f3"
          />
        </View>

        {/* Sprint Size */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Sprint Size (cards)</Text>
            <Text style={styles.value}>{sprintSize} (Recommended)</Text>
          </View>
          <Text style={styles.hint}>Cards per micro-sprint</Text>
          <Slider
            style={styles.slider}
            minimumValue={3}
            maximumValue={10}
            step={1}
            value={sprintSize}
            onValueChange={setSprintSize}
            minimumTrackTintColor="#2196f3"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#2196f3"
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#2196f3',
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
