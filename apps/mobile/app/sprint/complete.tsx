/**
 * Sprint Complete Screen
 *
 * Displays completion feedback after finishing a sprint.
 * Shows stats and provides "Done" and "One More Sprint" actions.
 */

import { useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { startSprint, ApiError, type SprintSource } from '@/lib/api';

function StatRow({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'pass' | 'fail';
}) {
  const valueClass =
    tone === 'pass'
      ? 'text-success-700'
      : tone === 'fail'
        ? 'text-error-700'
        : 'text-typography-900';
  return (
    <HStack className="items-center justify-between py-2">
      <Text size="md" className="text-typography-500">
        {label}
      </Text>
      <Text size="md" className={`font-semibold ${valueClass}`}>
        {value}
      </Text>
    </HStack>
  );
}

export default function SprintCompleteScreen() {
  const {
    returnTo,
    launchSource,
    deckId,
    totalCards,
    reviewedCards,
    passCount,
    failCount,
    durationSeconds,
  } = useLocalSearchParams<{
    returnTo?: string;
    launchSource?: string;
    deckId?: string;
    totalCards?: string;
    reviewedCards?: string;
    passCount?: string;
    failCount?: string;
    durationSeconds?: string;
  }>();

  const [startingNewSprint, setStartingNewSprint] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse stats from params
  const stats = {
    totalCards: parseInt(totalCards ?? '0', 10),
    reviewedCards: parseInt(reviewedCards ?? '0', 10),
    passCount: parseInt(passCount ?? '0', 10),
    failCount: parseInt(failCount ?? '0', 10),
    durationSeconds: parseInt(durationSeconds ?? '0', 10),
  };

  const handleDone = () => {
    // Navigate back to the launch context
    const destination = returnTo ?? '/';
    router.replace(destination);
  };

  const handleOneMoreSprint = async () => {
    if (startingNewSprint) return;

    setStartingNewSprint(true);
    setError(null);

    try {
      // Determine source and deckId for the new sprint
      const source: SprintSource = launchSource === 'DECK' ? 'DECK' : 'HOME';
      const newSprintDeckId = source === 'DECK' && deckId ? deckId : undefined;

      const { sprint } = await startSprint({
        deckId: newSprintDeckId,
        source,
      });

      // Replace current screen with new sprint review
      router.replace({
        pathname: '/sprint/[id]',
        params: {
          id: sprint.id,
          returnTo: returnTo ?? '/',
          launchSource: launchSource ?? 'HOME',
          deckId: deckId ?? '',
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NO_ELIGIBLE_CARDS') {
        setError('No more cards are due for review right now.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to start new sprint');
      }
      setStartingNewSprint(false);
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Center className="flex-1 bg-background-50 p-6">
        {/* Success Icon */}
        <Text className="mb-4 text-7xl">🎉</Text>

        {/* Title */}
        <Heading size="3xl" className="mb-6">
          Sprint Complete!
        </Heading>

        {/* Stats */}
        {stats.totalCards > 0 && (
          <Box className="mb-6 w-full rounded-xl bg-background-0 p-4">
            <StatRow label="Cards reviewed" value={stats.reviewedCards} />
            {stats.passCount > 0 && (
              <>
                <Divider />
                <StatRow label="Passed" value={stats.passCount} tone="pass" />
              </>
            )}
            {stats.failCount > 0 && (
              <>
                <Divider />
                <StatRow
                  label="Need review"
                  value={stats.failCount}
                  tone="fail"
                />
              </>
            )}
            {stats.durationSeconds > 0 && (
              <>
                <Divider />
                <StatRow
                  label="Time"
                  value={formatDuration(stats.durationSeconds)}
                />
              </>
            )}
          </Box>
        )}

        {/* Error message */}
        {error && (
          <Text size="sm" className="mb-4 text-center text-error-700">
            {error}
          </Text>
        )}

        {/* Actions */}
        <VStack className="w-full gap-3">
          <Button
            size="xl"
            action="primary"
            className="rounded-xl"
            onPress={handleDone}
            isDisabled={startingNewSprint}
            testID="done-button"
          >
            <ButtonText>Done</ButtonText>
          </Button>

          <Button
            size="xl"
            variant="outline"
            action="primary"
            className="rounded-xl"
            onPress={handleOneMoreSprint}
            isDisabled={startingNewSprint}
            testID="one-more-sprint-button"
          >
            {startingNewSprint ? (
              <ButtonSpinner className="text-primary-700" />
            ) : (
              <ButtonText>One More Sprint</ButtonText>
            )}
          </Button>
        </VStack>

        {/* Encouragement */}
        <Text size="sm" className="mt-6 text-center text-typography-500">
          Great job! Every review strengthens your memory.
        </Text>
      </Center>
    </>
  );
}
