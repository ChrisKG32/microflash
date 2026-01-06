import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';

import { getCards, createCard, type Card } from '@/lib/api';

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create card form
  const [showForm, setShowForm] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [creating, setCreating] = useState(false);

  const deckTitle = cards[0]?.deckTitle || 'Deck';

  const fetchCards = useCallback(async () => {
    if (!id) return;

    try {
      setError(null);
      const { cards: fetchedCards } = await getCards(id);
      setCards(fetchedCards);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchCards();
    }, [fetchCards]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCards();
  };

  const handleCreateCard = async () => {
    if (!front.trim() || !back.trim()) {
      Alert.alert('Error', 'Please enter both front and back of the card');
      return;
    }

    if (!id) return;

    try {
      setCreating(true);
      await createCard({
        front: front.trim(),
        back: back.trim(),
        deckId: id,
      });
      setFront('');
      setBack('');
      setShowForm(false);
      await fetchCards();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create card',
      );
    } finally {
      setCreating(false);
    }
  };

  const renderCard = ({ item }: { item: Card }) => (
    <View style={styles.cardItem}>
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
        <Text style={styles.cardState}>{item.state}</Text>
        <Text style={styles.cardReps}>
          {item.reps} reps · {item.lapses} lapses
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading cards...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: deckTitle }} />
      <View style={styles.container}>
        {/* Create Card Form */}
        {showForm ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Front (question)"
              value={front}
              onChangeText={setFront}
              multiline
              autoFocus
              editable={!creating}
            />
            <TextInput
              style={styles.input}
              placeholder="Back (answer)"
              value={back}
              onChangeText={setBack}
              multiline
              editable={!creating}
            />
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowForm(false);
                  setFront('');
                  setBack('');
                }}
                disabled={creating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, creating && styles.buttonDisabled]}
                onPress={handleCreateCard}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createButtonText}>Add Card</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.addButtonText}>+ Add Card</Text>
          </TouchableOpacity>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRefresh}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🃏</Text>
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
  form: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  createButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2196f3',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    color: '#fff',
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
  cardState: {
    fontSize: 12,
    color: '#2196f3',
    fontWeight: '600',
  },
  cardReps: {
    fontSize: 12,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
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
