/**
 * Menu Stack Layout
 *
 * Stack for screens accessed from the avatar popover menu:
 * - Profile
 * - Settings
 * - Stats
 * - Notification Controls
 * - Account
 */

import { Stack } from 'expo-router';

export default function MenuLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="stats"
        options={{
          title: 'Stats',
        }}
      />
      <Stack.Screen
        name="notification-controls"
        options={{
          title: 'Notification Controls',
        }}
      />
      <Stack.Screen
        name="account"
        options={{
          title: 'Account',
        }}
      />
    </Stack>
  );
}
