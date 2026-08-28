import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Regression guard for the bug that stalled the first gluestack migration.
 *
 * global.css once declared the --color-background-* ramp under a bare `*`
 * selector. react-native-css-interop registers `*` as a UNIVERSAL variable,
 * and its getVar() checks universal variables BEFORE variables inherited from
 * an ancestor — which is how GluestackUIProvider supplies the palette. The
 * result was a background scale frozen to one ramp in both color schemes on
 * native, while web looked correct because its provider emits real
 * :root/.dark rules that outspecify `*`.
 */
describe('global.css', () => {
  const css = readFileSync(resolve(__dirname, '../global.css'), 'utf8');
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

  it('declares no CSS custom properties', () => {
    expect(withoutComments).not.toMatch(/--[\w-]+\s*:/);
  });

  it('contains no bare universal-selector rule', () => {
    // `m` matters: the offending rule sat at the start of a line, not at the
    // start of the file or immediately after a `}`.
    expect(withoutComments).not.toMatch(/(^|[};])\s*\*\s*\{/m);
  });

  it('still emits the tailwind layers', () => {
    expect(css).toMatch(/@tailwind\s+base/);
    expect(css).toMatch(/@tailwind\s+components/);
    expect(css).toMatch(/@tailwind\s+utilities/);
  });
});
