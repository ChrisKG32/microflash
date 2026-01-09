/**
 * Sprint Complete Page
 *
 * Shows completion stats after a sprint is finished.
 * Provides options to return home or start another sprint.
 */

import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { startSprint, ApiError } from '@microflash/api-client';

export function SprintCompletePage() {
  const { sprintId } = useParams<{ sprintId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const returnTo = searchParams.get('returnTo') ?? '/';
  const launchSource = searchParams.get('launchSource') ?? 'HOME';
  const deckId = searchParams.get('deckId') ?? '';

  // Stats from query params (passed from review page)
  const totalCards = searchParams.get('totalCards');
  const reviewedCards = searchParams.get('reviewedCards');
  const passCount = searchParams.get('passCount');
  const failCount = searchParams.get('failCount');
  const durationSeconds = searchParams.get('durationSeconds');

  const [startingNew, setStartingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasStats = totalCards !== null;

  const handleDone = () => {
    // Use replace to match mobile navigation semantics
    navigate(returnTo, { replace: true });
  };

  const handleOneMore = async () => {
    setStartingNew(true);
    setError(null);

    try {
      // If launched from DECK, start a deck-constrained sprint
      // Otherwise (HOME or PUSH), start a global sprint
      const source = launchSource === 'DECK' ? 'DECK' : 'HOME';
      const { sprint } = await startSprint({
        deckId: launchSource === 'DECK' && deckId ? deckId : undefined,
        source: source as 'HOME' | 'DECK' | 'PUSH',
      });

      // Use replace to match mobile navigation semantics
      navigate(
        `/sprint/${sprint.id}?` +
          `returnTo=${encodeURIComponent(returnTo)}` +
          `&launchSource=${source}` +
          `&deckId=${encodeURIComponent(deckId)}`,
        { replace: true },
      );
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'NO_ELIGIBLE_CARDS') {
          setError('No more cards are due for review right now.');
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to start new sprint');
      }
    } finally {
      setStartingNew(false);
    }
  };

  // Format duration as mm:ss
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="page sprint-page">
      <div className="sprint-complete-container">
        <div className="sprint-complete-icon">🎉</div>
        <h2 className="sprint-complete-title">Sprint Complete!</h2>

        {hasStats && (
          <div className="sprint-complete-stats">
            <div className="sprint-stat">
              <span className="sprint-stat-value">{reviewedCards}</span>
              <span className="sprint-stat-label">Cards Reviewed</span>
            </div>
            {passCount !== null && failCount !== null && (
              <>
                <div className="sprint-stat sprint-stat-pass">
                  <span className="sprint-stat-value">{passCount}</span>
                  <span className="sprint-stat-label">Passed</span>
                </div>
                <div className="sprint-stat sprint-stat-fail">
                  <span className="sprint-stat-value">{failCount}</span>
                  <span className="sprint-stat-label">Failed</span>
                </div>
              </>
            )}
            {durationSeconds && Number(durationSeconds) > 0 && (
              <div className="sprint-stat">
                <span className="sprint-stat-value">
                  {formatDuration(Number(durationSeconds))}
                </span>
                <span className="sprint-stat-label">Duration</span>
              </div>
            )}
          </div>
        )}

        {error && <div className="sprint-complete-error">{error}</div>}

        <div className="sprint-complete-actions">
          <button
            className="btn btn-secondary btn-large"
            onClick={handleDone}
            disabled={startingNew}
          >
            Done
          </button>
          <button
            className="btn btn-primary btn-large"
            onClick={handleOneMore}
            disabled={startingNew}
          >
            {startingNew ? 'Starting...' : 'One More Sprint'}
          </button>
        </div>
      </div>
    </div>
  );
}
