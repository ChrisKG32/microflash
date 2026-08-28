/**
 * Integration smoke test for the root provider tree: GestureHandlerRootView ->
 * GluestackUIProvider -> ThemeProvider -> AuthGate -> Stack.
 *
 * Guards the ordering documented in _layout.tsx. If GluestackUIProvider is
 * moved below the navigators, gluestack's Overlay/Toast portals lose their
 * host and overlays render unstyled or throw.
 */
import { render, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  getMe: jest.fn(),
  abandonSprint: jest.fn(),
}));

import { getMe } from '@/lib/api';
import RootLayout from './_layout';

const mockedGetMe = getMe as jest.MockedFunction<typeof getMe>;

describe('RootLayout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the app once onboarding is complete', async () => {
    mockedGetMe.mockResolvedValue({
      user: { onboardingComplete: true },
    } as Awaited<ReturnType<typeof getMe>>);

    const { toJSON } = render(<RootLayout />);
    await waitFor(() => expect(mockedGetMe).toHaveBeenCalled());
    expect(toJSON()).toBeTruthy();
  });

  it('renders a themed loading state before the user resolves', () => {
    mockedGetMe.mockReturnValue(
      new Promise(() => {}) as ReturnType<typeof getMe>,
    );
    const { toJSON } = render(<RootLayout />);
    // The spinner previously sat on a hardcoded #f5f5f5, flashing white on a
    // dark device at every cold start.
    expect(JSON.stringify(toJSON())).not.toContain('#f5f5f5');
  });
});
