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
 * Uses KaTeX auto-render via WebView for content with math.
 * Uses native Markdown for content without math (better performance).
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, StyleProp, TextStyle } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { WebView } from 'react-native-webview';

interface CardContentProps {
  /** The content string to render (may contain markdown and/or LaTeX) */
  content: string;
  /** Font size for the content (default: 18) */
  fontSize?: number;
  /** Text color (default: #333) */
  color?: string;
}

/**
 * Check if content contains any math delimiters
 */
function containsMath(content: string): boolean {
  // Check for any math delimiters: $, $$, \(, \), \[, \]
  return /\$|\\\(|\\\)|\\\[|\\\]/.test(content);
}

/**
 * Convert basic markdown to HTML for WebView rendering
 * Handles: bold, italic, code, headers, lists, links
 */
function markdownToHtml(content: string): string {
  let html = content;

  // Escape HTML entities first (but preserve math delimiters)
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers (must come before bold to avoid conflicts with **)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_ (but not inside math)
  // Be careful not to match inside $ delimiters
  html = html.replace(/(?<!\$)\*(?!\*)(.+?)(?<!\*)\*(?!\$)/g, '<em>$1</em>');
  html = html.replace(/(?<![\\$])_(?!_)(.+?)(?<!_)_(?![\\$])/g, '<em>$1</em>');

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Unordered lists: - item or * item
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');

  // Ordered lists: 1. item
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Paragraphs: double newlines
  html = html.replace(/\n\n+/g, '</p><p>');

  // Single newlines to <br> (but not inside lists)
  html = html.replace(/(?<!<\/li>)\n(?!<)/g, '<br>');

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = '<p>' + html + '</p>';
  }

  return html;
}

/**
 * Generate HTML with KaTeX auto-render for mixed content
 */
function generateKaTeXHTML(
  content: string,
  fontSize: number,
  color: string,
): string {
  const htmlContent = markdownToHtml(content);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" crossorigin="anonymous"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      background-color: transparent;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${fontSize}px;
      line-height: 1.5;
      color: ${color};
      overflow-x: hidden;
    }
    body {
      padding: 4px;
    }
    p {
      margin: 0 0 0.5em 0;
    }
    p:last-child {
      margin-bottom: 0;
    }
    h1 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0; }
    h2 { font-size: 1.3em; font-weight: bold; margin: 0.4em 0; }
    h3 { font-size: 1.1em; font-weight: bold; margin: 0.3em 0; }
    strong { font-weight: bold; }
    em { font-style: italic; }
    code {
      background-color: #f0f0f0;
      font-family: monospace;
      font-size: 0.9em;
      padding: 2px 4px;
      border-radius: 3px;
    }
    ul, ol {
      margin: 0.5em 0;
      padding-left: 1.5em;
    }
    li {
      margin: 0.2em 0;
    }
    a {
      color: #2196f3;
      text-decoration: underline;
    }
    /* KaTeX styling */
    .katex {
      font-size: 1em !important;
    }
    .katex-display {
      margin: 0.5em 0 !important;
      overflow-x: auto;
      overflow-y: hidden;
    }
    /* Error styling - KaTeX renders invalid LaTeX in this span */
    .katex-error {
      color: #cc0000 !important;
      background-color: #ffebee;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.85em;
    }
    /* Custom error message styling */
    .math-error {
      color: #cc0000;
      background-color: #ffebee;
      padding: 4px 8px;
      border-radius: 4px;
      font-style: italic;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div id="content">${htmlContent}</div>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      renderMathInElement(document.getElementById("content"), {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false},
          {left: "\\\\(", right: "\\\\)", display: false},
          {left: "\\\\[", right: "\\\\]", display: true}
        ],
        throwOnError: false,
        errorColor: '#cc0000',
        // Custom error callback to log and style errors
        errorCallback: function(msg, err) {
          console.warn('KaTeX error:', msg, err);
        }
      });
      
      // Send height back to React Native for auto-sizing
      setTimeout(function() {
        var height = document.getElementById("content").offsetHeight;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', value: height }));
      }, 150);
    });
  </script>
</body>
</html>
`;
}

/**
 * CardContent - Main component for rendering card content.
 */
export function CardContent({
  content,
  fontSize = 18,
  color = '#333',
}: CardContentProps) {
  const [webViewHeight, setWebViewHeight] = useState(100);

  // Check if content has any math
  const hasMath = useMemo(() => containsMath(content), [content]);

  // Generate HTML for WebView (only if has math)
  const html = useMemo(
    () => (hasMath ? generateKaTeXHTML(content, fontSize, color) : ''),
    [content, fontSize, color, hasMath],
  );

  // If no math, render pure native markdown (better performance)
  if (!hasMath) {
    return (
      <Markdown style={getMarkdownStyles(fontSize, color)}>{content}</Markdown>
    );
  }

  // Render content with math in WebView using KaTeX auto-render
  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'height' && typeof data.value === 'number') {
        setWebViewHeight(Math.max(data.value + 16, 40));
      }
    } catch {
      // Ignore parse errors
    }
  };

  return (
    <View style={[styles.webViewContainer, { height: webViewHeight }]}>
      <WebView
        source={{ html }}
        style={styles.webView}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bounces={false}
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        androidLayerType="hardware"
        cacheEnabled={true}
      />
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
  webViewContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default CardContent;
