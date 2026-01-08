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
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import Slider from '@react-native-community/slider';

import {
  getCards,
  getDeck,
  updateDeck,
  startSprint,
  type Card,
  type Deck,
} from '@/lib/api';

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

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
      Alert.alert(
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
      pathname: '/card/new',
      params: {
        deckId: id,
        returnTo: `/deck/${id}`,
      },
    });
  };

  const handleEditCard = (cardId: string) => {
    if (!id) return;
    router.push({
      pathname: '/card/[id]',
      params: {
        id: cardId,
        returnTo: `/deck/${id}`,
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
          returnTo: `/deck/${id}`,
          launchSource: 'DECK',
          deckId: id,
        },
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('No cards')) {
        Alert.alert(
          'No Cards Due',
          'There are no cards due for review in this deck right now.',
        );
      } else {
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'Failed to start sprint',
        );
      }
    } finally {
      setStartingSprintForDeck(false);
    }
  };

  const renderCard = ({ item }: { item: Card }) => (
    <TouchableOpacity
      style={styles.cardItem}
      onPress={() => handleEditCard(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardLabel}>Front</Text>
        <Text style={styles.cardText} numberOfLines={2}>
          {item.front}
        </Text>
        <Text style={[styles.cardLabel, styles.backLabel]}>Back</Text>
        <Text style={styles.cardText} numberOfLines={2}>
          {item.back}
        </Text>
      </View>
      <View style={styles.cardMeta}>
        <View style={styles.cardMetaLeft}>
          <Text style={styles.cardState}>{item.state}</Text>
          <Text style={styles.cardPriority}>P: {item.priority}</Text>
        </View>
        <Text style={styles.cardReps}>
          {item.reps} reps · {item.lapses} lapses
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading deck...</Text>
        </View>
      </>
    );
  }

  if (error || !deck) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorText}>{error || 'Deck not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
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
      <View style={styles.container}>
        {/* Start Sprint for Deck Button */}
        {cards.length > 0 && (
          <View style={styles.sprintSection}>
            <TouchableOpacity
              style={[
                styles.startSprintButton,
                (startingSprintForDeck || dueCardsCount === 0) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleStartSprintForDeck}
              disabled={startingSprintForDeck || dueCardsCount === 0}
            >
              {startingSprintForDeck ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.startSprintButtonText}>
                    Start Sprint for This Deck
                  </Text>
                  {dueCardsCount > 0 ? (
                    <Text style={styles.dueCountText}>
                      {dueCardsCount} card{dueCardsCount !== 1 ? 's' : ''} due
                    </Text>
                  ) : (
                    <Text style={styles.noDueText}>No cards due</Text>
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Deck Priority Slider */}
        <View style={styles.prioritySection}>
          <View style={styles.priorityHeader}>
            <Text style={styles.priorityLabel}>Deck Priority</Text>
            <View style={styles.priorityValueContainer}>
              <Text style={styles.priorityValue}>{priority}</Text>
              {savingPriority && (
                <ActivityIndicator
                  size="small"
                  color="#2196f3"
                  style={styles.savingIndicator}
                />
              )}
            </View>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            step={1}
            value={priority}
            onValueChange={setPriority}
            onSlidingComplete={handlePriorityChange}
            minimumTrackTintColor="#2196f3"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#2196f3"
          />
          <View style={styles.priorityLabels}>
            <Text style={styles.priorityLabelText}>Low</Text>
            <Text style={styles.priorityLabelText}>High</Text>
          </View>
          <Text style={styles.priorityHint}>
            Higher priority decks have their cards appear first in sprints
          </Text>
        </View>

        {/* Add Card Button */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddCard}>
          <Text style={styles.addButtonText}>+ Add Card</Text>
        </TouchableOpacity>

        {cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No cards yet</Text>
            <Text style={styles.emptyText}>
              Add your first card to start learning!
            </Text>
          </View>
        ) : (
          <FlatList
            data={cards}
            renderItem={renderCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // Sprint Section
  sprintSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  startSprintButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startSprintButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dueCountText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    marginTop: 4,
  },
  noDueText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    marginTop: 4,
  },
  // Priority Section
  prioritySection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  priorityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  priorityValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196f3',
  },
  savingIndicator: {
    marginLeft: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  priorityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  priorityLabelText: {
    fontSize: 12,
    color: '#999',
  },
  priorityHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  // Common
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 48,
    color: '#d32f2f',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  addButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  addButtonText: {
    fontSize: 16,
    color: '#2196f3',
    fontWeight: '600',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  cardItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 11,
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  backLabel: {
    marginTop: 12,
  },
  cardText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cardMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardState: {
    fontSize: 12,
    color: '#2196f3',
    fontWeight: '600',
  },
  cardPriority: {
    fontSize: 12,
    color: '#999',
  },
  cardReps: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
