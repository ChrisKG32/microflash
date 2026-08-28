/**
 * Onboarding: Notifications Enablement
 *
 * First onboarding screen - prompts user to enable notifications.
 */

import { useState } from 'react';
import { Stack, router } from 'expo-router';

import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
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
      <Center className="flex-1 bg-background-50 p-6">
        <Text className="mb-4 text-7xl">🔔</Text>
        <Heading size="3xl" className="mb-4 text-center">
          Stay on Track
        </Heading>
        <Text size="md" className="mb-3 text-center text-typography-500">
          MicroFlash sends gentle reminders throughout the day to help you stay
          caught up with your reviews.
        </Text>
        <Text size="md" className="mb-3 text-center text-typography-500">
          You&apos;re in control: set quiet hours, max notifications per day,
          and cooldown periods.
        </Text>

        {error && (
          <Text size="sm" className="mt-4 text-center text-error-700">
            {error}
          </Text>
        )}

        <VStack className="mt-8 w-full gap-3">
          <Button
            size="xl"
            action="primary"
            className="rounded-xl"
            onPress={handleEnable}
            isDisabled={loading}
            testID="enable-notifications-button"
          >
            {loading ? (
              <ButtonSpinner className="text-typography-0" />
            ) : (
              <ButtonText>Enable Notifications</ButtonText>
            )}
          </Button>

          <Button
            size="xl"
            variant="outline"
            action="secondary"
            className="rounded-xl"
            onPress={handleNotNow}
            isDisabled={loading}
            testID="not-now-button"
          >
            <ButtonText>Not Now</ButtonText>
          </Button>
        </VStack>
      </Center>
    </>
  );
}
