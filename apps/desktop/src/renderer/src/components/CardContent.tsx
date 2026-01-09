/**
 * CardContent Component
 *
 * Renders card content (front/back) with Markdown and LaTeX support.
 * Uses react-markdown with remark-math and rehype-katex for math rendering.
 *
 * Supports:
 * - Markdown formatting (bold, italic, lists, code, etc.)
 * - LaTeX math: $...$ (inline) and $$...$$ (display)
 * - LaTeX math: \(...\) (inline) and \[...\] (display)
 */

import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          [
            rehypeKatex,
            {
              strict: 'warn',
              throwOnError: false,
            },
          ],
        ]}
      >
        {content}
      </Markdown>
    </div>
  );
}
