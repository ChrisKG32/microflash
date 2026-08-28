/**
 * Deck Detail Screen
 *
 * Shows deck information, cards list, and allows:
 * - Starting a sprint for this deck
 * - Navigating to card editor (create/edit)
 * - Adjusting deck priority
 */

import { useState, useCallback } from 'react';
import {
  useLocalSearchParams,
  Stack,
  router,
  useFocusEffect,
} from 'expo-router';

import { Box } from '@/components/ui/box';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { FlatList } from '@/components/ui/flat-list';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import {
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
} from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAppToast } from '@/components/feedback/use-app-toast';
import { ThemedRefreshControl } from '@/components/ui-app/themed-refresh-control';
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

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [priority, setPriority] = useState(50);
  const [savingPriority, setSavingPriority] = useState(false);
  const [startingSprintForDeck, setStartingSprintForDeck] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;

    try {
      setError(null);
      // Fetch deck and cards in parallel
      const [deckResponse, cardsResponse] = await Promise.all([
        getDeck(id),
        getCards(id),
      ]);
      setDeck(deckResponse.deck);
      setCards(cardsResponse.cards);
      setPriority(deckResponse.deck.priority);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deck');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handlePriorityChange = async (newPriority: number) => {
    if (!id || !deck) return;

    setSavingPriority(true);
    try {
      const { deck: updatedDeck } = await updateDeck(id, {
        priority: newPriority,
      });
      setDeck(updatedDeck);
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
        <Center className="flex-1 bg-background-50">
          <Spinner size="large" className="text-primary-500" />
          <Text size="md" className="mt-3 text-typography-500">
            Loading deck...
          </Text>
        </Center>
      </>
    );
  }

  if (error || !deck) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <Center className="flex-1 bg-background-50 p-5">
          <Text className="mb-4 text-4xl">!</Text>
          <Text size="md" className="mb-4 text-center text-error-700">
            {error || 'Deck not found'}
          </Text>
          <Button
            action="primary"
            onPress={handleRefresh}
            testID="retry-button"
          >
            <ButtonText>Retry</ButtonText>
          </Button>
        </Center>
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
          <HStack className="items-center justify-between">
            <Text size="md" className="font-semibold text-typography-900">
              Deck Priority
            </Text>
            <HStack className="items-center gap-2">
              <Text size="md" className="font-semibold text-primary-500">
                {priority}
              </Text>
              {savingPriority && (
                <Spinner size="small" className="text-primary-500" />
              )}
            </HStack>
          </HStack>
          {/* gluestack renames the community slider's props: minimumValue ->
              minValue, maximumValue -> maxValue, onValueChange -> onChange.
              The network write stays on onChangeEnd (was onSlidingComplete)
              so dragging doesn't fire a request per frame. */}
          <Slider
            className="my-3"
            minValue={0}
            maxValue={100}
            step={1}
            value={priority}
            onChange={setPriority}
            onChangeEnd={handlePriorityChange}
            testID="priority-slider"
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          <HStack className="justify-between">
            <Text size="xs" className="text-typography-400">
              Low
            </Text>
            <Text size="xs" className="text-typography-400">
              High
            </Text>
          </HStack>
          <Text size="xs" className="mt-2 text-typography-500">
            Higher priority decks have their cards appear first in sprints
          </Text>
        </Box>

        {/* Add Card Button */}
        <Button
          variant="link"
          action="primary"
          className="justify-start p-4"
          onPress={handleAddCard}
          testID="add-card-button"
        >
          <ButtonText>+ Add Card</ButtonText>
        </Button>

        {cards.length === 0 ? (
          <Center className="flex-1 p-5">
            <Heading size="lg" className="mb-2">
              No cards yet
            </Heading>
            <Text size="md" className="text-center text-typography-500">
              Add your first card to start learning!
            </Text>
          </Center>
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
