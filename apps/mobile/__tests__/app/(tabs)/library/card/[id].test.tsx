import { fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  getCard: jest.fn(),
  updateCard: jest.fn(),
  deleteCard: jest.fn(),
}));

import { deleteCard, getCard } from '@/lib/api';
import { renderScreen } from '@/test-utils/render-screen';
import { clearSearchParams, setSearchParams } from '@/test-utils/router-params';
import EditCardScreen from '@/app/(tabs)/library/card/[id]';

const mockedGetCard = getCard as jest.Mock;
const mockedDeleteCard = deleteCard as jest.Mock;

afterAll(() => clearSearchParams());

const CARD = {
  id: 'c1',
  front: 'hola',
  back: 'hello',
  priority: 50,
  deckId: 'd1',
};

describe('EditCardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSearchParams({ id: 'c1' });
    mockedGetCard.mockResolvedValue({ card: CARD });
  });

  it.each(['light', 'dark'] as const)('renders the editor in %s', async (scheme) => {
    renderScreen(<EditCardScreen />, scheme);
    expect(await screen.findByTestId('front-input')).toBeTruthy();
    expect(screen.getByTestId('back-input')).toBeTruthy();
    expect(screen.getByTestId('priority-slider')).toBeTruthy();
  });

  it('renders the error state', async () => {
    mockedGetCard.mockRejectedValue(new Error('missing'));
    renderScreen(<EditCardScreen />);
    expect(await screen.findByTestId('go-back-button')).toBeTruthy();
  });

  it('switches to preview', async () => {
    renderScreen(<EditCardScreen />);
    fireEvent.press(await screen.findByTestId('preview-tab'));
    expect(screen.getByText('Front (Question)')).toBeTruthy();
  });

  /**
   * The delete flow was an async callback nested inside an Alert button array;
   * useConfirm flattens it. Deleting must NOT happen until the dialog is
   * confirmed.
   */
  it('requires confirmation before deleting', async () => {
    renderScreen(<EditCardScreen />);
    fireEvent.press(await screen.findByTestId('delete-card-button'));

    expect(await screen.findByTestId('confirm-dialog')).toBeTruthy();
    expect(mockedDeleteCard).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('confirm-cancel'));
    await waitFor(() =>
      expect(screen.queryByTestId('confirm-dialog')).toBeNull(),
    );
    expect(mockedDeleteCard).not.toHaveBeenCalled();
  });

  it('deletes once confirmed', async () => {
    mockedDeleteCard.mockResolvedValue(undefined);
    renderScreen(<EditCardScreen />);
    fireEvent.press(await screen.findByTestId('delete-card-button'));
    fireEvent.press(await screen.findByTestId('confirm-accept'));
    await waitFor(() => expect(mockedDeleteCard).toHaveBeenCalledWith('c1'));
  });
});
