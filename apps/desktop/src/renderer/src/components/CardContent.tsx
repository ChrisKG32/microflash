/**
 * CardContent Component
 *
 * Renders card content (front/back) with Markdown and LaTeX support.
 * Uses react-markdown with remark-math, remark-breaks, and rehype-mathjax.
 *
 * Supports:
 * - Markdown formatting (bold, italic, lists, code, etc.)
 * - Single newlines render as line breaks (remark-breaks)
 * - LaTeX math: $...$ (inline) and $$...$$ (display)
 * - LaTeX math: \(...\) (inline) and \[...\] (display)
 * - Full MathJax TeX compatibility (e.g., \over, \frac, etc.)
 */

import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeMathjax from 'rehype-mathjax';

interface CardContentProps {
  /** The content string to render (may contain markdown and/or LaTeX) */
  content: string;
  /** Optional CSS class name */
  className?: string;
}

export function CardContent({ content, className }: CardContentProps) {
  return (
    <div className={`card-content-rendered ${className ?? ''}`}>
      <Markdown
        remarkPlugins={[remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeMathjax]}
      >
        {content}
      </Markdown>
    </div>
  );
}
