/**
 * Card Markdown Parsing Utilities
 *
 * Handles splitting and joining card content using markdown separator.
 * A card is two-sided if it contains an exact `\n---\n` separator.
 */

const SEPARATOR = '\n---\n';

export interface CardMarkdownParts {
  front: string;
  back: string;
  hasSeparator: boolean;
  /** Character index where the separator starts (null if no separator) */
  separatorIndex: number | null;
}

/**
 * Split raw markdown content into front and back parts.
 * Uses exact `\n---\n` as the separator.
 *
 * @param raw - The raw markdown content
 * @returns Parsed parts with front, back, and separator info
 */
export function splitCardMarkdown(raw: string): CardMarkdownParts {
  // Normalize line endings for consistent parsing
  const normalized = raw.replace(/\r\n/g, '\n');

  const separatorIndex = normalized.indexOf(SEPARATOR);

  if (separatorIndex === -1) {
    return {
      front: normalized,
      back: '',
      hasSeparator: false,
      separatorIndex: null,
    };
  }

  const front = normalized.slice(0, separatorIndex);
  const back = normalized.slice(separatorIndex + SEPARATOR.length);

  return {
    front,
    back,
    hasSeparator: true,
    separatorIndex,
  };
}

/**
 * Join front and back content into a single markdown string.
 * Only adds separator if back has content.
 *
 * @param front - Front content
 * @param back - Back content
 * @returns Combined markdown string
 */
export function joinCardMarkdown(front: string, back: string): string {
  if (back.trim().length > 0) {
    return `${front}\n---\n${back}`;
  }
  return front;
}

/**
 * Determine which side of the card the cursor is on.
 *
 * @param cursorIndex - Current cursor position in the text
 * @param separatorIndex - Index where separator starts (null if none)
 * @returns 'front' or 'back'
 */
export function getCursorSide(
  cursorIndex: number,
  separatorIndex: number | null,
): 'front' | 'back' {
  if (separatorIndex === null) {
    return 'front';
  }
  // If cursor is at or before separator start, it's on the front
  // If cursor is after separator start, it's on the back
  return cursorIndex <= separatorIndex ? 'front' : 'back';
}
