import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

/**
 * The app's single source of color-scheme truth.
 *
 * This MUST be nativewind's hook, not react-native's. GluestackUIProvider
 * selects its variable set with `config[colorScheme]` from nativewind's store,
 * and `dark:` variants resolve against the same appearance observable. Reading
 * react-native's Appearance separately lets the two disagree — which is how
 * you end up with a light header over a dark body.
 *
 * Also narrows away `null`, removing the `?? 'light'` noise at call sites.
 */
export function useColorScheme(): 'light' | 'dark' {
  const { colorScheme } = useNativeWindColorScheme();
  return colorScheme ?? 'light';
}
