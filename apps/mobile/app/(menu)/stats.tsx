/**
 * Stats Screen (Placeholder)
 *
 * Accessed from the avatar menu.
 */

import { Stack } from 'expo-router';

import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

export default function StatsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Stats' }} />
      <Center className="flex-1 bg-background-50 p-6">
        <Text className="mb-4 text-6xl">📊</Text>
        <Heading size="xl" className="mb-2">
          Stats
        </Heading>
        <Text size="md" className="text-center text-typography-500">
          Review statistics and progress tracking coming soon.
        </Text>
      </Center>
    </>
  );
}
