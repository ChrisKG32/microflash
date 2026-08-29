import React, { useEffect } from 'react';
import { config } from './config';
import { Appearance, View, ViewProps } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';
import { useColorScheme } from 'nativewind';

export type ModeType = 'light' | 'dark' | 'system';

export function GluestackUIProvider({
  mode = 'light',
  ...props
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /**
   * LOCAL DEVIATION from the stock registry — keep this if you re-run
   * `npx gluestack-ui add`.
   *
   * setColorScheme() above runs in an effect, i.e. after first paint, so on
   * the very first frame `colorScheme` can still be undefined. The stock code
   * indexes `config[colorScheme!]`, which is then `undefined` and publishes
   * NO variables at all — every `bg-background-0` resolves to nothing and the
   * app flashes transparent/black before the effect lands. Resolve a fallback
   * synchronously instead.
   *
   * RN 0.83 (SDK 55) widened `ColorSchemeName` from
   * `'light' | 'dark' | null | undefined` to `'light' | 'dark' | 'unspecified'`,
   * so the narrowing below is load-bearing, not a type formality: an
   * unhandled `'unspecified'` would index `config` to `undefined` and
   * reintroduce exactly the blank-variables flash this block prevents.
   */
  const resolved: keyof typeof config =
    colorScheme === 'light' || colorScheme === 'dark'
      ? colorScheme
      : mode === 'system'
        ? Appearance.getColorScheme() === 'dark'
          ? 'dark'
          : 'light'
        : mode;

  return (
    <View
      style={[
        config[resolved],
        { flex: 1, height: '100%', width: '100%' },
        props.style,
      ]}
    >
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
