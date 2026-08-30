/**
 * Settings Screen
 *
 * Central place for app settings including notification controls and account.
 */

import { Stack, router } from 'expo-router';

import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { Section, StatRow } from '@/components/ui-app/settings-list';
import { useNotifications } from '@/hooks/use-notifications';

export default function SettingsScreen() {
  const { hasPermission, expoPushToken } = useNotifications();

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView
        className="flex-1 bg-background-50"
        contentContainerClassName="p-4 pb-8"
      >
        <Section title="Notifications">
          <StatRow
            label="Permission"
            value={hasPermission ? 'Granted' : 'Denied'}
            tone={hasPermission ? 'positive' : 'negative'}
            divider
          />
          <StatRow
            label="Push Token"
            value={expoPushToken ? 'Registered' : 'Not registered'}
            tone={expoPushToken ? 'positive' : 'muted'}
            divider
          />

          <Pressable
            className="mt-2 flex-row items-center justify-between py-3"
            onPress={() => router.push('/(menu)/notification-controls')}
            testID="notification-controls-link"
          >
            <Text size="md">Notification Controls</Text>
            <Text size="lg" className="text-typography-500">
              {'>'}
            </Text>
          </Pressable>
        </Section>

        <Section title="Sprint Preferences">
          <Text size="sm" className="text-typography-500">
            Sprint size and preferences will be configurable in a future update.
          </Text>
        </Section>

        <Section title="Account">
          <Text size="sm" className="text-typography-500">
            Account management will be available once Clerk authentication is
            fully integrated.
          </Text>
        </Section>

        <Section title="About">
          <StatRow label="Version" value="MVP" divider />
          <Text size="sm" className="mt-2 text-typography-500">
            MicroFlash - Microlearning-first spaced repetition
          </Text>
        </Section>
      </ScrollView>
    </>
  );
}
