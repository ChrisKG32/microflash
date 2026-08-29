/**
 * Render + refocus tests for Sprint Review.
 *
 * CardContent renders through a WebView, mocked to a plain View in
 * jest.setup, so assertions here use the progress label and the grade buttons
 * rather than card text.
 */
import { act, screen } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  getSprint: jest.fn(),
  submitSprintReview: jest.fn(),
  completeSprint: jest.fn(),
  ApiError: require('@/test-utils/api-error').ApiError,
}));

import { getSprint } from '@/lib/api';
import { refocus } from '@/test-utils/focus';
import { renderScreen } from '@/test-utils/render-screen';
import { clearSearchParams, setSearchParams } from '@/test-utils/router-params';
import SprintReviewScreen from '@/app/sprint/[id]';

const mockedGetSprint = getSprint as jest.Mock;

afterAll(() => clearSearchParams());

const sprintWith = (reviewed: number) => ({
  id: 's1',
  status: 'ACTIVE',
  source: 'HOME',
  deckId: null,
  deckTitle: 'Spanish',
  createdAt: new Date().toISOString(),
  startedAt: new Date().toISOString(),
  completedAt: null,
  resumableUntil: new Date(Date.now() + 60_000).toISOString(),
  abandonedAt: null,
  progress: { total: 3, reviewed, remaining: 3 - reviewed },
  cards: [
    {
      id: 'sc1',
      order: 0,
      result: null,
      reviewedAt: null,
      card: { id: 'c1', front: 'hola', back: 'hello', deckId: 'd1' },
    },
  ],
});

describe('SprintReviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSearchParams({ id: 's1' });
    mockedGetSprint.mockResolvedValue({ sprint: sprintWith(0) });
  });

  it.each(['light', 'dark'] as const)(
    'renders the current card in %s',
    async (scheme) => {
      renderScreen(<SprintReviewScreen />, scheme);
      expect(await screen.findByTestId('show-answer-button')).toBeTruthy();
      expect(screen.getByTestId('sprint-progress-label')).toHaveTextContent(
        '0 / 3',
      );
    },
  );

  it('shows the expired message when the sprint came back abandoned', async () => {
    mockedGetSprint.mockResolvedValue({
      sprint: { ...sprintWith(0), status: 'ABANDONED' },
    });
    renderScreen(<SprintReviewScreen />);
    expect(await screen.findByText(/expired/)).toBeTruthy();
  });

  // Regression: as above — a missing route param returned before the
  // try/finally that clears `loading`, leaving the spinner up permanently.
  it('surfaces a missing route param instead of spinning forever', async () => {
    clearSearchParams();
    renderScreen(<SprintReviewScreen />);

    expect(await screen.findByText('Sprint not found')).toBeTruthy();
    expect(screen.queryByText('Loading sprint...')).toBeNull();
    expect(mockedGetSprint).not.toHaveBeenCalled();
  });

  // Regression: the focus effect used to setLoading(true), so opening the
  // avatar menu mid-sprint and coming back replaced the card under review
  // with the full-screen spinner until the refetch landed. Refetching on
  // focus is right — the sprint can auto-abandon — but it must happen under
  // the card, not instead of it.
  it('refreshes on refocus without blanking the card', async () => {
    renderScreen(<SprintReviewScreen />);
    expect(await screen.findByTestId('show-answer-button')).toBeTruthy();

    let resolveRefetch!: (value: {
      sprint: ReturnType<typeof sprintWith>;
    }) => void;
    mockedGetSprint.mockReturnValue(
      new Promise((resolve) => {
        resolveRefetch = resolve;
      }),
    );

    await refocus();

    expect(screen.queryByText('Loading sprint...')).toBeNull();
    expect(screen.getByTestId('show-answer-button')).toBeTruthy();

    await act(async () => {
      resolveRefetch({ sprint: sprintWith(2) });
    });

    expect(screen.getByTestId('sprint-progress-label')).toHaveTextContent(
      '2 / 3',
    );
  });
});
