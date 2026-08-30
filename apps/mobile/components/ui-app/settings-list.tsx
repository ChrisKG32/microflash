'use client';
import type { ReactNode } from 'react';

import { Box } from '@/components/ui/box';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';

/**
 * The settings-style card and its label/value row.
 *
 * `Section` and a `StatusRow`/`StatRow` pair were defined privately three
 * times — in (menu)/settings.tsx, sprint/complete.tsx and inline inside
 * (menu)/notification-controls.tsx — each rewriting the same tone→class map.
 *
 * The two private versions did differ, and this keeps both: settings renders a
 * status (`muted` default, small, medium weight) while the sprint summary
 * renders a figure (`strong` default, medium size, semibold). Flattening them
 * would have changed one screen's appearance, which is not what de-duplication
 * is for.
 */

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box className="mb-4 rounded-xl bg-background-0 p-4">
      <Heading size="md" className="mb-3">
        {title}
      </Heading>
      {children}
    </Box>
  );
}

export type RowTone = 'muted' | 'strong' | 'positive' | 'negative';

const TONE_CLASS: Record<RowTone, string> = {
  muted: 'text-typography-500',
  strong: 'text-typography-900',
  positive: 'text-success-700',
  negative: 'text-error-700',
};

/**
 * A label on the left, a value on the right.
 *
 * `size` also picks the value's weight, because that is how the two originals
 * differed: settings paired `sm` with `font-medium`, the sprint summary paired
 * `md` with `font-semibold`.
 */
export function StatRow({
  label,
  value,
  tone = 'muted',
  size = 'sm',
  divider = false,
}: {
  label: string;
  value: string | number;
  tone?: RowTone;
  size?: 'sm' | 'md';
  /** Render a Divider below the row. */
  divider?: boolean;
}) {
  const weight = size === 'md' ? 'font-semibold' : 'font-medium';

  return (
    <>
      <HStack className="items-center justify-between py-2">
        <Text size={size} className="text-typography-500">
          {label}
        </Text>
        <Text size={size} className={`${weight} ${TONE_CLASS[tone]}`}>
          {value}
        </Text>
      </HStack>
      {divider ? <Divider /> : null}
    </>
  );
}
