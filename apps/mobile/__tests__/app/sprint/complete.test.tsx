import { fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  startSprint: jest.fn(),
  ApiError: require('@/test-utils/api-error').ApiError,
}));

import { startSprint, ApiError } from '@/lib/api';
import { renderScreen } from '@/test-utils/render-screen';
import { clearSearchParams, setSearchParams } from '@/test-utils/router-params';
import SprintCompleteScreen from '@/app/sprint/complete';

const mockedStartSprint = startSprint as jest.Mock;

afterAll(() => clearSearchParams());

describe('SprintCompleteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSearchParams({
      totalCards: '5',
      reviewedCards: '5',
      passCount: '4',
      failCount: '1',
      durationSeconds: '75',
      launchSource: 'HOME',
    });
    mockedStartSprint.mockResolvedValue({ sprint: { id: 's2' } });
  });

  it.each(['light', 'dark'] as const)(
    'renders the summary in %s',
    async (scheme) => {
      renderScreen(<SprintCompleteScreen />, scheme);
      expect(await screen.findByText('Sprint Complete!')).toBeTruthy();
      expect(screen.getByTestId('done-button')).toBeTruthy();
      expect(screen.getByTestId('one-more-sprint-button')).toBeTruthy();
    },
  );

  it('renders each stat row it was given', async () => {
    renderScreen(<SprintCompleteScreen />);

    expect(await screen.findByText('Cards reviewed')).toBeTruthy();
    expect(screen.getByText('Passed')).toBeTruthy();
    expect(screen.getByText('Need review')).toBeTruthy();
    // 75s formats as minutes + seconds.
    expect(screen.getByText('1m 15s')).toBeTruthy();
  });

  it('omits stat rows whose count is zero', async () => {
    setSearchParams({
      totalCards: '3',
      reviewedCards: '3',
      passCount: '3',
      failCount: '0',
      durationSeconds: '0',
    });

    renderScreen(<SprintCompleteScreen />);

    expect(await screen.findByText('Passed')).toBeTruthy();
    expect(screen.queryByText('Need review')).toBeNull();
    expect(screen.queryByText('Time')).toBeNull();
  });

  it('starts another sprint', async () => {
    renderScreen(<SprintCompleteScreen />);

    fireEvent.press(await screen.findByTestId('one-more-sprint-button'));

    await waitFor(() =>
      expect(mockedStartSprint).toHaveBeenCalledWith({
        deckId: undefined,
        source: 'HOME',
      }),
    );
  });

  it('explains itself when no cards are left', async () => {
    mockedStartSprint.mockRejectedValue(
      new ApiError(409, 'NO_ELIGIBLE_CARDS', 'none'),
    );

    renderScreen(<SprintCompleteScreen />);
    fireEvent.press(await screen.findByTestId('one-more-sprint-button'));

    expect(
      await screen.findByText('No more cards are due for review right now.'),
    ).toBeTruthy();
  });
});
