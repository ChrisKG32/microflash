/**
 * Review Stack Layout
 *
 * Stack for the Review tab:
 * - Review Home (index)
 *
 * This stack owns the single top header for all Review screens.
 */

import { Stack } from 'expo-router';
import { HeaderRight } from '@/components/HeaderRight';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ReviewLayout() {
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
          title: 'Review',
        }}
      />
    </Stack>
  );
}
