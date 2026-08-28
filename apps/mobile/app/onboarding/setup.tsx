/**
 * Onboarding: Micro-sprint Setup
 *
 * Configure notification preferences with recommended defaults.
 */

import { useState } from 'react';
import { Stack, router } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { ScrollView } from '@/components/ui/scroll-view';
import {
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
} from '@/components/ui/slider';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAppToast } from '@/components/feedback/use-app-toast';
import { updateNotificationPreferences } from '@/lib/api';

/** A labelled slider row: label, current value, optional hint. */
function PreferenceSlider({
  label,
  hint,
  value,
  minValue,
  maxValue,
  step,
  onChange,
  testID,
}: {
  label: string;
  hint?: string;
  value: number;
  minValue: number;
  maxValue: number;
  step: number;
  onChange: (value: number) => void;
  testID: string;
}) {
  return (
    <Box className="mb-6">
      <HStack className="items-center justify-between">
        <Text size="md" className="font-semibold text-typography-900">
          {label}
        </Text>
        <Text size="sm" className="text-typography-500">
          {value} (Recommended)
        </Text>
      </HStack>
      {hint && (
        <Text size="xs" className="mt-1 text-typography-500">
          {hint}
        </Text>
      )}
      <Slider
        className="my-3"
        minValue={minValue}
        maxValue={maxValue}
        step={step}
        value={value}
        onChange={onChange}
        testID={testID}
      >
        <SliderTrack>
          <SliderFilledTrack />
        </SliderTrack>
        <SliderThumb />
      </Slider>
    </Box>
  );
}

export default function OnboardingSetupScreen() {
  const notify = useAppToast();

  // Recommended defaults
  const [quietHoursStart, setQuietHoursStart] = useState('');
  const [quietHoursEnd, setQuietHoursEnd] = useState('');
  const [maxPerDay, setMaxPerDay] = useState(5);
  const [cooldown, setCooldown] = useState(120);
  const [sprintSize, setSprintSize] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateTime = (time: string): boolean => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  };

  const handleContinue = async () => {
    // Validate quiet hours
    if (!quietHoursStart.trim() || !quietHoursEnd.trim()) {
      notify.error(
        'Required',
        'Please enter both quiet hours start and end times (HH:MM format)',
      );
      return;
    }

    if (!validateTime(quietHoursStart) || !validateTime(quietHoursEnd)) {
      notify.error(
        'Invalid Format',
        'Please use HH:MM format (e.g., 22:00 or 07:00)',
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Save preferences
      await updateNotificationPreferences({
        quietHoursStart,
        quietHoursEnd,
        maxNotificationsPerDay: maxPerDay,
        notificationCooldownMinutes: cooldown,
        sprintSize,
      });

      // Continue to create deck
      router.push('/onboarding/create-deck');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Setup', headerBackTitle: 'Back' }} />
      <ScrollView
        className="flex-1 bg-background-50"
        contentContainerClassName="p-6 pb-10"
      >
        <Heading size="2xl" className="mb-2">
          Respectful Notifications
        </Heading>
        <Text size="md" className="mb-6 text-typography-500">
          Configure when and how often you&apos;d like to be reminded. You can
          change these anytime.
        </Text>

        {/* Quiet Hours */}
        <Box className="mb-6">
          <Text size="md" className="font-semibold text-typography-900">
            Quiet Hours (Required)
          </Text>
          <Text size="xs" className="mt-1 text-typography-500">
            No notifications during these hours
          </Text>
          <HStack className="mt-3 gap-3">
            <VStack className="flex-1">
              <Text size="xs" className="mb-1 text-typography-500">
                Start
              </Text>
              <Input variant="outline">
                <InputField
                  placeholder="22:00"
                  value={quietHoursStart}
                  onChangeText={setQuietHoursStart}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  testID="quiet-hours-start"
                />
              </Input>
            </VStack>
            <VStack className="flex-1">
              <Text size="xs" className="mb-1 text-typography-500">
                End
              </Text>
              <Input variant="outline">
                <InputField
                  placeholder="07:00"
                  value={quietHoursEnd}
                  onChangeText={setQuietHoursEnd}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  testID="quiet-hours-end"
                />
              </Input>
            </VStack>
          </HStack>
        </Box>

        <PreferenceSlider
          label="Max Notifications/Day"
          value={maxPerDay}
          minValue={1}
          maxValue={10}
          step={1}
          onChange={setMaxPerDay}
          testID="max-per-day-slider"
        />

        <PreferenceSlider
          label="Cooldown (minutes)"
          hint="Minimum time between notifications"
          value={cooldown}
          minValue={120}
          maxValue={480}
          step={30}
          onChange={setCooldown}
          testID="cooldown-slider"
        />

        <PreferenceSlider
          label="Sprint Size (cards)"
          hint="Cards per micro-sprint"
          value={sprintSize}
          minValue={3}
          maxValue={10}
          step={1}
          onChange={setSprintSize}
          testID="sprint-size-slider"
        />

        {error && (
          <Text size="sm" className="mb-4 text-center text-error-700">
            {error}
          </Text>
        )}

        <Button
          size="xl"
          action="primary"
          className="rounded-xl"
          onPress={handleContinue}
          isDisabled={loading}
          testID="continue-button"
        >
          {loading ? (
            <ButtonSpinner className="text-typography-0" />
          ) : (
            <ButtonText>Continue</ButtonText>
          )}
        </Button>
      </ScrollView>
    </>
  );
}
