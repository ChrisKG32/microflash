# Markdown + LaTeX Rendering

## Title

Markdown + LaTeX rendering for card content (review + editor preview)

## Goal

Meet MVP content rendering requirements for flashcard front/back.

## Scope

Shared renderer component; integration in Sprint Review, Browse mode, Card Editor preview.

## Acceptance Criteria

- Markdown renders correctly: headers, bold/italic, lists, code blocks, links.
- Inline LaTeX (`$...$`) and block LaTeX (`$$...$$`) render.
- Graceful fallback on invalid LaTeX (show raw text, don't crash).
- Works in Expo managed workflow (no native modules requiring prebuild).

## Recommended Libraries

Based on research:

- **Markdown:** `react-native-markdown-display` (maintained, native components, customizable).
- **LaTeX:** `react-native-mathjax-svg` (SVG-based, no WebView overhead).

## Implementation Approach

### Custom Markdown Rules

```typescript
import Markdown from 'react-native-markdown-display';
import MathJax from 'react-native-mathjax-svg';

const markdownRules = {
  text: (node, children, parent, styles) => {
    if (containsLatex(node.content)) {
      return <MixedContent content={node.content} />;
    }
    return <Text style={styles.text}>{children}</Text>;
  },
};

// MixedContent parses and renders text + LaTeX segments
```

### LaTeX Detection

```typescript
function containsLatex(content: string): boolean {
  const patterns = [
    /\$(?!\$).*?\$/, // inline: $...$
    /\$\$.*?\$\$/, // block: $$...$$
    /\\\(.*?\\\)/, // inline: \(...\)
    /\\\[.*?\\\]/, // block: \[...\]
  ];
  return patterns.some((p) => p.test(content));
}
```

## CardContent Component

```typescript
interface CardContentProps {
  content: string;
  style?: StyleProp<ViewStyle>;
}

export function CardContent({ content, style }: CardContentProps) {
  return (
    <View style={style}>
      <Markdown rules={markdownRules} style={markdownStyles}>
        {content}
      </Markdown>
    </View>
  );
}
```

## Usage Locations

- Sprint Review: card front and back.
- Browse mode: card front and back.
- Card Editor: preview pane.
- Deck Detail: card list preview (truncated).

## Subtasks

- [ ] **13.1** Add `react-native-markdown-display` dependency.
- [ ] **13.2** Add `react-native-mathjax-svg` dependency.
- [ ] **13.3** Implement LaTeX detection utility.
- [ ] **13.4** Implement mixed content parser (text + LaTeX segments).
- [ ] **13.5** Create custom markdown rules with LaTeX integration.
- [ ] **13.6** Create `<CardContent />` component.
- [ ] **13.7** Add markdown styles (theming support).
- [ ] **13.8** Integrate in Sprint Review screen.
- [ ] **13.9** Integrate in Browse screen.
- [ ] **13.10** Add preview pane to Card Editor.
- [ ] **13.11** Test edge cases: nested delimiters, escaped characters, invalid LaTeX.

## Test Cases

- Plain markdown: `**bold** and _italic_`
- Inline math: `The formula is $E = mc^2$ here.`
- Block math: `$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$`
- Mixed: `Solve $ax^2 + bx + c = 0$ using: $$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$`
- Invalid LaTeX: `$\invalid{` (should show raw text).

## Dependencies

None (can be done in parallel with other tickets).

## Estimated Effort

Medium
