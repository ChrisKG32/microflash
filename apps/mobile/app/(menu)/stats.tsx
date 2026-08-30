/**
 * Stats Screen (Placeholder)
 *
 * Accessed from the avatar menu.
 */

import { Stack } from 'expo-router';

import { ScreenMessage } from '@/components/ui-app/screen-state';

export default function StatsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Stats' }} />
      <ScreenMessage
        glyph="📊"
        titleSize="xl"
        title="Stats"
        body="Review statistics and progress tracking coming soon."
        className="flex-1 bg-background-50 p-6"
      />
    </>
  );
}
