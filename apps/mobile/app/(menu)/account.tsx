/**
 * Account Screen (Placeholder)
 *
 * Accessed from the avatar menu.
 */

import { Stack } from 'expo-router';

import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

export default function AccountScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Account' }} />
      <Center className="flex-1 bg-background-50 p-6">
        <Text className="mb-4 text-6xl">🔐</Text>
        <Heading size="xl" className="mb-2">
          Account
        </Heading>
        <Text size="md" className="text-center text-typography-500">
          Account management (sign out, etc.) coming soon.
        </Text>
      </Center>
    </>
  );
}
