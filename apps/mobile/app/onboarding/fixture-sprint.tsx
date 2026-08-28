/**
 * Onboarding: Fixture Sprint
 *
 * Creates a sprint from the onboarding fixture deck and redirects to sprint review.
 */

import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';

import { Center } from '@/components/ui/center';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
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
      <Stack.Screen options={{ title: 'Getting Started' }} />
      <Center className="flex-1 bg-background-50 p-6">
        <Spinner size="large" className="text-primary-500" />
        <Text size="md" className="mt-4 text-typography-500">
          Preparing your first sprint...
        </Text>
      </Center>
    </>
  );
}
