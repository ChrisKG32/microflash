/**
 * The single source of truth for color in the mobile app.
 *
 * Derived from Radix ramps (theme/radix-ramps.ts) through the semantic map in
 * theme/token-map.ts, and exposed in two shapes:
 *
 *   cssVars  '--color-primary-500': '0 144 255'   -> gluestack-ui-provider/config.ts
 *   palette  'primary-500': '#0090ff'             -> React Navigation, imperative props
 *
 * The palette form is not a convenience. Four consumers cannot use a
 * `className` at all and need a literal color string:
 *
 *   - React Navigation screenOptions (plain objects, never rendered as JSX)
 *   - RefreshControl, which react-native-css-interop does NOT map
 *   - the KaTeX <style> block inside CardContent's WebView
 *   - getMarkdownStyles() for react-native-markdown-display
 *
 * Both shapes come from one computation, so they cannot drift apart.
 *
 * NEVER declare these as CSS custom properties in global.css. A bare `*`
 * selector registers with react-native-css-interop as a UNIVERSAL variable,
 * and getVar() resolves universal vars BEFORE the inherited vars that
 * GluestackUIProvider supplies — pinning the value in both modes on native
 * while web (which emits real :root/.dark rules) looks fine. That divergence
 * is what stalled the first migration. theme/global-css.test.ts guards it.
 */
import { darkRamps, lightRamps } from './radix-ramps';
import {
  FOCUS_RING_STEP,
  GLUESTACK_STEPS,
  ON_SOLID,
  SCALES,
  TINTED_SURFACE_STEP,
  type ScaleName,
} from './token-map';

export type Scheme = 'light' | 'dark';

/** The contrast color for a Radix step-9 solid, in both modes. */
const ON_SOLID_HEX = '#ffffff';

/** '#0090ff' -> '0 144 255' */
function hexToTriplet(hex: string): string {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function buildPalette(scheme: Scheme): Record<string, string> {
  const ramps = scheme === 'dark' ? darkRamps : lightRamps;
  const out: Record<string, string> = {};

  for (const [scaleName, { hue, map }] of Object.entries(SCALES) as [
    ScaleName,
    (typeof SCALES)[ScaleName],
  ][]) {
    GLUESTACK_STEPS.forEach((step, i) => {
      const radixStep = map[i];
      out[`${scaleName}-${step}`] =
        radixStep === ON_SOLID ? ON_SOLID_HEX : ramps[hue][radixStep - 1];
    });
  }

  // Tinted surfaces (Alert, Toast, Badge backgrounds).
  const tint = TINTED_SURFACE_STEP - 1;
  out['background-error'] = ramps.red[tint];
  out['background-warning'] = ramps.amber[tint];
  out['background-success'] = ramps.green[tint];
  out['background-info'] = ramps.blue[tint];
  out['background-muted'] = ramps.slate[tint];

  // Focus rings.
  const focus = FOCUS_RING_STEP - 1;
  out['indicator-primary'] = ramps.blue[focus];
  out['indicator-info'] = ramps.blue[focus];
  out['indicator-error'] = ramps.red[focus];

  // Modal/drawer/actionsheet scrim. Intentionally mode-invariant: a scrim
  // darkens whatever is behind it and must not invert with the color scheme.
  out['background-dark'] = '#000000';

  return out;
}

/** Hex values, for anything that takes a literal color string. */
export const palette: Record<Scheme, Record<string, string>> = {
  light: buildPalette('light'),
  dark: buildPalette('dark'),
};

export type TokenName = keyof (typeof palette)['light'];

function toCssVars(p: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(p).map(([name, hex]) => [
      `--color-${name}`,
      hexToTriplet(hex),
    ]),
  );
}

/** Space-separated RGB triplets, for nativewind's vars(). */
export const cssVars: Record<Scheme, Record<string, string>> = {
  light: toCssVars(palette.light),
  dark: toCssVars(palette.dark),
};
