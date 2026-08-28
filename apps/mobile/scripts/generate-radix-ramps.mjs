/**
 * Generates theme/radix-ramps.ts from @radix-ui/colors.
 *
 * Run: pnpm --filter @microflash/mobile theme:generate
 *
 * The output is committed so @radix-ui/colors stays a devDependency and
 * never reaches the metro bundle. Regenerate when Radix ships new ramps.
 *
 * Why generated rather than hand-written: the first migration attempt
 * transcribed these by hand and drifted — it shipped a "Radix" palette whose
 * primary (#3d63dd) and background-50 (#19191b) exist in no Radix ramp at
 * all, and whose dark outline scale was non-monotonic. theme/tokens.test.ts
 * asserts provenance against this file so that can't recur.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as radix from '@radix-ui/colors';

/** Hues the app themes with. See theme/token-map.ts for what maps onto what. */
const HUES = ['slate', 'blue', 'red', 'green', 'amber'];

const STEPS = 12;

/** '#0090ff' -> '0 144 255' (the space-separated form tailwind needs). */
function hexToTriplet(hex) {
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

function ramp(hue, dark) {
  const key = dark ? `${hue}Dark` : hue;
  const source = radix[key];
  if (!source) throw new Error(`@radix-ui/colors has no ramp "${key}"`);

  // Radix keys are 1-indexed (slate1..slate12); emit a 0-indexed array so
  // token-map.ts can address steps as RadixStep - 1.
  return Array.from({ length: STEPS }, (_, i) => {
    const hex = source[`${hue}${i + 1}`];
    if (!hex) throw new Error(`${key} is missing step ${i + 1}`);
    return hex;
  });
}

const lines = [
  '/**',
  ' * GENERATED FILE — do not edit by hand.',
  ' * Regenerate with: pnpm --filter @microflash/mobile theme:generate',
  ' *',
  ' * Radix Color ramps, 12 steps each, index 0 = Radix step 1.',
  ' * Matches the desktop app, which uses <Theme accentColor="blue"',
  ' * grayColor="slate"> from @radix-ui/themes.',
  ' */',
  '',
  'export type Ramp = readonly [',
  '  string, string, string, string, string, string,',
  '  string, string, string, string, string, string,',
  '];',
  '',
  'export type Hue = (typeof HUES)[number];',
  '',
  `export const HUES = [${HUES.map((h) => `'${h}'`).join(', ')}] as const;`,
  '',
];

for (const mode of ['light', 'dark']) {
  lines.push(`export const ${mode}Ramps: Record<Hue, Ramp> = {`);
  for (const hue of HUES) {
    const values = ramp(hue, mode === 'dark');
    lines.push(`  ${hue}: [`);
    for (const hex of values) lines.push(`    '${hex}',`);
    lines.push('  ],');
  }
  lines.push('};', '');
}

// Emitted so tokens.test.ts can assert every token traces to a real ramp.
lines.push(
  '/** Every triplet Radix defines, for provenance assertions in tests. */',
  'export const ALL_RADIX_TRIPLETS: ReadonlySet<string> = new Set([',
);
const triplets = new Set();
for (const mode of ['light', 'dark']) {
  for (const hue of HUES) {
    for (const hex of ramp(hue, mode === 'dark'))
      triplets.add(hexToTriplet(hex));
  }
}
for (const t of [...triplets].sort()) lines.push(`  '${t}',`);
lines.push(']);', '');

const out = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../theme/radix-ramps.ts',
);
writeFileSync(out, lines.join('\n'));
console.log(`wrote ${out} (${HUES.length} hues x ${STEPS} steps x 2 modes)`);
