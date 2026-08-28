import type { ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

/**
 * Render a screen inside the same providers app/_layout.tsx supplies.
 *
 * `mode` is a real parameter rather than a default so screen tests can assert
 * both color schemes — that is the dark-mode regression net, since NativeWind
 * `className` styling itself is not resolvable under jest (metro's CSS
 * transformer doesn't run here).
 */
export function renderScreen(
  ui: ReactElement,
  mode: 'light' | 'dark' = 'light',
) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <GluestackUIProvider mode={mode}>{ui}</GluestackUIProvider>
    </SafeAreaProvider>,
  );
}
