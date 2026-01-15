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
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';

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
      setError(null);
      const { summary: fetchedSummary } = await getHomeSummary();
      setSummary(fetchedSummary);

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
      setLoading(true);
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading...</Text>
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

  const hasDueCards = summary && summary.dueCount > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Resume Sprint CTA */}
      {showResumeCTA && summary?.resumableSprint && (
        <TouchableOpacity
          style={styles.resumeBanner}
          onPress={handleResumeSprint}
        >
          <View style={styles.resumeContent}>
            <Text style={styles.resumeTitle}>Resume Sprint</Text>
            <Text style={styles.resumeSubtext}>
              {summary.resumableSprint.progress.reviewed} of{' '}
              {summary.resumableSprint.progress.total} cards reviewed
              {summary.resumableSprint.deckTitle &&
                ` - ${summary.resumableSprint.deckTitle}`}
            </Text>
          </View>
          <Text style={styles.resumeArrow}>{'>'}</Text>
        </TouchableOpacity>
      )}

      {/* Main Content */}
      {hasDueCards ? (
        <View style={styles.dueSection}>
          {/* Due Count Card */}
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>{summary.dueCount}</Text>
            <Text style={styles.statsLabel}>cards due</Text>
            {summary.overdueCount > 0 && (
              <Text style={styles.overdueText}>
                {summary.overdueCount} overdue
              </Text>
            )}
          </View>

          {/* Start Sprint Button */}
          <TouchableOpacity
            style={[
              styles.startButton,
              startingSprintSource && styles.buttonDisabled,
            ]}
            onPress={handleStartSprint}
            disabled={!!startingSprintSource}
          >
            {startingSprintSource ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.startButtonText}>Start Sprint</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptySection}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>You&apos;re all caught up!</Text>
          <Text style={styles.emptyText}>
            No cards are due for review right now.
          </Text>
          <TouchableOpacity
            style={styles.reviewAheadButton}
            onPress={handleReviewAhead}
          >
            <Text style={styles.reviewAheadText}>Review Ahead</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notification Status (subtle) */}
      {summary && !summary.notificationsEnabled && (
        <View style={styles.notificationWarning}>
          <Text style={styles.notificationWarningText}>
            Notifications are disabled. Enable them in Settings to get reminded
            when cards are due.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
  // Resume Banner
  resumeBanner: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resumeContent: {
    flex: 1,
  },
  resumeTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  resumeSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  resumeArrow: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 12,
  },
  // Due Section
  dueSection: {
    alignItems: 'center',
    paddingTop: 40,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsNumber: {
    fontSize: 64,
    fontWeight: '700',
    color: '#2196f3',
  },
  statsLabel: {
    fontSize: 18,
    color: '#666',
    marginTop: 4,
  },
  overdueText: {
    fontSize: 14,
    color: '#f44336',
    marginTop: 8,
  },
  startButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Empty Section
  emptySection: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  reviewAheadButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2196f3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  reviewAheadText: {
    color: '#2196f3',
    fontSize: 16,
    fontWeight: '600',
  },
  // Notification Warning
  notificationWarning: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 24,
  },
  notificationWarningText: {
    color: '#E65100',
    fontSize: 14,
    textAlign: 'center',
  },
});
