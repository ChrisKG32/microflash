/**
 * How Radix's 12-step ramps map onto gluestack's 0..950 scales.
 *
 * The key insight: gluestack's 0->950 is NOT a lightness ramp, it is a
 * SEMANTIC ramp that already inverts between modes (stock light
 * `background-0` is #fff, stock dark `background-0` is #111). That is exactly
 * Radix's step 1 -> 12 semantic, so ONE table serves both modes. Getting this
 * right is what structurally removes the "light and dark disagree" bug class.
 *
 * A naive positional map (0->1, 50->2, ... 950->12) is wrong in four places,
 * each verified against real class usage in components/ui:
 *
 *   text/styles.tsx    base is `text-typography-700`  -> slate-9 is 2.9:1. Unreadable body text.
 *   heading/styles.tsx base is `text-typography-900`  -> slate-11. Washed-out headings.
 *   button/index.tsx   solid is `bg-primary-500`      -> blue-7 is a pale fill, not a solid.
 *   `text-typography-0` (on-solid, 27 uses)           -> slate-1 is near-black in dark mode.
 *
 * Hence four shapes rather than one.
 */

/** A Radix step, 1-12. */
export type RadixStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** gluestack scale steps, in order. Index positions align with the maps below. */
export const GLUESTACK_STEPS = [
  0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

/**
 * Surfaces. Skips Radix 4 so `bg-background-200` (divider base) lands on
 * slate-5 and `border-background-300` (input rest border) on slate-6, Radix's
 * subtle-border step. A positional map puts both at 4/5 and dividers vanish.
 */
export const SURFACE: readonly RadixStep[] = [
  1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 11, 12,
];

/** Borders, front-loaded into Radix 6-8 (the border band). */
export const BORDER: readonly RadixStep[] = [
  3, 5, 6, 6, 7, 7, 8, 8, 9, 10, 11, 12,
];

/**
 * Accents. 500 -> 9 (solid), 600 -> 10 (solid hover), 700 -> 11 (text and
 * focus border), 800+ -> 12. Matches button/index.tsx's
 * `bg-primary-500` / `data-[hover]:bg-primary-600` / `data-[active]:bg-primary-700`
 * and input/index.tsx's `data-[focus=true]:border-primary-700`.
 */
export const ACCENT: readonly RadixStep[] = [
  1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 12, 12,
];

/** Neutral fills, a touch softer than SURFACE at the top end. */
export const SOFT_FILL: readonly RadixStep[] = [
  1, 2, 3, 4, 4, 5, 5, 6, 7, 8, 11, 12,
];

/**
 * Text. `ON_SOLID` means "the contrast color for a step-9 solid" — white in
 * BOTH modes, because Radix 9 solids (blue-9, red-9, green-9) are dark enough
 * for white text in light and dark alike.
 *
 * 700/800/900/950 all collapse to Radix 12 so that `Text` (base 700) and
 * `Heading` (base 900) are both high-contrast; 500/600 -> 11 is secondary
 * text. Consequence worth knowing: `text-typography-700` and
 * `text-typography-900` are deliberately identical. Secondary text is -500.
 */
export const ON_SOLID = 'ON_SOLID' as const;
export type TextStep = RadixStep | typeof ON_SOLID;

export const TEXT: readonly TextStep[] = [
  ON_SOLID,
  ON_SOLID,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  12,
  12,
];

export type ScaleName =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'error'
  | 'success'
  | 'warning'
  | 'info'
  | 'typography'
  | 'outline'
  | 'background';

/** Which Radix hue and which shape each gluestack scale draws from. */
export const SCALES: Record<
  ScaleName,
  {
    hue: 'slate' | 'blue' | 'red' | 'green' | 'amber';
    map: readonly TextStep[];
  }
> = {
  background: { hue: 'slate', map: SURFACE },
  outline: { hue: 'slate', map: BORDER },
  secondary: { hue: 'slate', map: SOFT_FILL },
  typography: { hue: 'slate', map: TEXT },
  primary: { hue: 'blue', map: ACCENT },
  info: { hue: 'blue', map: ACCENT },
  error: { hue: 'red', map: ACCENT },
  success: { hue: 'green', map: ACCENT },
  warning: { hue: 'amber', map: ACCENT },
  tertiary: { hue: 'amber', map: ACCENT },
};

/** Tinted surfaces use Radix step 3, the "component background" step. */
export const TINTED_SURFACE_STEP: RadixStep = 3;

/** Focus rings use Radix step 8, which is Radix's own --focus-8. */
export const FOCUS_RING_STEP: RadixStep = 8;
