import { fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({ getMe: jest.fn() }));

import { router } from 'expo-router';

import { getMe } from '@/lib/api';
import { renderScreen } from '@/test-utils/render-screen';
import { HeaderRight } from './HeaderRight';

const mockedGetMe = getMe as jest.Mock;

describe('HeaderRight', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['light', 'dark'] as const)(
    'renders the avatar trigger in %s',
    async (scheme) => {
      mockedGetMe.mockResolvedValue({ user: {} });
      renderScreen(<HeaderRight />, scheme);
      expect(await screen.findByTestId('header-avatar-button')).toBeTruthy();
    },
  );

  // Regression: the menu used to navigate from the Menu's onSelectionChange,
  // which never fires. gluestack routes an item press through
  // `selectionManager.select(key)`, and useTreeState defaults selectionMode to
  // 'none' — where select() returns early. Every item was a no-op.
  it.each([
    ['profile', '/(menu)/profile'],
    ['notifications', '/(menu)/notification-controls'],
    ['settings', '/(menu)/settings'],
    ['stats', '/(menu)/stats'],
  ])('navigates to %s when the item is pressed', async (key, destination) => {
    mockedGetMe.mockResolvedValue({ user: {} });
    renderScreen(<HeaderRight />);

    fireEvent.press(await screen.findByTestId('header-avatar-button'));
    fireEvent.press(await screen.findByTestId(`header-menu-${key}`));

    expect(router.push).toHaveBeenCalledWith(destination);
  });

  it('still renders when the profile request fails', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedGetMe.mockRejectedValue(new Error('offline'));
    renderScreen(<HeaderRight />);
    expect(await screen.findByTestId('header-avatar-button')).toBeTruthy();
    await waitFor(() => expect(spy).toHaveBeenCalled());
    spy.mockRestore();
  });
});
