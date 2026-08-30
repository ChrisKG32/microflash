/**
 * Browse / Review Ahead Screen
 *
 * Allows users to review cards ahead of schedule.
 * This is a placeholder - deferred to post-MVP (MF-8).
 */

import { Stack, router } from 'expo-router';

import { Text } from '@/components/ui/text';
import { ScreenMessage } from '@/components/ui-app/screen-state';

export default function BrowseScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Review Ahead' }} />
      <ScreenMessage
        glyph="📚"
        glyphClassName="mb-4 text-5xl"
        titleSize="xl"
        title="Review Ahead"
        actionLabel="Go Back"
        onAction={() => router.back()}
        actionTestID="go-back-button"
      >
        <Text size="sm" className="mb-2 text-center text-typography-500">
          This feature allows you to review cards before they are due.
        </Text>
        <Text size="sm" className="mb-6 italic text-typography-400">
          Coming soon!
        </Text>
      </ScreenMessage>
    </>
  );
}
