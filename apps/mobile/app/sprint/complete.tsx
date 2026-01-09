/**
 * Sprint Complete Screen
 *
 * Displays completion feedback after finishing a sprint.
 * Shows stats and provides "Done" and "One More Sprint" actions.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { startSprint, ApiError, type SprintSource } from '@/lib/api';

export default function SprintCompleteScreen() {
  const {
    returnTo,
    launchSource,
    deckId,
    totalCards,
    reviewedCards,
    passCount,
    failCount,
    durationSeconds,
  } = useLocalSearchParams<{
    returnTo?: string;
    launchSource?: string;
    deckId?: string;
    totalCards?: string;
    reviewedCards?: string;
    passCount?: string;
    failCount?: string;
    durationSeconds?: string;
  }>();

  const [startingNewSprint, setStartingNewSprint] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse stats from params
  const stats = {
    totalCards: parseInt(totalCards ?? '0', 10),
    reviewedCards: parseInt(reviewedCards ?? '0', 10),
    passCount: parseInt(passCount ?? '0', 10),
    failCount: parseInt(failCount ?? '0', 10),
    durationSeconds: parseInt(durationSeconds ?? '0', 10),
  };

  const handleDone = () => {
    // Navigate back to the launch context
    const destination = returnTo ?? '/';
    router.replace(destination);
  };

  const handleOneMoreSprint = async () => {
    if (startingNewSprint) return;

    setStartingNewSprint(true);
    setError(null);

    try {
      // Determine source and deckId for the new sprint
      const source: SprintSource = launchSource === 'DECK' ? 'DECK' : 'HOME';
      const newSprintDeckId = source === 'DECK' && deckId ? deckId : undefined;

      const { sprint } = await startSprint({
        deckId: newSprintDeckId,
        source,
      });

      // Replace current screen with new sprint review
      router.replace({
        pathname: '/sprint/[id]',
        params: {
          id: sprint.id,
          returnTo: returnTo ?? '/',
          launchSource: launchSource ?? 'HOME',
          deckId: deckId ?? '',
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NO_ELIGIBLE_CARDS') {
        setError('No more cards are due for review right now.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to start new sprint');
      }
      setStartingNewSprint(false);
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Success Icon */}
        <Text style={styles.emoji}>🎉</Text>

        {/* Title */}
        <Text style={styles.title}>Sprint Complete!</Text>

        {/* Stats */}
        {stats.totalCards > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Cards reviewed</Text>
              <Text style={styles.statValue}>{stats.reviewedCards}</Text>
            </View>

            {stats.passCount > 0 && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Passed</Text>
                <Text style={[styles.statValue, styles.passValue]}>
                  {stats.passCount}
                </Text>
              </View>
            )}

            {stats.failCount > 0 && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Need review</Text>
                <Text style={[styles.statValue, styles.failValue]}>
                  {stats.failCount}
                </Text>
              </View>
            )}

            {stats.durationSeconds > 0 && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Time</Text>
                <Text style={styles.statValue}>
                  {formatDuration(stats.durationSeconds)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Error message */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleDone}
            disabled={startingNewSprint}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.oneMoreButton,
              startingNewSprint && styles.buttonDisabled,
            ]}
            onPress={handleOneMoreSprint}
            disabled={startingNewSprint}
          >
            {startingNewSprint ? (
              <ActivityIndicator color="#2196f3" size="small" />
            ) : (
              <Text style={styles.oneMoreButtonText}>One More Sprint</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Encouragement */}
        <Text style={styles.encouragement}>
          Great job! Every review strengthens your memory.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    marginBottom: 24,
  },
  // Stats
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 300,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  passValue: {
    color: '#4CAF50',
  },
  failValue: {
    color: '#f44336',
  },
  // Error
  errorText: {
    fontSize: 14,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  // Actions
  actionsContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
  },
  doneButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  oneMoreButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2196f3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  oneMoreButtonText: {
    color: '#2196f3',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Encouragement
  encouragement: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 20,
  },
});
