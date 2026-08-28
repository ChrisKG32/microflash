import { ALL_RADIX_TRIPLETS } from './radix-ramps';
import { cssVars, palette, type Scheme } from './tokens';
import { GLUESTACK_STEPS, SCALES } from './token-map';

/** Relative luminance, good enough to assert a ramp is ordered. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const SCHEMES: Scheme[] = ['light', 'dark'];

describe('theme tokens', () => {
  describe('structure', () => {
    it('defines the same tokens in both schemes', () => {
      expect(Object.keys(palette.light).sort()).toEqual(
        Object.keys(palette.dark).sort(),
      );
    });

    it('covers every gluestack scale and step', () => {
      for (const scale of Object.keys(SCALES)) {
        for (const step of GLUESTACK_STEPS) {
          expect(palette.light).toHaveProperty(`${scale}-${step}`);
        }
      }
    });

    it.each(SCHEMES)('emits valid rgb triplets for %s', (scheme) => {
      for (const [name, value] of Object.entries(cssVars[scheme])) {
        expect(name).toMatch(/^--color-/);
        expect(value).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
      }
    });
  });

  describe('light and dark actually differ', () => {
    // The token-layer expression of the universal-variable bug: under it, the
    // background scale resolved identically in both schemes.
    const MUST_INVERT = [
      'background-0',
      'background-50',
      'background-950',
      'typography-900',
      'outline-100',
      'secondary-0',
    ];

    it.each(MUST_INVERT)('%s differs between schemes', (token) => {
      expect(palette.light[token]).not.toBe(palette.dark[token]);
    });

    it('inverts the background scale rather than shifting it', () => {
      // light background-0 is the lightest surface; dark background-0 is the darkest.
      expect(luminance(palette.light['background-0'])).toBeGreaterThan(0.9);
      expect(luminance(palette.dark['background-0'])).toBeLessThan(0.05);
    });
  });

  describe('provenance', () => {
    // Would have caught the first attempt's hand-written palette, whose
    // primary-500 (#3d63dd) and background-50 (#19191b) exist in no Radix ramp.
    const SYNTHETIC = new Set([
      'typography-0', // on-solid white
      'typography-50', // on-solid white
      'background-dark', // scrim, intentionally mode-invariant
    ]);

    it.each(SCHEMES)('every %s token traces to a real Radix step', (scheme) => {
      const offenders: string[] = [];
      for (const [name, triplet] of Object.entries(cssVars[scheme])) {
        const token = name.replace('--color-', '');
        if (SYNTHETIC.has(token)) continue;
        if (!ALL_RADIX_TRIPLETS.has(triplet))
          offenders.push(`${name}=${triplet}`);
      }
      expect(offenders).toEqual([]);
    });
  });

  describe('ramps are ordered', () => {
    // Would have caught the first attempt's dark outline scale, which ran
    // 34,35,37 -> 39,38,36 -> 65,65,65 -> 57,58,64 -> ... non-monotonically.
    const NEUTRALS = ['background', 'outline', 'secondary'] as const;

    it.each(SCHEMES)('%s neutral scales move in one direction', (scheme) => {
      for (const scale of NEUTRALS) {
        const lums = GLUESTACK_STEPS.map((s) =>
          luminance(palette[scheme][`${scale}-${s}`]),
        );
        const expected =
          scheme === 'light'
            ? [...lums].sort((a, b) => b - a) // light: 0 is lightest
            : [...lums].sort((a, b) => a - b); // dark: 0 is darkest
        expect({ scale, lums }).toEqual({ scale, lums: expected });
      }
    });

    it.each(SCHEMES)(
      '%s typography darkens/lightens past the on-solid pair',
      (scheme) => {
        // Indices 0 and 1 are on-solid white in both schemes, so start at 2.
        const lums = GLUESTACK_STEPS.slice(2).map((s) =>
          luminance(palette[scheme][`typography-${s}`]),
        );
        const expected =
          scheme === 'light'
            ? [...lums].sort((a, b) => b - a)
            : [...lums].sort((a, b) => a - b);
        expect(lums).toEqual(expected);
      },
    );
  });

  describe('contrast', () => {
    it('body and heading text are high contrast on the base surface', () => {
      for (const scheme of SCHEMES) {
        const bg = luminance(palette[scheme]['background-0']);
        for (const token of ['typography-700', 'typography-900']) {
          const fg = luminance(palette[scheme][token]);
          const ratio = (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05);
          expect({ scheme, token, ok: ratio >= 7 }).toEqual({
            scheme,
            token,
            ok: true,
          });
        }
      }
    });

    it('white reads on every step-9 solid', () => {
      for (const scheme of SCHEMES) {
        for (const token of ['primary-500', 'error-500', 'success-500']) {
          const solid = luminance(palette[scheme][token]);
          const ratio = (1.0 + 0.05) / (solid + 0.05);
          expect({ scheme, token, ok: ratio >= 3 }).toEqual({
            scheme,
            token,
            ok: true,
          });
        }
      }
    });
  });
});
