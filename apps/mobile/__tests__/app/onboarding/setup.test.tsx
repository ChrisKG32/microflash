import { screen } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  updateNotificationPreferences: jest.fn(),
}));

import { renderScreen } from '@/test-utils/render-screen';
import OnboardingSetupScreen from '@/app/onboarding/setup';

/**
 * Covers the third LabeledSlider call site — the one that was a private
 * `PreferenceSlider` inside this file, whose hint sits ABOVE the track while
 * the card and deck editors put theirs below. That difference is a prop now,
 * so it needs a test or it will get flattened by the next person.
 */
describe('OnboardingSetupScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['light', 'dark'] as const)(
    'renders all three preference sliders in %s',
    async (scheme) => {
      renderScreen(<OnboardingSetupScreen />, scheme);

      expect(await screen.findByTestId('max-per-day-slider')).toBeTruthy();
      expect(screen.getByTestId('cooldown-slider')).toBeTruthy();
      expect(screen.getByTestId('sprint-size-slider')).toBeTruthy();
    },
  );

  it('renders each slider label with its recommended value', async () => {
    renderScreen(<OnboardingSetupScreen />);

    expect(await screen.findByText('Max Notifications/Day')).toBeTruthy();
    expect(screen.getByText('Cooldown (minutes)')).toBeTruthy();
    expect(screen.getByText('Sprint Size (cards)')).toBeTruthy();
  });

  it('keeps the hints that sit above the track', async () => {
    renderScreen(<OnboardingSetupScreen />);

    expect(
      await screen.findByText('Minimum time between notifications'),
    ).toBeTruthy();
    expect(screen.getByText('Cards per micro-sprint')).toBeTruthy();
  });
});
