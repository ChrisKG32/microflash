/**
 * Pins the math/markdown interaction inside CardContent's WebView pipeline.
 *
 * markdownToHtml() runs a chain of string rewrites over the card body before
 * KaTeX auto-render ever sees it. Those rewrites have no notion of math, so
 * without the extract/restore pass around them they corrupt the LaTeX they are
 * about to hand over — silently, and only for the subset of cards that contain
 * both math and a character the markdown rules care about.
 *
 * These are unit tests on the string transform rather than a render, because
 * the failure is entirely in the string and a WebView renders nothing under
 * jest anyway.
 */
import { markdownToHtml } from './CardContent';

describe('markdownToHtml — math is never rewritten', () => {
  it('leaves subscripts alone (the italic `_` rule used to eat them)', () => {
    // Regression: this returned `$x<em>1 + x</em>2$`, which KaTeX renders as
    // garbage.
    expect(markdownToHtml('$x_1 + x_2$')).toContain('$x_1 + x_2$');
  });

  it('keeps a display block on one text node (the `\\n` -> <br> rule split it)', () => {
    // Regression: a <br> inside `$$...$$` splits the text node, so
    // renderMathInElement never matches the delimiter pair and the block
    // silently does not render.
    const out = markdownToHtml('Solve $$\n\\frac{a}{b}\n$$ now');
    expect(out).toContain('$$\n\\frac{a}{b}\n$$');
    expect(out).not.toMatch(/\$\$<br>/);
  });

  it('leaves asterisks inside math alone', () => {
    expect(markdownToHtml('$a * b * c$')).toContain('$a * b * c$');
  });

  it('does not turn a leading `-` inside display math into a list item', () => {
    expect(markdownToHtml('$$\n- x\n$$')).not.toContain('<li>');
  });

  it('handles \\( \\) and \\[ \\] delimiters too', () => {
    expect(markdownToHtml('\\(x_1\\)')).toContain('\\(x_1\\)');
    expect(markdownToHtml('\\[a_1 + b_2\\]')).toContain('\\[a_1 + b_2\\]');
  });

  it('escapes math so KaTeX receives the author’s characters', () => {
    // The DOM text node must read `a < b`, so the HTML must carry `&lt;`.
    expect(markdownToHtml('$a < b$')).toContain('$a &lt; b$');
    // `&` is the alignment character in an aligned block.
    expect(markdownToHtml('$$a &= b$$')).toContain('&amp;=');
  });

  it('matches $$ before $ so a display block is not read as two inline spans', () => {
    const out = markdownToHtml('$$x_1$$');
    expect(out).toContain('$$x_1$$');
  });
});

describe('markdownToHtml — markdown still works outside math', () => {
  it('renders bold, italic and code', () => {
    expect(markdownToHtml('**b**')).toContain('<strong>b</strong>');
    expect(markdownToHtml('_i_')).toContain('<em>i</em>');
    expect(markdownToHtml('`c`')).toContain('<code>c</code>');
  });

  it('renders headers and lists', () => {
    expect(markdownToHtml('# H')).toContain('<h1>H</h1>');
    expect(markdownToHtml('- a\n- b')).toContain('<li>a</li>');
  });

  it('still applies markdown in the prose around a math span', () => {
    const out = markdownToHtml('**bold** and $x_1$ and _em_');
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('<em>em</em>');
    expect(out).toContain('$x_1$');
  });

  it('treats an unclosed delimiter as prose rather than swallowing the rest', () => {
    const out = markdownToHtml('costs $5 and **bold**');
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('$5');
  });

  it('escapes HTML in prose', () => {
    expect(markdownToHtml('a < b')).toContain('a &lt; b');
  });
});
