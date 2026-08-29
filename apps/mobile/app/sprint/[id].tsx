/**
 * Sprint Review Screen
 *
 * Displays a sprint review session. Loads sprint by ID from the server.
 * Shows cards one at a time with reveal/grade flow.
 */

import { useState, useCallback } from 'react';
import {
  useLocalSearchParams,
  Stack,
  router,
  useFocusEffect,
} from 'expo-router';

import {
  getSprint,
  submitSprintReview,
  completeSprint,
  ApiError,
  type Sprint,
  type SprintCard,
  type Rating,
} from '@/lib/api';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { Divider } from '@/components/ui/divider';
import { HStack } from '@/components/ui/hstack';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { CardContent } from '@/components/CardContent';

/** The four FSRS grades, in Again -> Easy order. */
const GRADES = [
  {
    rating: 'AGAIN' as const,
    label: 'Again',
    hint: 'Forgot',
    tone: 'bg-error-500',
  },
  {
    rating: 'HARD' as const,
    label: 'Hard',
    hint: 'Struggled',
    tone: 'bg-warning-500',
  },
  {
    rating: 'GOOD' as const,
    label: 'Good',
    hint: 'Correct',
    tone: 'bg-success-500',
  },
  {
    rating: 'EASY' as const,
    label: 'Easy',
    hint: 'Effortless',
    tone: 'bg-primary-500',
  },
];

