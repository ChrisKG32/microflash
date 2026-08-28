/**
 * Onboarding: Fixture Sprint
 *
 * Creates a sprint from the onboarding fixture deck and redirects to sprint review.
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { createFixtureSprint } from '@/lib/api';

export default function OnboardingFixtureSprintScreen() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startFixtureSprint();
  }, []);

  const startFixtureSprint = async () => {
    try {
      const { sprint } = await createFixtureSprint();

      // Navigate to sprint review with onboarding context
      router.replace({
        pathname: '/sprint/[id]',
        params: {
          id: sprint.id,
          returnTo: '/onboarding/finish',
          launchSource: 'HOME',
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start fixture sprint',
      );
    }
  };

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Getting Started' }} />
        <View style={styles.container}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Getting Started' }} />
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2196f3" />
        <Text style={styles.loadingText}>Preparing your first sprint...</Text>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
});
