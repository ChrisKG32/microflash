/**
 * Settings Screen
 *
 * Central place for app settings including notification controls and account.
 */

import { router } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useNotifications } from '@/hooks/use-notifications';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box className="mb-4 rounded-xl bg-background-0 p-4">
      <Heading size="md" className="mb-3">
        {title}
      </Heading>
      {children}
    </Box>
  );
}

function StatusRow({
  label,
  value,
  tone = 'muted',
}: {
  label: string;
  value: string;
  tone?: 'muted' | 'positive' | 'negative';
}) {
  const valueClass =
    tone === 'positive'
      ? 'text-success-700'
      : tone === 'negative'
        ? 'text-error-700'
        : 'text-typography-500';

  return (
    <>
      <HStack className="items-center justify-between py-2">
        <Text size="sm" className="text-typography-500">
          {label}
        </Text>
        <Text size="sm" className={`font-medium ${valueClass}`}>
          {value}
        </Text>
      </HStack>
      <Divider />
    </>
  );
}

export default function SettingsScreen() {
  const { hasPermission, expoPushToken } = useNotifications();

  return (
    <ScrollView
      className="flex-1 bg-background-50"
      contentContainerClassName="p-4 pb-8"
    >
      <Section title="Notifications">
        <StatusRow
          label="Permission"
          value={hasPermission ? 'Granted' : 'Denied'}
          tone={hasPermission ? 'positive' : 'negative'}
        />
        <StatusRow
          label="Push Token"
          value={expoPushToken ? 'Registered' : 'Not registered'}
          tone={expoPushToken ? 'positive' : 'muted'}
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
        <StatusRow label="Version" value="MVP" />
        <Text size="sm" className="mt-2 text-typography-500">
          MicroFlash - Microlearning-first spaced repetition
        </Text>
      </Section>
    </ScrollView>
  );
}
