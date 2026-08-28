'use client';
import { vars } from 'nativewind';
import { cssVars } from '@/theme/tokens';

/**
 * Local deviation from the stock gluestack registry: the 309-line hand-written
 * palette is replaced by the generated Radix token set. Keep this file at this
 * path so `npx gluestack-ui add <component>` keeps working.
 *
 * Edit theme/token-map.ts, not this file.
 */
export const config = {
  light: vars(cssVars.light),
  dark: vars(cssVars.dark),
};
