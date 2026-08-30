import { fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  createCard: jest.fn(),
}));

import { createCard } from '@/lib/api';
import { renderScreen } from '@/test-utils/render-screen';
import { clearSearchParams, setSearchParams } from '@/test-utils/router-params';
import NewCardScreen from '@/app/(tabs)/library/card/new';

const mockedCreateCard = createCard as jest.Mock;

afterAll(() => clearSearchParams());

/**
 * Covers the create half of the shared CardEditorForm. The edit half is covered
 * by card/[id].test.tsx; between them the extracted component is exercised on
 * both call sites, which is what makes the extraction safe to keep changing.
 */
describe('NewCardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSearchParams({ deckId: 'd1' });
    mockedCreateCard.mockResolvedValue({ card: { id: 'c1' } });
  });

  it.each(['light', 'dark'] as const)(
    'renders the editor in %s',
    async (scheme) => {
      renderScreen(<NewCardScreen />, scheme);
      expect(await screen.findByTestId('front-input')).toBeTruthy();
      expect(screen.getByTestId('back-input')).toBeTruthy();
      expect(screen.getByTestId('priority-slider')).toBeTruthy();
      expect(screen.getByTestId('create-card-button')).toBeTruthy();
    },
  );

  it('toggles between edit and preview', async () => {
    renderScreen(<NewCardScreen />);

    fireEvent.changeText(await screen.findByTestId('front-input'), 'hola');
    fireEvent.press(screen.getByTestId('preview-tab'));

    // The inputs are unmounted in preview mode.
    expect(screen.queryByTestId('front-input')).toBeNull();

    fireEvent.press(screen.getByTestId('edit-tab'));
    expect(screen.getByTestId('front-input').props.value).toBe('hola');
  });

  it('creates a card with the typed values', async () => {
    renderScreen(<NewCardScreen />);

    fireEvent.changeText(await screen.findByTestId('front-input'), 'hola');
    fireEvent.changeText(screen.getByTestId('back-input'), 'hello');
    fireEvent.press(screen.getByTestId('create-card-button'));

    await waitFor(() =>
      expect(mockedCreateCard).toHaveBeenCalledWith({
        front: 'hola',
        back: 'hello',
        deckId: 'd1',
        priority: 50,
      }),
    );
  });

  it('refuses to submit an empty front', async () => {
    renderScreen(<NewCardScreen />);

    fireEvent.changeText(await screen.findByTestId('back-input'), 'hello');
    fireEvent.press(screen.getByTestId('create-card-button'));

    await waitFor(() => expect(mockedCreateCard).not.toHaveBeenCalled());
  });

  it('refuses to submit an empty back', async () => {
    renderScreen(<NewCardScreen />);

    fireEvent.changeText(await screen.findByTestId('front-input'), 'hola');
    fireEvent.press(screen.getByTestId('create-card-button'));

    await waitFor(() => expect(mockedCreateCard).not.toHaveBeenCalled());
  });
});
