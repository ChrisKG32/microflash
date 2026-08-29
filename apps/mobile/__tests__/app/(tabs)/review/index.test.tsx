/**
 * Render smoke test for the Review home screen.
 *
 * This is the template the other screens follow. It covers the three branches
 * nobody clicks through manually (loading / error / empty) and runs every one
 * in BOTH color schemes — which is the dark-mode regression net, since
 * `className` styling itself is not resolvable under jest.
 */
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  getHomeSummary: jest.fn(),
  startSprint: jest.fn(),
  ApiError: require('@/test-utils/api-error').ApiError,
}));

import { getHomeSummary } from '@/lib/api';
import { refocus } from '@/test-utils/focus';
import { renderScreen } from '@/test-utils/render-screen';
import HomeScreen from '@/app/(tabs)/review/index';

const mockedGetHomeSummary = getHomeSummary as jest.Mock;

const SUMMARY = {
  dueCount: 7,
  overdueCount: 2,
  notificationsEnabled: true,
  resumableSprint: null,
};

const SCHEMES = ['light', 'dark'] as const;

describe('HomeScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(SCHEMES)('renders the due state in %s', async (scheme) => {
    mockedGetHomeSummary.mockResolvedValue({ summary: SUMMARY });
    renderScreen(<HomeScreen />, scheme);

    expect(await screen.findByTestId('due-count')).toHaveTextContent('7');
    expect(screen.getByText('cards due')).toBeTruthy();
    expect(screen.getByText('2 overdue')).toBeTruthy();
    expect(screen.getByTestId('start-sprint-button')).toBeTruthy();
  });

  it.each(SCHEMES)('renders the empty state in %s', async (scheme) => {
    mockedGetHomeSummary.mockResolvedValue({
      summary: { ...SUMMARY, dueCount: 0, overdueCount: 0 },
    });
    renderScreen(<HomeScreen />, scheme);

    expect(await screen.findByText("You're all caught up!")).toBeTruthy();
    expect(screen.getByTestId('review-ahead-button')).toBeTruthy();
    expect(screen.queryByTestId('start-sprint-button')).toBeNull();
  });

  // Regression: the focus effect used to setLoading(true) on every focus, so
  // returning to Home — from a sprint, the avatar menu, or the other tab —
  // replaced the rendered screen with the full-screen spinner until the
  // refetch landed. Only the first load has nothing to show.
  it('refreshes on refocus without blanking the screen', async () => {
    mockedGetHomeSummary.mockResolvedValue({ summary: SUMMARY });
    renderScreen(<HomeScreen />);
    expect(await screen.findByTestId('due-count')).toHaveTextContent('7');

    // Hold the refocus fetch open. The bug is only visible in the window
    // between focus firing and the response landing — resolve it eagerly and
    // act() flushes straight past the spinner render, so the test passes
    // against the broken screen too.
    let resolveRefetch!: (value: { summary: typeof SUMMARY }) => void;
    mockedGetHomeSummary.mockReturnValue(
      new Promise((resolve) => {
        resolveRefetch = resolve;
      }),
    );

    await refocus();

    expect(screen.queryByText('Loading...')).toBeNull();
    expect(screen.getByTestId('due-count')).toHaveTextContent('7');

    await act(async () => {
      resolveRefetch({ summary: { ...SUMMARY, dueCount: 9 } });
    });

    expect(screen.getByTestId('due-count')).toHaveTextContent('9');
    expect(mockedGetHomeSummary).toHaveBeenCalledTimes(2);
  });

  it('still blocks on a spinner for the very first load', async () => {
    mockedGetHomeSummary.mockReturnValue(new Promise(() => {}));
    renderScreen(<HomeScreen />);

    expect(await screen.findByText('Loading...')).toBeTruthy();
  });

  it('renders the error state and retries', async () => {
    mockedGetHomeSummary.mockRejectedValueOnce(new Error('boom'));
    renderScreen(<HomeScreen />);

    expect(await screen.findByText('boom')).toBeTruthy();

    mockedGetHomeSummary.mockResolvedValue({ summary: SUMMARY });
    fireEvent.press(screen.getByTestId('retry-button'));
    await waitFor(() => expect(mockedGetHomeSummary).toHaveBeenCalledTimes(2));
  });

  it('shows the resume banner when a sprint is resumable', async () => {
    mockedGetHomeSummary.mockResolvedValue({
      summary: {
        ...SUMMARY,
        resumableSprint: {
          id: 'sprint-1',
          progress: { reviewed: 2, total: 5 },
          deckTitle: 'Spanish',
        },
      },
    });
    renderScreen(<HomeScreen />);

    expect(await screen.findByTestId('resume-sprint-banner')).toBeTruthy();
    expect(screen.getByText(/2 of\s+5 cards reviewed/)).toBeTruthy();
  });

  it('warns when notifications are disabled', async () => {
    mockedGetHomeSummary.mockResolvedValue({
      summary: { ...SUMMARY, notificationsEnabled: false },
    });
    renderScreen(<HomeScreen />);

    expect(await screen.findByText(/Notifications are disabled/)).toBeTruthy();
  });
});
