/**
 * Profile Screen (Placeholder)
 *
 * Accessed from the avatar menu.
 */

import { Stack } from 'expo-router';

import { ScreenMessage } from '@/components/ui-app/screen-state';

export default function ProfileScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScreenMessage
        glyph="👤"
        titleSize="xl"
        title="Profile"
        body="User profile management coming soon."
        className="flex-1 bg-background-50 p-6"
      />
    </>
  );
}
