import { fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  getDeck: jest.fn(),
  getCards: jest.fn(),
  updateDeck: jest.fn(),
  startSprint: jest.fn(),
  ApiError: require('@/test-utils/api-error').ApiError,
}));

import { getCards, getDeck, updateDeck } from '@/lib/api';
import { renderScreen } from '@/test-utils/render-screen';
import { clearSearchParams, setSearchParams } from '@/test-utils/router-params';
import DeckDetailScreen from './[id]';

const mockedGetDeck = getDeck as jest.Mock;
const mockedGetCards = getCards as jest.Mock;
const mockedUpdateDeck = updateDeck as jest.Mock;

afterAll(() => clearSearchParams());

const DECK = { id: 'd1', title: 'Spanish', description: null, priority: 50 };
const CARDS = [
  {
    id: 'c1',
    front: 'hola',
    back: 'hello',
    state: 'NEW',
    priority: 50,
    reps: 0,
    lapses: 0,
    nextReview: new Date(Date.now() - 1000).toISOString(),
  },
];

describe('DeckDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSearchParams({ id: 'd1' });
    mockedGetDeck.mockResolvedValue({ deck: DECK });
    mockedGetCards.mockResolvedValue({ cards: CARDS });
  });

  it.each(['light', 'dark'] as const)(
    'renders the deck in %s',
    async (scheme) => {
      renderScreen(<DeckDetailScreen />, scheme);
      expect(await screen.findByText('hola')).toBeTruthy();
      expect(screen.getByText('hello')).toBeTruthy();
    },
  );

  it('renders the empty state when the deck has no cards', async () => {
    mockedGetCards.mockResolvedValue({ cards: [] });
    renderScreen(<DeckDetailScreen />);
    expect(await screen.findByText('No cards yet')).toBeTruthy();
  });

  it('renders the error state', async () => {
    mockedGetDeck.mockRejectedValue(new Error('nope'));
    renderScreen(<DeckDetailScreen />);
    expect(await screen.findByTestId('retry-button')).toBeTruthy();
  });

  /**
   * Guards the community-slider -> gluestack-slider prop rename
   * (minimumValue/maximumValue/onValueChange -> minValue/maxValue/onChange).
   * A bare <Slider> without its compound children renders nothing at all, and
   * mismatched prop names fail silently rather than erroring.
   */
  it('renders the priority slider with the deck value', async () => {
    renderScreen(<DeckDetailScreen />);
    const slider = await screen.findByTestId('priority-slider');
    expect(slider).toBeTruthy();
    expect(screen.getByText('50')).toBeTruthy();
  });

  it('writes priority on onChangeEnd, not on every drag frame', async () => {
    mockedUpdateDeck.mockResolvedValue({ deck: { ...DECK, priority: 80 } });
    renderScreen(<DeckDetailScreen />);
    const slider = await screen.findByTestId('priority-slider');

    fireEvent(slider, 'onChange', 70);
    fireEvent(slider, 'onChange', 80);
    expect(mockedUpdateDeck).not.toHaveBeenCalled();

    fireEvent(slider, 'onChangeEnd', 80);
    await waitFor(() =>
      expect(mockedUpdateDeck).toHaveBeenCalledWith('d1', { priority: 80 }),
    );
    expect(mockedUpdateDeck).toHaveBeenCalledTimes(1);
  });
});