export default function SprintReviewScreen() {
  const { id, returnTo, launchSource, deckId } = useLocalSearchParams<{
    id: string;
    returnTo?: string;
    launchSource?: string;
    deckId?: string;
  }>();

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchSprint = useCallback(async () => {
    try {
      // Guard inside the try so the finally below still clears `loading`. As a
      // bare early return this left the screen on its spinner forever whenever
      // the route param was missing.
      if (!id) throw new Error('Sprint not found');

      const { sprint: fetchedSprint } = await getSprint(id);
      setSprint(fetchedSprint);
      // Cleared on success rather than before the request, so a failed refresh
      // keeps its message up instead of flashing stale sprint content. Set
      // again just below when the sprint came back already abandoned.
      setError(null);

      // Check if sprint was auto-abandoned
      if (fetchedSprint.status === 'ABANDONED') {
        setError('This sprint has expired. Please start a new sprint.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'SPRINT_NOT_FOUND') {
          setError('Sprint not found. It may have been deleted.');
        } else if (err.code === 'SPRINT_EXPIRED') {
          setError('This sprint has expired. Please start a new sprint.');
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load sprint');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      // Refetch on every focus — the sprint can auto-abandon out from under
      // us — but only the first load blocks on a spinner. setLoading(true)
      // here replaced the card being reviewed with the full-screen spinner
      // every time the screen regained focus.
      //
      // Hiding the answer again on focus is deliberate and stays: coming back
      // to a revealed answer would hand out a free grade.
      setShowAnswer(false);
      fetchSprint();
    }, [fetchSprint]),
  );

  // Find the current card (first unreviewed card)
  const getCurrentCard = (): SprintCard | null => {
    if (!sprint) return null;
    return sprint.cards.find((sc) => sc.result === null) ?? null;
  };

  const handleReveal = () => {
    setShowAnswer(true);
  };

  const handleGrade = async (rating: Rating) => {
    const currentCard = getCurrentCard();
    if (!currentCard || !sprint || submitting) return;

    setSubmitting(true);
    try {
      const { sprint: updatedSprint } = await submitSprintReview(sprint.id, {
        cardId: currentCard.card.id,
        rating,
      });

      setSprint(updatedSprint);
      setShowAnswer(false);

      // Check if all cards are reviewed
      const remainingCards = updatedSprint.cards.filter(
        (sc) => sc.result === null,
      );

      if (remainingCards.length === 0) {
        // Complete the sprint and navigate to complete screen
        try {
          const { stats } = await completeSprint(sprint.id);
          router.replace({
            pathname: '/sprint/complete',
            params: {
              sprintId: sprint.id,
              returnTo: returnTo ?? '/',
              launchSource: launchSource ?? 'HOME',
              deckId: deckId ?? '',
              totalCards: String(stats.totalCards),
              reviewedCards: String(stats.reviewedCards),
              passCount: String(stats.passCount),
              failCount: String(stats.failCount),
              durationSeconds: String(stats.durationSeconds ?? 0),
            },
          });
        } catch {
          // Sprint might already be completed (idempotent)
          router.replace({
            pathname: '/sprint/complete',
            params: {
              sprintId: sprint.id,
              returnTo: returnTo ?? '/',
              launchSource: launchSource ?? 'HOME',
              deckId: deckId ?? '',
            },
          });
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'SPRINT_EXPIRED') {
          setError('This sprint has expired. Please start a new sprint.');
          setSprint(null);
        } else if (err.code === 'CARD_ALREADY_REVIEWED') {
          // Card was already reviewed, refresh sprint
          fetchSprint();
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to submit review');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoHome = () => {
    router.replace(returnTo ?? '/');
  };

  const currentCard = getCurrentCard();
  const progress = sprint?.progress;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Sprint Review' }} />
        <Center className="flex-1 bg-background-50">
          <Spinner size="large" className="text-primary-500" />
          <Text size="md" className="mt-4 text-typography-500">
            Loading sprint...
          </Text>
        </Center>
      </>
    );
  }

  if (error || !sprint) {
    return (
      <>
        <Stack.Screen options={{ title: 'Sprint Review' }} />
        <Center className="flex-1 bg-background-50 p-5">
          <Text className="mb-4 text-5xl">⚠️</Text>
          <Text size="md" className="mb-4 text-center text-error-700">
            {error || 'Sprint not found'}
          </Text>
          <Button
            action="primary"
            onPress={handleGoHome}
            testID="go-home-button"
          >
            <ButtonText>Go Home</ButtonText>
          </Button>
        </Center>
      </>
    );
  }

  if (!currentCard) {
    // All cards reviewed but didn't navigate yet
    return (
      <>
        <Stack.Screen options={{ title: 'Sprint Review' }} />
        <Center className="flex-1 bg-background-50">
          <Spinner size="large" className="text-primary-500" />
          <Text size="md" className="mt-4 text-typography-500">
            Completing sprint...
          </Text>
        </Center>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: sprint.deckTitle ?? 'Sprint Review',
          headerBackTitle: 'Back',
        }}
      />
      <Box className="flex-1 bg-background-50">
        {/* Progress Bar */}
        <HStack className="items-center gap-3 border-b border-outline-100 bg-background-0 px-4 py-3">
          <Progress
            value={((progress?.reviewed ?? 0) / (progress?.total ?? 1)) * 100}
            size="sm"
            className="flex-1"
            testID="sprint-progress"
          >
            <ProgressFilledTrack />
          </Progress>
          <Text
            size="sm"
            className="text-typography-500"
            testID="sprint-progress-label"
          >
            {progress?.reviewed ?? 0} / {progress?.total ?? 0}
          </Text>
        </HStack>

        {/* Card */}
        <ScrollView className="flex-1" contentContainerClassName="p-4 pb-8">
          <Box className="rounded-2xl bg-background-0 p-5">
            {/* Front */}
            <Text size="xs" className="mb-2 uppercase text-typography-400">
              Question
            </Text>
            <CardContent content={currentCard.card.front} fontSize={18} />

            {/* Back (if revealed) */}
            {showAnswer && (
              <>
                <Divider className="my-4" />
                <Text size="xs" className="mb-2 uppercase text-typography-400">
                  Answer
                </Text>
                <CardContent content={currentCard.card.back} fontSize={18} />
              </>
            )}
          </Box>

          {/* Deck info */}
          {currentCard.card.deckTitle && (
            <Text size="xs" className="mt-3 text-center text-typography-400">
              {currentCard.card.deckTitle}
            </Text>
          )}
        </ScrollView>

        {/* Actions */}
        <Box className="border-t border-outline-100 bg-background-0 p-4">
          {!showAnswer ? (
            <Button
              size="xl"
              action="primary"
              className="rounded-xl"
              onPress={handleReveal}
              testID="show-answer-button"
            >
              <ButtonText>Show Answer</ButtonText>
            </Button>
          ) : (
            <HStack className="gap-2">
              {GRADES.map(({ rating, label, hint, tone }) => (
                <Pressable
                  key={rating}
                  className={`flex-1 items-center rounded-xl p-3 ${tone}`}
                  onPress={() => handleGrade(rating)}
                  disabled={submitting}
                  testID={`grade-${rating.toLowerCase()}`}
                >
                  <Text size="md" className="font-semibold text-typography-0">
                    {label}
                  </Text>
                  <Text size="xs" className="text-typography-0 opacity-80">
                    {hint}
                  </Text>
                </Pressable>
              ))}
            </HStack>
          )}
        </Box>

        {/* Submitting overlay */}
        {submitting && (
          <Center className="absolute inset-0 bg-background-dark/30">
            <Spinner className="text-typography-0" />
          </Center>
        )}
      </Box>
    </>
  );
}
