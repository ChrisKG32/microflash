/**
 * Account Screen (Placeholder)
 *
 * Accessed from the avatar menu.
 */

import { Stack } from 'expo-router';

import { ScreenMessage } from '@/components/ui-app/screen-state';

export default function AccountScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Account' }} />
      <ScreenMessage
        glyph="🔐"
        titleSize="xl"
        title="Account"
        body="Account management (sign out, etc.) coming soon."
        className="flex-1 bg-background-50 p-6"
      />
    </>
  );
}
