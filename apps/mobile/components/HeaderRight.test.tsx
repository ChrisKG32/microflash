import { screen, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({ getMe: jest.fn() }));

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

  it('still renders when the profile request fails', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedGetMe.mockRejectedValue(new Error('offline'));
    renderScreen(<HeaderRight />);
    expect(await screen.findByTestId('header-avatar-button')).toBeTruthy();
    await waitFor(() => expect(spy).toHaveBeenCalled());
    spy.mockRestore();
  });
});
