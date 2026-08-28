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
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LibraryLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerRight: () => <HeaderRight />,
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#fff',
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerTintColor: colorScheme === 'dark' ? '#fff' : '#007AFF',
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
