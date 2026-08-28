/**
 * Library Stack Layout
 *
 * Nested stack within the Library tab for:
 * - Decks List (index)
 * - Deck Detail
 * - Card Editor
 *
 * This stack owns the single top header for all Library screens.
 */

import { Stack } from 'expo-router';
import { HeaderRight } from '@/components/HeaderRight';

export default function LibraryLayout() {
  return (
    <Stack
      // Header background, title and back-button colors come from the
      // navigation theme in theme/navigation.ts, which is built from the same
      // tokens gluestack uses. Do not hardcode them here again.
      screenOptions={{
        headerRight: () => <HeaderRight />,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Library',
        }}
      />
      <Stack.Screen
        name="deck/[id]"
        options={{
          headerBackTitle: 'Library',
        }}
      />
      <Stack.Screen
        name="card/new"
        options={{
          headerBackTitle: 'Cancel',
          title: 'New Card',
        }}
      />
      <Stack.Screen
        name="card/[id]"
        options={{
          headerBackTitle: 'Cancel',
          title: 'Edit Card',
        }}
      />
    </Stack>
  );
}
