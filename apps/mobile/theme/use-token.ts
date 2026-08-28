'use client';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { palette, type Scheme, type TokenName } from './tokens';

/**
 * Read theme colors as literal strings, for the places a `className` cannot
 * reach: React Navigation screenOptions, RefreshControl (which
 * react-native-css-interop does not map), the KaTeX <style> block inside
 * CardContent's WebView, and react-native-markdown-display style objects.
 *
 * Prefer `className="bg-background-0"` everywhere else — going through
 * NativeWind keeps the value reactive to scheme changes without a re-render
 * of the consuming component.
 */
export function useToken(name: TokenName): string {
  return palette[useColorScheme()][name];
}

/** Batch form, so a component reads the scheme once. */
export function useTokens<T extends TokenName>(
  ...names: T[]
): Record<T, string> {
  const scheme = useColorScheme();
  return Object.fromEntries(
    names.map((n) => [n, palette[scheme][n]]),
  ) as Record<T, string>;
}

/** The whole palette for the active scheme. */
export function useAppTheme(): Record<string, string> {
  return palette[useColorScheme()];
}

export type { Scheme, TokenName };
