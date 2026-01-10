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
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Card,
  Callout,
  Spinner,
  IconButton,
  Progress,
} from '@radix-ui/themes';
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
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

  // For one-sided cards (empty back), show grading immediately
  const isOneSidedCard = currentCard && !currentCard.card.back.trim();

  if (loading) {
    return (
      <Box
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Flex align="center" gap="3">
          <Spinner size="3" />
          <Text color="gray">Loading sprint...</Text>
        </Flex>
      </Box>
    );
  }

  if (error || !sprint) {
    return (
      <Box
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Flex direction="column" align="center" gap="4">
          <Callout.Root color="red" size="2">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{error || 'Sprint not found'}</Callout.Text>
          </Callout.Root>
          <Button onClick={handleGoBack}>Go Back</Button>
        </Flex>
      </Box>
    );
  }

  if (!currentCard) {
    // All cards reviewed but didn't navigate yet
    return (
      <Box
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Flex align="center" gap="3">
          <Spinner size="3" />
          <Text color="gray">Completing sprint...</Text>
        </Flex>
      </Box>
    );
  }

  const progressPercent =
    ((progress?.reviewed ?? 0) / (progress?.total ?? 1)) * 100;

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Flex
        align="center"
        gap="3"
        p="4"
        style={{ borderBottom: '1px solid var(--gray-6)' }}
      >
        <IconButton variant="ghost" onClick={handleGoBack}>
          <ArrowLeftIcon />
        </IconButton>
        <Heading size="4">{sprint.deckTitle ?? 'Sprint Review'}</Heading>
      </Flex>

      {/* Progress Bar */}
      <Flex align="center" gap="4" px="4" py="3">
        <Box style={{ flex: 1 }}>
          <Progress value={progressPercent} size="2" />
        </Box>
        <Text size="2" color="gray">
          {progress?.reviewed ?? 0} / {progress?.total ?? 0}
        </Text>
      </Flex>

      {/* Card */}
      <Box px="4" py="3" style={{ flex: 1, overflowY: 'auto' }}>
        <Card size="3" style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Front */}
          <Box mb="3">
            <Text
              size="1"
              weight="bold"
              color="gray"
              style={{
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'block',
                marginBottom: '12px',
              }}
            >
              Question
            </Text>
            <CardContent content={currentCard.card.front} />
          </Box>

          {/* Back (if revealed and has content) */}
          {(showAnswer || isOneSidedCard) && currentCard.card.back.trim() && (
            <>
              <Box
                my="4"
                style={{ height: '1px', backgroundColor: 'var(--gray-6)' }}
              />
              <Box>
                <Text
                  size="1"
                  weight="bold"
                  color="gray"
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'block',
                    marginBottom: '12px',
                  }}
                >
                  Answer
                </Text>
                <CardContent content={currentCard.card.back} />
              </Box>
            </>
          )}

          {/* Deck info */}
          {currentCard.card.deckTitle && (
            <Text
              size="1"
              color="gray"
              mt="4"
              style={{ display: 'block', textAlign: 'center' }}
            >
              {currentCard.card.deckTitle}
            </Text>
          )}
        </Card>
      </Box>

      {/* Actions */}
      <Box p="4" style={{ borderTop: '1px solid var(--gray-6)' }}>
        {!showAnswer && !isOneSidedCard ? (
          <Flex justify="center">
            <Button size="3" onClick={handleReveal}>
              Show Answer
            </Button>
          </Flex>
        ) : (
          <Flex
            gap="3"
            justify="center"
            style={{ maxWidth: '700px', margin: '0 auto' }}
          >
            <Button
              size="2"
              color="red"
              style={{ flex: 1 }}
              onClick={() => handleGrade('AGAIN')}
              disabled={submitting}
            >
              <Flex direction="column" align="center">
                <Text weight="bold">Again</Text>
                <Text size="1">Forgot</Text>
              </Flex>
            </Button>
            <Button
              size="2"
              color="orange"
              style={{ flex: 1 }}
              onClick={() => handleGrade('HARD')}
              disabled={submitting}
            >
              <Flex direction="column" align="center">
                <Text weight="bold">Hard</Text>
                <Text size="1">Struggled</Text>
              </Flex>
            </Button>
            <Button
              size="2"
              color="green"
              style={{ flex: 1 }}
              onClick={() => handleGrade('GOOD')}
              disabled={submitting}
            >
              <Flex direction="column" align="center">
                <Text weight="bold">Good</Text>
                <Text size="1">Correct</Text>
              </Flex>
            </Button>
            <Button
              size="2"
              color="blue"
              style={{ flex: 1 }}
              onClick={() => handleGrade('EASY')}
              disabled={submitting}
            >
              <Flex direction="column" align="center">
                <Text weight="bold">Easy</Text>
                <Text size="1">Effortless</Text>
              </Flex>
            </Button>
          </Flex>
        )}
      </Box>

      {/* Submitting overlay */}
      {submitting && (
        <Box
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <Spinner size="3" />
        </Box>
      )}
    </Box>
  );
}
