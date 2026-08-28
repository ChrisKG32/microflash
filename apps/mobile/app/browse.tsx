/**
 * Browse / Review Ahead Screen
 *
 * Allows users to review cards ahead of schedule.
 * This is a placeholder - deferred to post-MVP (MF-8).
 */

import { Stack, router } from 'expo-router';

import { Button, ButtonText } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

export default function BrowseScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Review Ahead' }} />
      <Center className="flex-1 bg-background-50 p-5">
        <Text className="mb-4 text-5xl">📚</Text>
        <Heading size="xl" className="mb-2">
          Review Ahead
        </Heading>
        <Text size="sm" className="mb-2 text-center text-typography-500">
          This feature allows you to review cards before they are due.
        </Text>
        <Text size="sm" className="mb-6 italic text-typography-400">
          Coming soon!
        </Text>
        <Button
          action="primary"
          onPress={() => router.back()}
          testID="go-back-button"
        >
          <ButtonText>Go Back</ButtonText>
        </Button>
      </Center>
    </>
  );
}
