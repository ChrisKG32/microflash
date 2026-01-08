/**
 * CardContent Component
 *
 * Renders card content with support for:
 * - Markdown formatting (bold, italic, lists, code, etc.)
 * - LaTeX math expressions (inline and block)
 *
 * Supported math delimiters:
 * - Inline: $...$ or \(...\)
 * - Block: $$...$$ or \[...\]
 *
 * Invalid LaTeX gracefully falls back to showing [Invalid math] text.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { MathJaxSvg } from 'react-native-mathjax-html-to-text-svg';

interface CardContentProps {
  /** The content string to render (may contain markdown and/or LaTeX) */
  content: string;
  /** Font size for the content (default: 18) */
  fontSize?: number;
  /** Text color (default: #333) */
  color?: string;
}

/** Segment types for content parsing */
type SegmentType = 'text' | 'inline-math' | 'block-math';

interface Segment {
  type: SegmentType;
  content: string;
}

/**
 * Parse content into segments of text and math.
 * Handles both delimiter styles: $/$$ and \(\)/\[\]
 * Block delimiters ($$, \[) take precedence over inline ($, \().
 */
function parseContent(content: string): Segment[] {
  const segments: Segment[] = [];

  // Combined regex to match all math delimiters
  // Order matters: block delimiters first ($$, \[), then inline ($, \()
  // Using non-greedy matching to get shortest valid match
  const mathRegex =
    /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([^\)]+?\\\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(content)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index);
      if (textContent.trim()) {
        segments.push({ type: 'text', content: textContent });
      } else if (textContent) {
        // Preserve whitespace-only segments for spacing
        segments.push({ type: 'text', content: textContent });
      }
    }

    const matchedStr = match[0];
    let mathContent: string;
    let isBlock: boolean;

    // Determine delimiter type and extract content
    if (matchedStr.startsWith('$$')) {
      // Block: $$...$$
      mathContent = matchedStr.slice(2, -2).trim();
      isBlock = true;
    } else if (matchedStr.startsWith('\\[')) {
      // Block: \[...\]
      mathContent = matchedStr.slice(2, -2).trim();
      isBlock = true;
    } else if (matchedStr.startsWith('$')) {
      // Inline: $...$
      mathContent = matchedStr.slice(1, -1).trim();
      isBlock = false;
    } else if (matchedStr.startsWith('\\(')) {
      // Inline: \(...\)
      mathContent = matchedStr.slice(2, -2).trim();
      isBlock = false;
    } else {
      // Shouldn't happen, but treat as text
      segments.push({ type: 'text', content: matchedStr });
      lastIndex = match.index + matchedStr.length;
      continue;
    }

    if (mathContent) {
      segments.push({
        type: isBlock ? 'block-math' : 'inline-math',
        content: mathContent,
      });
    }

    lastIndex = match.index + matchedStr.length;
  }

  // Add remaining text after last match
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining) {
      segments.push({ type: 'text', content: remaining });
    }
  }

  // If no segments were created, treat entire content as text
  if (segments.length === 0 && content) {
    segments.push({ type: 'text', content });
  }

  return segments;
}

/**
 * MathRenderer component with error handling.
 * Wraps MathJaxSvg and catches rendering errors.
 */
function MathRenderer({
  latex,
  isBlock,
  fontSize,
  color,
}: {
  latex: string;
  isBlock: boolean;
  fontSize: number;
  color: string;
}) {
  // MathJaxSvg expects the full delimited string
  const wrappedLatex = isBlock ? `$$${latex}$$` : `$${latex}$`;

  return (
    <View
      style={isBlock ? styles.blockMathContainer : styles.inlineMathContainer}
    >
      <MathJaxSvg
        fontSize={fontSize}
        color={color}
        style={isBlock ? styles.blockMath : styles.inlineMath}
      >
        {wrappedLatex}
      </MathJaxSvg>
    </View>
  );
}

/**
 * Error boundary wrapper for math rendering.
 * Shows fallback text if MathJax fails.
 */
class MathErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('[CardContent] Math rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <Text style={styles.mathError}>[Invalid math]</Text>;
    }
    return this.props.children;
  }
}

/**
 * CardContent - Main component for rendering card content.
 */
export function CardContent({
  content,
  fontSize = 18,
  color = '#333',
}: CardContentProps) {
  // Parse content into segments
  const segments = useMemo(() => parseContent(content), [content]);

  // Check if content has any math
  const hasMath = segments.some(
    (s) => s.type === 'inline-math' || s.type === 'block-math',
  );

  // If no math, render pure markdown
  if (!hasMath) {
    return (
      <Markdown style={getMarkdownStyles(fontSize, color)}>{content}</Markdown>
    );
  }

  // Render mixed content with math
  return (
    <View style={styles.container}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          // Render markdown for text segments
          return (
            <Markdown key={index} style={getMarkdownStyles(fontSize, color)}>
              {segment.content}
            </Markdown>
          );
        }

        // Render math segments with error boundary
        const isBlock = segment.type === 'block-math';
        return (
          <MathErrorBoundary key={index} fallback={segment.content}>
            <MathRenderer
              latex={segment.content}
              isBlock={isBlock}
              fontSize={fontSize}
              color={color}
            />
          </MathErrorBoundary>
        );
      })}
    </View>
  );
}

/**
 * Generate markdown styles based on fontSize and color.
 */
function getMarkdownStyles(
  fontSize: number,
  color: string,
): StyleProp<TextStyle> {
  return {
    body: {
      fontSize,
      color,
      lineHeight: fontSize * 1.5,
    },
    heading1: {
      fontSize: fontSize * 1.5,
      fontWeight: 'bold' as const,
      color,
      marginVertical: 8,
    },
    heading2: {
      fontSize: fontSize * 1.3,
      fontWeight: 'bold' as const,
      color,
      marginVertical: 6,
    },
    heading3: {
      fontSize: fontSize * 1.1,
      fontWeight: 'bold' as const,
      color,
      marginVertical: 4,
    },
    strong: {
      fontWeight: 'bold' as const,
    },
    em: {
      fontStyle: 'italic' as const,
    },
    code_inline: {
      backgroundColor: '#f0f0f0',
      fontFamily: 'monospace',
      fontSize: fontSize * 0.9,
      paddingHorizontal: 4,
      borderRadius: 3,
    },
    code_block: {
      backgroundColor: '#f5f5f5',
      fontFamily: 'monospace',
      fontSize: fontSize * 0.85,
      padding: 12,
      borderRadius: 6,
      marginVertical: 8,
    },
    fence: {
      backgroundColor: '#f5f5f5',
      fontFamily: 'monospace',
      fontSize: fontSize * 0.85,
      padding: 12,
      borderRadius: 6,
      marginVertical: 8,
    },
    blockquote: {
      backgroundColor: '#f9f9f9',
      borderLeftWidth: 4,
      borderLeftColor: '#ddd',
      paddingLeft: 12,
      paddingVertical: 4,
      marginVertical: 8,
    },
    list_item: {
      marginVertical: 2,
    },
    bullet_list: {
      marginVertical: 4,
    },
    ordered_list: {
      marginVertical: 4,
    },
    link: {
      color: '#2196f3',
      textDecorationLine: 'underline' as const,
    },
  } as StyleProp<TextStyle>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  inlineMathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  blockMathContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  inlineMath: {
    // Inline math styling handled by MathJaxSvg
  },
  blockMath: {
    // Block math styling handled by MathJaxSvg
  },
  mathError: {
    color: '#d32f2f',
    fontStyle: 'italic',
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});

export default CardContent;
