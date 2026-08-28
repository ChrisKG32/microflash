/**
 * Legacy color shim, derived from theme/tokens.ts.
 *
 * The app themes through NativeWind + gluestack now; this exists only so the
 * remaining `useThemeColor` consumers keep working until they are converted.
 * Do not add entries here.
 */

import { Platform } from 'react-native';

import { palette } from '@/theme/tokens';

/**
 * Legacy shim. Prefer `className` utilities, or `useToken()` where a literal
 * is required. Kept only until the last `useThemeColor` consumer is converted,
 * and derived from the token palette so it cannot drift from gluestack.
 */
export const Colors = {
  light: {
    text: palette.light['typography-900'],
    textSecondary: palette.light['typography-500'],
    background: palette.light['background-0'],
    card: palette.light['background-50'],
    tint: palette.light['primary-500'],
    icon: palette.light['typography-500'],
    tabIconDefault: palette.light['typography-500'],
    tabIconSelected: palette.light['primary-500'],
  },
  dark: {
    text: palette.dark['typography-900'],
    textSecondary: palette.dark['typography-500'],
    background: palette.dark['background-0'],
    card: palette.dark['background-50'],
    tint: palette.dark['primary-500'],
    icon: palette.dark['typography-500'],
    tabIconDefault: palette.dark['typography-500'],
    tabIconSelected: palette.dark['primary-500'],
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
