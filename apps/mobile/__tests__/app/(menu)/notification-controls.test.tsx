import { screen, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  getNotificationPreferences: jest.fn(),
  updateNotificationPreferences: jest.fn(),
  createDevTestSprintNotification: jest.fn(),
  ApiError: require('@/test-utils/api-error').ApiError,
}));

const mockRequestPermissions = jest.fn();
jest.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => ({
    hasPermission: mockUseNotificationsState.hasPermission,
    isLoading: mockUseNotificationsState.isLoading,
    expoPushToken: null,
    isDevice: true,
    error: null,
    requestPermissions: mockRequestPermissions,
    refreshPermission: jest.fn(),
  }),
  ensureAndroidChannel: jest.fn(),
}));

const mockUseNotificationsState = {
  hasPermission: true,
  isLoading: false,
};

import { getNotificationPreferences } from '@/lib/api';
import { renderScreen } from '@/test-utils/render-screen';
import NotificationControlsScreen from '@/app/(menu)/notification-controls';

const mockedGetPrefs = getNotificationPreferences as jest.Mock;

const PREFS = {
  notificationsEnabled: true,
  notificationCooldownMinutes: 120,
  maxNotificationsPerDay: 10,
};

describe('NotificationControlsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotificationsState.hasPermission = true;
    mockUseNotificationsState.isLoading = false;
    mockedGetPrefs.mockResolvedValue(PREFS);
  });

  it.each(['light', 'dark'] as const)(
    'renders the controls in %s',
    async (scheme) => {
      renderScreen(<NotificationControlsScreen />, scheme);
      expect(await screen.findByTestId('notifications-switch')).toBeTruthy();
    },
  );

  it('shows the permission banner only once the OS has answered', async () => {
    // Regression: the screen used `hasOSPermission === false` on a
    // `boolean | null`, so the banner stayed hidden until the OS replied. The
    // hook's hasPermission starts `false`, so the loading flag has to gate it —
    // otherwise the banner flashes on every mount.
    mockUseNotificationsState.hasPermission = false;
    mockUseNotificationsState.isLoading = true;

    renderScreen(<NotificationControlsScreen />);
    await waitFor(() => expect(mockedGetPrefs).toHaveBeenCalled());

    expect(screen.queryByTestId('open-settings-button')).toBeNull();
  });

  it('shows the permission banner once permission is known to be denied', async () => {
    mockUseNotificationsState.hasPermission = false;
    mockUseNotificationsState.isLoading = false;

    renderScreen(<NotificationControlsScreen />);

    expect(await screen.findByTestId('open-settings-button')).toBeTruthy();
    expect(screen.getByTestId('request-permission-button')).toBeTruthy();
  });

  it('renders the error state when preferences fail to load', async () => {
    mockedGetPrefs.mockRejectedValue(new Error('nope'));

    renderScreen(<NotificationControlsScreen />);

    expect(await screen.findByText('nope')).toBeTruthy();
  });
});
