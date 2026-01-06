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
import { useFocusEffect, router } from 'expo-router';

import { getDecks, createDeck, type Deck } from '@/lib/api';

export default function DecksScreen() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create deck form
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchDecks = useCallback(async () => {
    try {
      setError(null);
      const { decks: fetchedDecks } = await getDecks();
      setDecks(fetchedDecks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load decks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDecks();
    }, [fetchDecks]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDecks();
  };

  const handleCreateDeck = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'Please enter a deck title');
      return;
    }

    try {
      setCreating(true);
      await createDeck({ title: newTitle.trim() });
      setNewTitle('');
      setShowForm(false);
      await fetchDecks();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create deck',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDeckPress = (deck: Deck) => {
    router.push(`/deck/${deck.id}`);
  };

  const renderDeck = ({ item }: { item: Deck }) => (
    <TouchableOpacity
      style={styles.deckItem}
      onPress={() => handleDeckPress(item)}
    >
      <View style={styles.deckInfo}>
        <Text style={styles.deckTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.deckDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
      </View>
      <View style={styles.deckMeta}>
        <Text style={styles.cardCount}>{item.cardCount} cards</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading decks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Create Deck Form */}
      {showForm ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Deck title"
            value={newTitle}
            onChangeText={setNewTitle}
            autoFocus
            editable={!creating}
          />
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowForm(false);
                setNewTitle('');
              }}
              disabled={creating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, creating && styles.buttonDisabled]}
              onPress={handleCreateDeck}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.createButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.addButtonText}>+ New Deck</Text>
        </TouchableOpacity>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : decks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>No decks yet</Text>
          <Text style={styles.emptyText}>
            Create your first deck to start learning!
          </Text>
        </View>
      ) : (
        <FlatList
          data={decks}
          renderItem={renderDeck}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
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
  deckItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  deckInfo: {
    flex: 1,
  },
  deckTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  deckDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  deckMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardCount: {
    fontSize: 14,
    color: '#999',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
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
