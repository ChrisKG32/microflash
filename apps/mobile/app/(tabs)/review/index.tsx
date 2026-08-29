/**
 * Home Screen (Command Center)
 *
 * The primary entry point for the app. Shows:
 * - Due/overdue card counts
 * - Resume sprint CTA (if resumable sprint exists)
 * - Start Sprint button
 * - Empty state when nothing is due
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect, router } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { Icon, ChevronRightIcon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { ThemedRefreshControl } from '@/components/ui-app/themed-refresh-control';

import {
  getHomeSummary,
  startSprint,
  ApiError,
  type HomeSummary,
  type SprintSource,
} from '@/lib/api';

/**
 * Duration in milliseconds to show the resume CTA after Home becomes active.
 */
const RESUME_CTA_DURATION_MS = 5000;

export default function HomeScreen() {
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingSprintSource, setStartingSprintSource] =
    useState<SprintSource | null>(null);

  // Resume CTA visibility state
  const [showResumeCTA, setShowResumeCTA] = useState(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const { summary: fetchedSummary } = await getHomeSummary();
      setSummary(fetchedSummary);
      // Cleared on success rather than before the request, so a retry keeps
      // showing the error until real data replaces it. Clearing up front left
      // a window with no error, no summary and loading already false, which
      // renders as a flash of the "all caught up" empty state.
      setError(null);

      // Show resume CTA if there's a resumable sprint
      if (fetchedSummary.resumableSprint) {
        setShowResumeCTA(true);
        // Auto-hide after 5 seconds
        if (resumeTimerRef.current) {
          clearTimeout(resumeTimerRef.current);
        }
        resumeTimerRef.current = setTimeout(() => {
          setShowResumeCTA(false);
        }, RESUME_CTA_DURATION_MS);
      } else {
        setShowResumeCTA(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Refetch on every focus, but only the first load blocks on a spinner.
      // This used to setLoading(true) here, which swapped the whole rendered
      // screen for the full-screen "Loading..." centre every time Home
      // regained focus — returning from a sprint, from the avatar menu, or
      // just switching tabs. Against a local server the fetch resolves almost
      // immediately, so it read as a flash rather than a load.
      //
      // `loading` now only guards the initial render, where there genuinely
      // is nothing to show; a refocus refreshes underneath the current
      // content instead.
      fetchSummary();

      // Cleanup timer on unfocus
      return () => {
        if (resumeTimerRef.current) {
          clearTimeout(resumeTimerRef.current);
        }
      };
    }, [fetchSummary]),
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSummary();
  };

  const handleStartSprint = async () => {
    if (startingSprintSource) return; // Prevent double-tap

    setStartingSprintSource('HOME');
    try {
      const { sprint } = await startSprint({ source: 'HOME' });
      router.push({
        pathname: '/sprint/[id]',
        params: {
          id: sprint.id,
          returnTo: '/(tabs)/review',
          launchSource: 'HOME',
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NO_ELIGIBLE_CARDS') {
        // No eligible cards - refresh to show empty state
        fetchSummary();
      } else {
        setError(err instanceof Error ? err.message : 'Failed to start sprint');
      }
    } finally {
      setStartingSprintSource(null);
    }
  };

  const handleResumeSprint = () => {
    if (!summary?.resumableSprint) return;

    router.push({
      pathname: '/sprint/[id]',
      params: {
        id: summary.resumableSprint.id,
        returnTo: '/(tabs)/review',
        launchSource: 'HOME',
      },
    });
  };

  const handleReviewAhead = () => {
    router.push('/browse');
  };

  if (loading) {
    return (
      <Center className="flex-1 bg-background-50 p-5">
        <Spinner size="large" className="text-primary-500" />
        <Text size="md" className="mt-3 text-typography-500">
          Loading...
        </Text>
      </Center>
    );
  }

  if (error) {
    return (
      <ScrollView
        className="flex-1 bg-background-50"
        // The old style had flex:1 on the content container, which collapses
        // inside a ScrollView; flex-grow is what was actually intended.
        contentContainerClassName="flex-grow items-center justify-center p-5"
        refreshControl={
          <ThemedRefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <Text size="md" className="mb-4 text-center text-error-700">
          {error}
        </Text>
        <Button action="primary" onPress={handleRefresh} testID="retry-button">
          <ButtonText>Retry</ButtonText>
        </Button>
      </ScrollView>
    );
  }

  const hasDueCards = summary && summary.dueCount > 0;

  return (
    <ScrollView
      className="flex-1 bg-background-50"
      contentContainerClassName="p-4 pb-8"
      refreshControl={
        <ThemedRefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      }
    >
      {/* Resume Sprint CTA */}
      {showResumeCTA && summary?.resumableSprint && (
        <Pressable
          className="mb-4 flex-row items-center justify-between rounded-xl bg-success-500 p-4"
          onPress={handleResumeSprint}
          testID="resume-sprint-banner"
        >
          <VStack className="flex-1">
            <Heading size="md" className="mb-1 text-typography-0">
              Resume Sprint
            </Heading>
            <Text size="sm" className="text-typography-0 opacity-90">
              {summary.resumableSprint.progress.reviewed} of{' '}
              {summary.resumableSprint.progress.total} cards reviewed
              {summary.resumableSprint.deckTitle &&
                ` - ${summary.resumableSprint.deckTitle}`}
            </Text>
          </VStack>
          <Icon
            as={ChevronRightIcon}
            size="xl"
            className="ml-3 text-typography-0"
          />
        </Pressable>
      )}

      {/* Main Content */}
      {hasDueCards ? (
        <VStack className="items-center pt-10">
          {/* Due Count Card */}
          <Card
            variant="elevated"
            className="mb-6 w-full items-center rounded-2xl p-8"
          >
            <Text
              className="text-6xl font-bold text-primary-500"
              testID="due-count"
            >
              {summary.dueCount}
            </Text>
            <Text size="lg" className="mt-1 text-typography-500">
              cards due
            </Text>
            {summary.overdueCount > 0 && (
              <Text size="sm" className="mt-2 text-error-700">
                {summary.overdueCount} overdue
              </Text>
            )}
          </Card>

          {/* Start Sprint Button. Button's base style already dims when
              disabled, so the old buttonDisabled opacity rule is gone. */}
          <Button
            size="xl"
            action="primary"
            className="min-w-[200px] rounded-xl"
            onPress={handleStartSprint}
            isDisabled={!!startingSprintSource}
            testID="start-sprint-button"
          >
            {startingSprintSource ? (
              <ButtonSpinner className="text-typography-0" />
            ) : (
              <ButtonText size="lg">Start Sprint</ButtonText>
            )}
          </Button>
        </VStack>
      ) : (
        <VStack className="items-center pt-16">
          <Text className="mb-4 text-6xl">🎉</Text>
          <Heading size="xl" className="mb-2">
            You&apos;re all caught up!
          </Heading>
          <Text size="md" className="mb-6 text-center text-typography-500">
            No cards are due for review right now.
          </Text>
          <Button
            variant="outline"
            action="primary"
            onPress={handleReviewAhead}
            testID="review-ahead-button"
          >
            <ButtonText>Review Ahead</ButtonText>
          </Button>
        </VStack>
      )}

      {/* Notification Status (subtle) */}
      {summary && !summary.notificationsEnabled && (
        <Box className="mt-6 rounded-lg bg-background-warning p-3">
          <Text size="sm" className="text-center text-warning-700">
            Notifications are disabled. Enable them in Settings to get reminded
            when cards are due.
          </Text>
        </Box>
      )}
    </ScrollView>
  );
}
