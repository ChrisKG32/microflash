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

export default function ReviewLayout() {
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
          title: 'Review',
        }}
      />
    </Stack>
  );
}
