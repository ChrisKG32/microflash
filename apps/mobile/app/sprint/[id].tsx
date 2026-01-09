/**
 * Sprint Review Screen
 *
 * Displays a sprint review session. Loads sprint by ID from the server.
 * Shows cards one at a time with reveal/grade flow.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useFocusEffect } from 'expo-router';

import {
  getSprint,
  submitSprintReview,
  completeSprint,
  ApiError,
  type Sprint,
  type SprintCard,
  type Rating,
} from '@/lib/api';
import { CardContent } from '@/components/CardContent';

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
    if (!id) return;

    try {
      setError(null);
      const { sprint: fetchedSprint } = await getSprint(id);
      setSprint(fetchedSprint);

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
      setLoading(true);
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
        } catch (completeErr) {
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
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2196f3" />
          <Text style={styles.loadingText}>Loading sprint...</Text>
        </View>
      </>
    );
  }

  if (error || !sprint) {
    return (
      <>
        <Stack.Screen options={{ title: 'Sprint Review' }} />
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || 'Sprint not found'}</Text>
          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Text style={styles.homeButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (!currentCard) {
    // All cards reviewed but didn't navigate yet
    return (
      <>
        <Stack.Screen options={{ title: 'Sprint Review' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2196f3" />
          <Text style={styles.loadingText}>Completing sprint...</Text>
        </View>
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
      <View style={styles.container}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((progress?.reviewed ?? 0) / (progress?.total ?? 1)) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress?.reviewed ?? 0} / {progress?.total ?? 0}
          </Text>
        </View>

        {/* Card */}
        <ScrollView
          style={styles.cardContainer}
          contentContainerStyle={styles.cardContent}
        >
          <View style={styles.card}>
            {/* Front */}
            <Text style={styles.cardLabel}>Question</Text>
            <CardContent
              content={currentCard.card.front}
              fontSize={18}
              color="#333"
            />

            {/* Back (if revealed) */}
            {showAnswer && (
              <>
                <View style={styles.divider} />
                <Text style={styles.cardLabel}>Answer</Text>
                <CardContent
                  content={currentCard.card.back}
                  fontSize={18}
                  color="#333"
                />
              </>
            )}
          </View>

          {/* Deck info */}
          {currentCard.card.deckTitle && (
            <Text style={styles.deckInfo}>{currentCard.card.deckTitle}</Text>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {!showAnswer ? (
            <TouchableOpacity
              style={styles.revealButton}
              onPress={handleReveal}
            >
              <Text style={styles.revealButtonText}>Show Answer</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.gradeButtons}>
              <TouchableOpacity
                style={[styles.gradeButton, styles.againButton]}
                onPress={() => handleGrade('AGAIN')}
                disabled={submitting}
              >
                <Text style={styles.gradeButtonText}>Again</Text>
                <Text style={styles.gradeButtonHint}>Forgot</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gradeButton, styles.hardButton]}
                onPress={() => handleGrade('HARD')}
                disabled={submitting}
              >
                <Text style={styles.gradeButtonText}>Hard</Text>
                <Text style={styles.gradeButtonHint}>Struggled</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gradeButton, styles.goodButton]}
                onPress={() => handleGrade('GOOD')}
                disabled={submitting}
              >
                <Text style={styles.gradeButtonText}>Good</Text>
                <Text style={styles.gradeButtonHint}>Correct</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gradeButton, styles.easyButton]}
                onPress={() => handleGrade('EASY')}
                disabled={submitting}
              >
                <Text style={styles.gradeButtonText}>Easy</Text>
                <Text style={styles.gradeButtonHint}>Effortless</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submitting overlay */}
        {submitting && (
          <View style={styles.submittingOverlay}>
            <ActivityIndicator color="#fff" size="small" />
          </View>
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
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  homeButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    minWidth: 50,
    textAlign: 'right',
  },
  // Card
  cardContainer: {
    flex: 1,
  },
  cardContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
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
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 26,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  deckInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },
  // Actions
  actionsContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  revealButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  revealButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  gradeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  gradeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  gradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  gradeButtonHint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    marginTop: 2,
  },
  againButton: {
    backgroundColor: '#f44336',
  },
  hardButton: {
    backgroundColor: '#ff9800',
  },
  goodButton: {
    backgroundColor: '#4CAF50',
  },
  easyButton: {
    backgroundColor: '#2196f3',
  },
  // Submitting overlay
  submittingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
