import { fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  getDecks: jest.fn(),
  createDeck: jest.fn(),
}));

import { createDeck, getDecks } from '@/lib/api';
import { renderScreen } from '@/test-utils/render-screen';
import DecksScreen from './index';

const mockedGetDecks = getDecks as jest.Mock;
const mockedCreateDeck = createDeck as jest.Mock;

const DECKS = [
  { id: 'd1', title: 'Spanish', description: 'Vocab', cardCount: 12 },
  { id: 'd2', title: 'Physics', description: null, cardCount: 0 },
];

const SCHEMES = ['light', 'dark'] as const;

describe('DecksScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(SCHEMES)('lists decks in %s', async (scheme) => {
    mockedGetDecks.mockResolvedValue({ decks: DECKS });
    renderScreen(<DecksScreen />, scheme);

    expect(await screen.findByText('Spanish')).toBeTruthy();
    expect(screen.getByText('12 cards')).toBeTruthy();
    expect(screen.getByText('Physics')).toBeTruthy();
  });

  it('renders the empty state', async () => {
    mockedGetDecks.mockResolvedValue({ decks: [] });
    renderScreen(<DecksScreen />);
    expect(await screen.findByText('No decks yet')).toBeTruthy();
  });

  it('renders the error state and retries', async () => {
    mockedGetDecks.mockRejectedValueOnce(new Error('offline'));
    renderScreen(<DecksScreen />);

    expect(await screen.findByText('offline')).toBeTruthy();
    mockedGetDecks.mockResolvedValue({ decks: DECKS });
    fireEvent.press(screen.getByTestId('retry-button'));
    await waitFor(() => expect(mockedGetDecks).toHaveBeenCalledTimes(2));
  });

  it('creates a deck', async () => {
    mockedGetDecks.mockResolvedValue({ decks: [] });
    mockedCreateDeck.mockResolvedValue({ deck: { id: 'd3' } });
    renderScreen(<DecksScreen />);

    fireEvent.press(await screen.findByTestId('new-deck-button'));
    fireEvent.changeText(screen.getByTestId('deck-title-input'), '  Chemistry  ');
    fireEvent.press(screen.getByTestId('create-deck-button'));

    await waitFor(() =>
      expect(mockedCreateDeck).toHaveBeenCalledWith({ title: 'Chemistry' }),
    );
  });

  it('rejects an empty title without calling the API', async () => {
    mockedGetDecks.mockResolvedValue({ decks: [] });
    renderScreen(<DecksScreen />);

    fireEvent.press(await screen.findByTestId('new-deck-button'));
    fireEvent.press(screen.getByTestId('create-deck-button'));

    expect(await screen.findByText('Please enter a deck title')).toBeTruthy();
    expect(mockedCreateDeck).not.toHaveBeenCalled();
  });
});
