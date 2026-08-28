import { navigationTheme } from './navigation';
import { palette } from './tokens';

/**
 * React Navigation renders headers and tab bars, gluestack does not. Both must
 * read the same tokens or the chrome drifts from the body — which is what the
 * hardcoded `colorScheme === 'dark' ? '#1c1c1e' : '#fff'` blocks used to do.
 */
describe('navigationTheme', () => {
  it.each(['light', 'dark'] as const)(
    'derives %s chrome from tokens',
    (scheme) => {
      const theme = navigationTheme(scheme);
      expect(theme.dark).toBe(scheme === 'dark');
      expect(theme.colors.background).toBe(palette[scheme]['background-0']);
      expect(theme.colors.card).toBe(palette[scheme]['background-0']);
      expect(theme.colors.text).toBe(palette[scheme]['typography-900']);
      expect(theme.colors.primary).toBe(palette[scheme]['primary-500']);
      expect(theme.colors.border).toBe(palette[scheme]['outline-100']);
    },
  );

  it('carries the fonts object React Navigation 7 requires', () => {
    expect(navigationTheme('light').fonts).toBeDefined();
  });

  it('produces different chrome per scheme', () => {
    expect(navigationTheme('light').colors.background).not.toBe(
      navigationTheme('dark').colors.background,
    );
  });
});
