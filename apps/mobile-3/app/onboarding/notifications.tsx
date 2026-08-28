/**
 * Onboarding: Notifications Enablement
 *
 * First onboarding screen - prompts user to enable notifications.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useNotifications } from '@/hooks/use-notifications';
import { markNotificationsPrompted } from '@/lib/api';

export default function OnboardingNotificationsScreen() {
  const { requestPermissions } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnable = async () => {
    setLoading(true);
    setError(null);

    try {
      // Request OS notification permissions
      await requestPermissions();

      // Mark that we prompted (regardless of allow/deny)
      await markNotificationsPrompted();

      // Continue to setup
      router.push('/onboarding/setup');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to enable notifications',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNotNow = async () => {
    setLoading(true);
    setError(null);

    try {
      // Mark that we prompted (user declined)
      await markNotificationsPrompted();

      // Continue to setup
      router.push('/onboarding/setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🔔</Text>
        <Text style={styles.title}>Stay on Track</Text>
        <Text style={styles.description}>
          MicroFlash sends gentle reminders throughout the day to help you stay
          caught up with your reviews.
        </Text>
        <Text style={styles.description}>
          You&apos;re in control: set quiet hours, max notifications per day,
          and cooldown periods.
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleEnable}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Enable Notifications</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleNotNow}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    marginTop: 32,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#2196f3',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
