/**
 * Onboarding: Finish
 *
 * Completes onboarding and redirects to home.
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { completeOnboarding } from '@/lib/api';

export default function OnboardingFinishScreen() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    finishOnboarding();
  }, []);

  const finishOnboarding = async () => {
    try {
      await completeOnboarding();

      // Navigate to home (replace entire stack)
      router.replace('/(tabs)/review');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to complete onboarding',
      );
    }
  };

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>You&apos;re All Set!</Text>
        <ActivityIndicator size="large" color="#2196f3" style={styles.loader} />
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
    marginBottom: 24,
  },
  loader: {
    marginTop: 16,
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
