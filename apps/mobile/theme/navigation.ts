import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { palette, type Scheme } from './tokens';

/**
 * React Navigation's theme, built from the same tokens gluestack uses.
 *
 * Headers and tab bars are rendered by React Navigation, not gluestack, so
 * they need a plain JS color object. Deriving it here means the two theming
 * systems cannot drift — which is what produced the hardcoded
 * `colorScheme === 'dark' ? '#1c1c1e' : '#fff'` blocks this replaces.
 *
 * Spreading Default/DarkTheme carries the `fonts` object React Navigation 7
 * requires.
 */
export function navigationTheme(scheme: Scheme): Theme {
  const p = palette[scheme];
  return {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    dark: scheme === 'dark',
    colors: {
      primary: p['primary-500'],
      background: p['background-0'],
      card: p['background-0'],
      text: p['typography-900'],
      border: p['outline-100'],
      notification: p['error-500'],
    },
  };
}
