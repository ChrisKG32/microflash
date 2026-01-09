/**
 * Sprint Review Page
 *
 * Displays a sprint review session. Loads sprint by ID from the server.
 * Shows cards one at a time with reveal/grade flow.
 * Auto-completes when all cards are reviewed.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  getSprint,
  submitSprintReview,
  completeSprint,
  ApiError,
  type Sprint,
  type SprintCard,
  type Rating,
} from '@microflash/api-client';
import { CardContent } from '../components/CardContent';

export function SprintReviewPage() {
  const { sprintId } = useParams<{ sprintId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const returnTo = searchParams.get('returnTo') ?? '/';
  const launchSource = searchParams.get('launchSource') ?? 'HOME';
  const deckId = searchParams.get('deckId') ?? '';

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchSprint = useCallback(async () => {
    if (!sprintId) return;

    try {
      setError(null);
      const { sprint: fetchedSprint } = await getSprint(sprintId);
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
  }, [sprintId]);

  useEffect(() => {
    setLoading(true);
    setShowAnswer(false);
    fetchSprint();
  }, [fetchSprint]);

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
          // Use replace to match mobile navigation semantics
          navigate(
            `/sprint/${sprint.id}/complete?` +
              `returnTo=${encodeURIComponent(returnTo)}` +
              `&launchSource=${launchSource}` +
              `&deckId=${encodeURIComponent(deckId)}` +
              `&totalCards=${stats.totalCards}` +
              `&reviewedCards=${stats.reviewedCards}` +
              `&passCount=${stats.passCount}` +
              `&failCount=${stats.failCount}` +
              `&durationSeconds=${stats.durationSeconds ?? 0}`,
            { replace: true },
          );
        } catch {
          // Sprint might already be completed (idempotent)
          navigate(
            `/sprint/${sprint.id}/complete?` +
              `returnTo=${encodeURIComponent(returnTo)}` +
              `&launchSource=${launchSource}` +
              `&deckId=${encodeURIComponent(deckId)}`,
            { replace: true },
          );
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

  const handleGoBack = () => {
    navigate(returnTo, { replace: true });
  };

  const currentCard = getCurrentCard();
  const progress = sprint?.progress;

  if (loading) {
    return (
      <div className="page sprint-page">
        <div className="loading">Loading sprint...</div>
      </div>
    );
  }

  if (error || !sprint) {
    return (
      <div className="page sprint-page">
        <div className="sprint-error-state">
          <div className="sprint-error-icon">⚠️</div>
          <p className="sprint-error-text">{error || 'Sprint not found'}</p>
          <button className="btn btn-primary" onClick={handleGoBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    // All cards reviewed but didn't navigate yet
    return (
      <div className="page sprint-page">
        <div className="loading">Completing sprint...</div>
      </div>
    );
  }

  return (
    <div className="page sprint-page">
      <div className="sprint-header">
        <button className="btn btn-text" onClick={handleGoBack}>
          &larr; Exit
        </button>
        <h2 className="sprint-title">{sprint.deckTitle ?? 'Sprint Review'}</h2>
      </div>

      {/* Progress Bar */}
      <div className="sprint-progress-container">
        <div className="sprint-progress-bar">
          <div
            className="sprint-progress-fill"
            style={{
              width: `${((progress?.reviewed ?? 0) / (progress?.total ?? 1)) * 100}%`,
            }}
          />
        </div>
        <span className="sprint-progress-text">
          {progress?.reviewed ?? 0} / {progress?.total ?? 0}
        </span>
      </div>

      {/* Card */}
      <div className="sprint-card-container">
        <div className="sprint-card">
          {/* Front */}
          <div className="sprint-card-section">
            <span className="sprint-card-label">Question</span>
            <CardContent content={currentCard.card.front} />
          </div>

          {/* Back (if revealed) */}
          {showAnswer && (
            <>
              <div className="sprint-card-divider" />
              <div className="sprint-card-section">
                <span className="sprint-card-label">Answer</span>
                <CardContent content={currentCard.card.back} />
              </div>
            </>
          )}
        </div>

        {/* Deck info */}
        {currentCard.card.deckTitle && (
          <p className="sprint-deck-info">{currentCard.card.deckTitle}</p>
        )}
      </div>

      {/* Actions */}
      <div className="sprint-actions">
        {!showAnswer ? (
          <button className="btn btn-primary btn-large" onClick={handleReveal}>
            Show Answer
          </button>
        ) : (
          <div className="sprint-grade-buttons">
            <button
              className="btn sprint-grade-btn sprint-grade-again"
              onClick={() => handleGrade('AGAIN')}
              disabled={submitting}
            >
              <span className="sprint-grade-label">Again</span>
              <span className="sprint-grade-hint">Forgot</span>
            </button>
            <button
              className="btn sprint-grade-btn sprint-grade-hard"
              onClick={() => handleGrade('HARD')}
              disabled={submitting}
            >
              <span className="sprint-grade-label">Hard</span>
              <span className="sprint-grade-hint">Struggled</span>
            </button>
            <button
              className="btn sprint-grade-btn sprint-grade-good"
              onClick={() => handleGrade('GOOD')}
              disabled={submitting}
            >
              <span className="sprint-grade-label">Good</span>
              <span className="sprint-grade-hint">Correct</span>
            </button>
            <button
              className="btn sprint-grade-btn sprint-grade-easy"
              onClick={() => handleGrade('EASY')}
              disabled={submitting}
            >
              <span className="sprint-grade-label">Easy</span>
              <span className="sprint-grade-hint">Effortless</span>
            </button>
          </div>
        )}
      </div>

      {/* Submitting overlay */}
      {submitting && (
        <div className="sprint-submitting-overlay">
          <div className="sprint-submitting-spinner" />
        </div>
      )}
    </div>
  );
}
