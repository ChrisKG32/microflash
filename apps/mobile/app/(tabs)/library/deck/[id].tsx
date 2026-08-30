/**
 * Deck Detail Screen
 *
 * Shows deck information, cards list, and allows:
 * - Starting a sprint for this deck
 * - Navigating to card editor (create/edit)
 * - Adjusting deck priority
 */

import { useState, useCallback } from 'react';
import { useLocalSearchParams, Stack, router } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAppToast } from '@/components/feedback/use-app-toast';
import { LabeledSlider } from '@/components/ui-app/labeled-slider';
import { ScreenLoading, ScreenMessage } from '@/components/ui-app/screen-state';
import { ThemedRefreshControl } from '@/components/ui-app/themed-refresh-control';
import { useRefreshableQuery } from '@/hooks/use-refreshable-query';
import {
  getCards,
  getDeck,
  updateDeck,
  startSprint,
  ApiError,
  type Card,
  type Deck,
} from '@/lib/api';

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const notify = useAppToast();

  const [priority, setPriority] = useState(50);
  const [savingPriority, setSavingPriority] = useState(false);
  const [startingSprintForDeck, setStartingSprintForDeck] = useState(false);

  const fetchData = useCallback(async () => {
    // Guard inside the fetcher so the hook's finally still clears `loading`.
    // As a bare early return this left the screen on its spinner forever
    // whenever the route param was missing — no error, no retry.
    if (!id) throw new Error('Deck not found');

    // Fetch deck and cards in parallel
    const [deckResponse, cardsResponse] = await Promise.all([
      getDeck(id),
      getCards(id),
    ]);
    return { deck: deckResponse.deck, cards: cardsResponse.cards };
  }, [id]);

  const syncPriority = useCallback(
    ({ deck: fetched }: { deck: Deck; cards: Card[] }) =>
      setPriority(fetched.priority),
    [],
  );

  const {
    data,
    setData,
    loading,
    refreshing,
    error,
    refresh: handleRefresh,
  } = useRefreshableQuery(fetchData, 'Failed to load deck', {
    onSuccess: syncPriority,
  });
  const deck = data?.deck ?? null;
  const cards = data?.cards ?? [];

  const handlePriorityChange = async (newPriority: number) => {
    if (!id || !deck) return;

    setSavingPriority(true);
    try {
      const { deck: updatedDeck } = await updateDeck(id, {
        priority: newPriority,
      });
      setData((prev) => (prev ? { ...prev, deck: updatedDeck } : prev));
      setPriority(updatedDeck.priority);
    } catch (err) {
      // Revert on error
      setPriority(deck.priority);
      notify.error(
        'Error',
        err instanceof Error ? err.message : 'Failed to update priority',
      );
    } finally {
      setSavingPriority(false);
    }
  };

  const handleAddCard = () => {
    if (!id) return;
    router.push({
      pathname: '/(tabs)/library/card/new',
      params: {
        deckId: id,
        returnTo: `/(tabs)/library/deck/${id}`,
      },
    });
  };

  const handleEditCard = (cardId: string) => {
    if (!id) return;
    router.push({
      pathname: '/(tabs)/library/card/[id]',
      params: {
        id: cardId,
        returnTo: `/(tabs)/library/deck/${id}`,
      },
    });
  };

  const handleStartSprintForDeck = async () => {
    if (!id || startingSprintForDeck) return;

    setStartingSprintForDeck(true);
    try {
      const { sprint } = await startSprint({
        deckId: id,
        source: 'DECK',
      });

      router.push({
        pathname: '/sprint/[id]',
        params: {
          id: sprint.id,
          returnTo: `/(tabs)/library/deck/${id}`,
          launchSource: 'DECK',
          deckId: id,
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NO_ELIGIBLE_CARDS') {
        notify.info(
          'No Cards Due',
          'There are no cards due for review in this deck right now.',
        );
      } else {
        notify.error(
          'Error',
          err instanceof Error ? err.message : 'Failed to start sprint',
        );
      }
    } finally {
      setStartingSprintForDeck(false);
    }
  };

  const renderCard = ({ item }: { item: Card }) => (
    <Pressable
      className="rounded-xl bg-background-0 p-4"
      onPress={() => handleEditCard(item.id)}
      testID={`card-${item.id}`}
    >
      <VStack>
        <Text size="xs" className="uppercase text-typography-400">
          Front
        </Text>
        <Text size="md" className="text-typography-900" numberOfLines={2}>
          {item.front}
        </Text>
        <Text size="xs" className="mt-2 uppercase text-typography-400">
          Back
        </Text>
        <Text size="md" className="text-typography-900" numberOfLines={2}>
          {item.back}
        </Text>
      </VStack>
      <HStack className="mt-3 items-center justify-between">
        <HStack className="items-center gap-2">
          <Text size="xs" className="text-typography-500">
            {item.state}
          </Text>
          <Text size="xs" className="text-typography-500">
            P: {item.priority}
          </Text>
        </HStack>
        <Text size="xs" className="text-typography-400">
          {item.reps} reps · {item.lapses} lapses
        </Text>
      </HStack>
    </Pressable>
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ScreenLoading label="Loading deck..." />
      </>
    );
  }

  if (error || !deck) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <ScreenMessage
          glyph="!"
          glyphClassName="mb-4 text-4xl"
          tone="error"
          body={error || 'Deck not found'}
          actionLabel="Retry"
          onAction={handleRefresh}
          actionTestID="retry-button"
        />
      </>
    );
  }

  // Count due cards in this deck
  const dueCardsCount = cards.filter((card) => {
    const nextReview = new Date(card.nextReview);
    return nextReview <= new Date();
  }).length;

  return (
    <>
      <Stack.Screen options={{ title: deck.title }} />
      <Box className="flex-1 bg-background-50">
        {/* Start Sprint for Deck Button */}
        {cards.length > 0 && (
          <Box className="border-b border-outline-100 bg-background-0 p-4">
            <Pressable
              className="items-center rounded-xl bg-success-500 p-4 disabled:opacity-40"
              onPress={handleStartSprintForDeck}
              disabled={startingSprintForDeck || dueCardsCount === 0}
              testID="start-deck-sprint-button"
            >
              {startingSprintForDeck ? (
                <Spinner className="text-typography-0" />
              ) : (
                <>
                  <Text size="md" className="font-semibold text-typography-0">
                    Start Sprint for This Deck
                  </Text>
                  {dueCardsCount > 0 ? (
                    <Text
                      size="sm"
                      className="mt-1 text-typography-0 opacity-90"
                    >
                      {dueCardsCount} card{dueCardsCount !== 1 ? 's' : ''} due
                    </Text>
                  ) : (
                    <Text
                      size="sm"
                      className="mt-1 text-typography-0 opacity-70"
                    >
                      No cards due
                    </Text>
                  )}
                </>
              )}
            </Pressable>
          </Box>
        )}

        {/* Deck Priority Slider */}
        <Box className="border-b border-outline-100 bg-background-0 p-4">
          {/* The network write stays on onChangeEnd so dragging doesn't fire
              a request per frame. */}
          <LabeledSlider
            label="Deck Priority"
            labelSize="md"
            value={priority}
            busy={savingPriority}
            minValue={0}
            maxValue={100}
            onChange={setPriority}
            onChangeEnd={handlePriorityChange}
            endLabels={['Low', 'High']}
            hint="Higher priority decks have their cards appear first in sprints"
            testID="priority-slider"
          />
        </Box>

        {/* Add Card Button */}
        <Button
          variant="link"
          action="primary"
          // px only, not p-4: Button keeps size="md"'s fixed h-10, so
          // vertical padding leaves ~8px of content box and clips the label.
          // Vertical spacing goes on the margin instead.
          className="my-2 justify-start px-4"
          onPress={handleAddCard}
          testID="add-card-button"
        >
          <ButtonText>+ Add Card</ButtonText>
        </Button>

        {cards.length === 0 ? (
          <ScreenMessage
            className="flex-1 p-5"
            title="No cards yet"
            body="Add your first card to start learning!"
          />
        ) : (
          <FlatList
            data={cards}
            renderItem={renderCard}
            keyExtractor={(item: Card) => item.id}
            contentContainerClassName="gap-3 p-4"
            refreshControl={
              <ThemedRefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
          />
        )}
      </Box>
    </>
  );
}
