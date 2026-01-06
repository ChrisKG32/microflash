/**
 * Review Session Screen
 *
 * Displays a review session for specific cards (from notification deep link).
 * Unlike the main Review tab which shows all due cards, this screen
 * only shows the specific cards passed via cardIds query parameter.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';

import { getCardsByIds, submitReview, snoozeCards, type Card } from '@/lib/api';

type Rating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export default function ReviewSessionScreen() {
  const { cardIds: cardIdsParam } = useLocalSearchParams<{ cardIds: string }>();

  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Parse cardIds from query param (comma-separated)
  const cardIds = useMemo(
    () => cardIdsParam?.split(',').filter(Boolean) || [],
    [cardIdsParam],
  );

  const fetchCards = useCallback(async () => {
    if (cardIds.length === 0) {
      setError('No cards specified');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { cards: fetchedCards } = await getCardsByIds(cardIds);

      if (fetchedCards.length === 0) {
        setError('Cards not found or already reviewed');
        setLoading(false);
        return;
      }

      setCards(fetchedCards);
      setCurrentIndex(0);
      setShowAnswer(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  }, [cardIds]);

  useEffect(() => {
    void fetchCards();
  }, [fetchCards]);

  const handleRating = async (rating: Rating) => {
    const card = cards[currentIndex];
    if (!card || submitting) return;

    try {
      setSubmitting(true);
      await submitReview({ cardId: card.id, rating });

      // Move to next card or complete session
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        setSessionComplete(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSnoozeAll = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      // Snooze all remaining cards (including current)
      const remainingCardIds = cards.slice(currentIndex).map((c) => c.id);
      await snoozeCards(remainingCardIds, 60); // 1 hour
      setSessionComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to snooze cards');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoHome = () => {
    router.replace('/');
  };

  const currentCard = cards[currentIndex];

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Review Session' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading cards...</Text>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Review Session' }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Text style={styles.homeButtonText}>Go to Review</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (sessionComplete) {
    return (
      <>
        <Stack.Screen options={{ title: 'Session Complete' }} />
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>Session Complete!</Text>
          <Text style={styles.emptyText}>
            You&apos;ve finished this review session.
          </Text>
          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Text style={styles.homeButtonText}>Continue Reviewing</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (!currentCard) {
    return (
      <>
        <Stack.Screen options={{ title: 'Review Session' }} />
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No cards to review</Text>
          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Text style={styles.homeButtonText}>Go to Review</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Review Session' }} />
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
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.showAnswerButton}
              onPress={() => setShowAnswer(true)}
            >
              <Text style={styles.showAnswerText}>Show Answer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.snoozeButton}
              onPress={handleSnoozeAll}
              disabled={submitting}
            >
              <Text style={styles.snoozeButtonText}>Snooze All (1h)</Text>
            </TouchableOpacity>
          </View>
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
    </>
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
  homeButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  homeButtonText: {
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
  actionButtons: {
    gap: 12,
    marginTop: 16,
  },
  showAnswerButton: {
    backgroundColor: '#2196f3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  showAnswerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  snoozeButton: {
    backgroundColor: '#757575',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  snoozeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
