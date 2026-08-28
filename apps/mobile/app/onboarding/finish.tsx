/**
 * Onboarding: Finish
 *
 * Completes onboarding and redirects to home.
 */

import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';

import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
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
        <Center className="flex-1 bg-background-50 p-6">
          <Text className="mb-4 text-5xl">⚠️</Text>
          <Text size="md" className="text-center text-error-700">
            {error}
          </Text>
        </Center>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Center className="flex-1 bg-background-50 p-6">
        <Text className="mb-4 text-7xl">🎉</Text>
        <Heading size="3xl" className="mb-6">
          You&apos;re All Set!
        </Heading>
        <Spinner size="large" className="mt-4 text-primary-500" />
      </Center>
    </>
  );
}
