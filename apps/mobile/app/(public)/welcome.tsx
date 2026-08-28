/**
 * Welcome Screen (Public)
 *
 * Entry point for unauthenticated users.
 * Explains micro-sprints value prop and pushes to sign-in.
 */

import { Stack, router } from 'expo-router';

import { Button, ButtonText } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

export default function WelcomeScreen() {
  const handleSignIn = () => {
    // TODO: Integrate Clerk sign-in
    // For now, this is a placeholder
    router.push('/(tabs)/review');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Center className="flex-1 bg-background-50 p-6">
        <Text className="mb-4 text-7xl">⚡</Text>
        <Heading size="3xl" className="mb-4 text-center">
          Welcome to MicroFlash
        </Heading>
        <Text size="md" className="mb-3 text-center text-typography-500">
          Master anything with micro-sprints: quick 30-90 second review sessions
          that fit into your day.
        </Text>
        <Text size="md" className="mb-3 text-center text-typography-500">
          Respectful notifications keep you on track without overwhelming you.
        </Text>

        <Button
          size="xl"
          action="primary"
          className="mt-8 rounded-xl"
          onPress={handleSignIn}
          testID="sign-in-button"
        >
          <ButtonText size="lg">Sign In</ButtonText>
        </Button>

        <Text size="xs" className="mt-6 italic text-typography-400">
          Authentication coming soon (Clerk integration)
        </Text>
      </Center>
    </>
  );
}
