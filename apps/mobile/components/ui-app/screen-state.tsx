'use client';
import type { ReactNode } from 'react';

import { Button, ButtonText } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';

/**
 * The three full-screen states every data-backed screen renders: loading,
 * failed, and "nothing to show". Each was hand-copied into eight to thirteen
 * screens, and had already drifted — the spinner caption sat on `mt-3` in some
 * screens and `mt-4` in others.
 *
 * These are compositions of the vendored primitives, not new design: every
 * className below is lifted verbatim from the call sites they replace. No new
 * tokens, no new visual decisions.
 */

/** Full-screen spinner with an optional caption. */
export function ScreenLoading({
  label,
  className = 'flex-1 bg-background-50',
}: {
  label?: string;
  /** Override only when the surface differs — AuthGate sits on background-0. */
  className?: string;
}) {
  return (
    <Center className={className}>
      <Spinner size="large" className="text-primary-500" />
      {label ? (
        <Text size="md" className="mt-3 text-typography-500">
          {label}
        </Text>
      ) : null}
    </Center>
  );
}

/**
 * Centred glyph + heading + body + optional action.
 *
 * Covers the error branches (`tone="error"`), the empty states, and the
 * placeholder screens, which were three shapes of the same markup.
 */
export function ScreenMessage({
  glyph,
  glyphClassName = 'mb-4 text-6xl',
  title,
  titleSize = 'lg',
  body,
  tone = 'default',
  actionLabel,
  onAction,
  actionTestID,
  children,
  className = 'flex-1 bg-background-50 p-5',
}: {
  /** Emoji or short glyph rendered above the title. */
  glyph?: string;
  /** Glyph sizing — call sites use text-4xl through text-7xl. */
  glyphClassName?: string;
  title?: string;
  titleSize?: 'lg' | 'xl' | '2xl' | '3xl';
  body?: string;
  /** 'error' paints the body text with the error ramp. */
  tone?: 'default' | 'error';
  actionLabel?: string;
  onAction?: () => void;
  actionTestID?: string;
  /**
   * Extra content between the body and the action — where a screen needs a
   * second paragraph, or body text the `body` string cannot express.
   */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Center className={className}>
      {glyph ? <Text className={glyphClassName}>{glyph}</Text> : null}
      {title ? (
        <Heading size={titleSize} className="mb-2 text-center">
          {title}
        </Heading>
      ) : null}
      {body ? (
        <Text
          size="md"
          className={
            tone === 'error'
              ? 'mb-4 text-center text-error-700'
              : 'text-center text-typography-500'
          }
        >
          {body}
        </Text>
      ) : null}
      {children}
      {actionLabel && onAction ? (
        <Button action="primary" onPress={onAction} testID={actionTestID}>
          <ButtonText>{actionLabel}</ButtonText>
        </Button>
      ) : null}
    </Center>
  );
}
