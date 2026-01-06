import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { getDueCards, submitReview, type Card } from '@/lib/api';

type Rating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export default function ReviewScreen() {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDueCards = useCallback(async () => {
    try {
      setError(null);
      const { cards: dueCards } = await getDueCards();
      setCards(dueCards);
      setCurrentIndex(0);
      setShowAnswer(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDueCards();
    }, [fetchDueCards]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDueCards();
  };

  const handleRating = async (rating: Rating) => {
    const card = cards[currentIndex];
    if (!card || submitting) return;

    try {
      setSubmitting(true);
      await submitReview({ cardId: card.id, rating });

      // Move to next card or refetch
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        // Refetch to get any new due cards
        await fetchDueCards();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const currentCard = cards[currentIndex];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading due cards...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <ScrollView
        contentContainerStyle={styles.centered}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (!currentCard) {
    return (
      <ScrollView
        contentContainerStyle={styles.centered}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.emptyIcon}>🎉</Text>
        <Text style={styles.emptyTitle}>All caught up!</Text>
        <Text style={styles.emptyText}>No cards due for review right now.</Text>
        <Text style={styles.emptyHint}>
          Pull down to refresh or add cards in the Decks tab.
        </Text>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progress}>
        <Text style={styles.progressText}>
          Card {currentIndex + 1} of {cards.length}
        </Text>
        {currentCard.deckTitle && (
          <Text style={styles.deckTitle}>{currentCard.deckTitle}</Text>
        )}
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Question</Text>
        <Text style={styles.cardText}>{currentCard.front}</Text>

        {showAnswer && (
          <>
            <View style={styles.divider} />
            <Text style={styles.cardLabel}>Answer</Text>
            <Text style={styles.cardText}>{currentCard.back}</Text>
          </>
        )}
      </View>

      {/* Actions */}
      {!showAnswer ? (
        <TouchableOpacity
          style={styles.showAnswerButton}
          onPress={() => setShowAnswer(true)}
        >
          <Text style={styles.showAnswerText}>Show Answer</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.ratingButtons}>
          <TouchableOpacity
            style={[styles.ratingButton, styles.againButton]}
            onPress={() => handleRating('AGAIN')}
            disabled={submitting}
          >
            <Text style={styles.ratingButtonText}>Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ratingButton, styles.hardButton]}
            onPress={() => handleRating('HARD')}
            disabled={submitting}
          >
            <Text style={styles.ratingButtonText}>Hard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ratingButton, styles.goodButton]}
            onPress={() => handleRating('GOOD')}
            disabled={submitting}
          >
            <Text style={styles.ratingButtonText}>Good</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ratingButton, styles.easyButton]}
            onPress={() => handleRating('EASY')}
            disabled={submitting}
          >
            <Text style={styles.ratingButtonText}>Easy</Text>
          </TouchableOpacity>
        </View>
      )}

      {submitting && (
        <View style={styles.submittingOverlay}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
  emptyHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  progress: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  deckTitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  showAnswerButton: {
    backgroundColor: '#2196f3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  showAnswerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  ratingButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  ratingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  againButton: {
    backgroundColor: '#d32f2f',
  },
  hardButton: {
    backgroundColor: '#f57c00',
  },
  goodButton: {
    backgroundColor: '#388e3c',
  },
  easyButton: {
    backgroundColor: '#1976d2',
  },
  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
});
