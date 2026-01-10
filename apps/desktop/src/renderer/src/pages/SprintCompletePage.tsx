/**
 * Sprint Complete Page
 *
 * Shows completion stats after a sprint is finished.
 * Provides options to return home or start another sprint.
 */

import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Callout,
  Spinner,
} from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { startSprint, ApiError } from '@microflash/api-client';

export function SprintCompletePage() {
  const { sprintId: _sprintId } = useParams<{ sprintId: string }>();
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
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Flex direction="column" align="center" gap="5" p="6">
        <Text size="9">🎉</Text>
        <Heading size="7">Sprint Complete!</Heading>

        {hasStats && (
          <Flex gap="6" mt="2">
            <Flex direction="column" align="center">
              <Text size="7" weight="bold">
                {reviewedCards}
              </Text>
              <Text
                size="1"
                color="gray"
                style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
              >
                Cards Reviewed
              </Text>
            </Flex>
            {passCount !== null && failCount !== null && (
              <>
                <Flex direction="column" align="center">
                  <Text size="7" weight="bold" color="green">
                    {passCount}
                  </Text>
                  <Text
                    size="1"
                    color="gray"
                    style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                  >
                    Passed
                  </Text>
                </Flex>
                <Flex direction="column" align="center">
                  <Text size="7" weight="bold" color="red">
                    {failCount}
                  </Text>
                  <Text
                    size="1"
                    color="gray"
                    style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                  >
                    Failed
                  </Text>
                </Flex>
              </>
            )}
            {durationSeconds && Number(durationSeconds) > 0 && (
              <Flex direction="column" align="center">
                <Text size="7" weight="bold">
                  {formatDuration(Number(durationSeconds))}
                </Text>
                <Text
                  size="1"
                  color="gray"
                  style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                >
                  Duration
                </Text>
              </Flex>
            )}
          </Flex>
        )}

        {error && (
          <Callout.Root color="red" size="2">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        <Flex gap="3" mt="4">
          <Button
            size="3"
            variant="soft"
            onClick={handleDone}
            disabled={startingNew}
          >
            Done
          </Button>
          <Button size="3" onClick={handleOneMore} disabled={startingNew}>
            {startingNew ? (
              <>
                <Spinner size="1" />
                Starting...
              </>
            ) : (
              'One More Sprint'
            )}
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}
