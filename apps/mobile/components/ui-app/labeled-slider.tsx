'use client';
import {
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
} from '@/components/ui/slider';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/**
 * Label + live value + slider + optional end labels + optional hint.
 *
 * This composition was written out four times — both card editors, the deck
 * screen, and a private `PreferenceSlider` inside onboarding/setup.tsx. This is
 * that private component promoted and widened to cover the other three, not a
 * new design: every className is lifted from the call sites.
 */
export function LabeledSlider({
  label,
  labelSize = 'sm',
  value,
  valueSize = 'md',
  valueClassName = 'font-semibold text-primary-500',
  valueSuffix,
  hint,
  hintPlacement = 'below',
  minValue,
  maxValue,
  step = 1,
  onChange,
  onChangeEnd,
  busy = false,
  endLabels,
  testID,
  className = '',
}: {
  label: string;
  /** Card editors use 'sm'; the deck screen and onboarding use 'md'. */
  labelSize?: 'sm' | 'md';
  value: number;
  valueSize?: 'sm' | 'md';
  /** Onboarding renders the value as muted helper text, not a primary figure. */
  valueClassName?: string;
  /** Rendered after the value, e.g. ' (Recommended)'. */
  valueSuffix?: string;
  /** Helper line. */
  hint?: string;
  /**
   * Onboarding puts its hint directly under the label; the card and deck
   * editors put theirs under the track.
   */
  hintPlacement?: 'above' | 'below';
  minValue: number;
  maxValue: number;
  step?: number;
  onChange: (value: number) => void;
  /**
   * Fires when the drag ends. The deck screen writes to the network here so a
   * drag does not fire a request per frame.
   */
  onChangeEnd?: (value: number) => void;
  /** Renders a spinner beside the value — used while a write is in flight. */
  busy?: boolean;
  /** e.g. ['Low', 'High'] under the track. */
  endLabels?: [string, string];
  testID: string;
  className?: string;
}) {
  return (
    <VStack className={className}>
      <HStack className="items-center justify-between">
        <Text size={labelSize} className="font-semibold text-typography-900">
          {label}
        </Text>
        <HStack className="items-center gap-2">
          <Text size={valueSize} className={valueClassName}>
            {value}
            {valueSuffix}
          </Text>
          {busy ? <Spinner size="small" className="text-primary-500" /> : null}
        </HStack>
      </HStack>
      {hint && hintPlacement === 'above' ? (
        <Text size="xs" className="mt-1 text-typography-500">
          {hint}
        </Text>
      ) : null}
      <Slider
        className="my-3"
        minValue={minValue}
        maxValue={maxValue}
        step={step}
        value={value}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
        testID={testID}
      >
        <SliderTrack>
          <SliderFilledTrack />
        </SliderTrack>
        <SliderThumb />
      </Slider>
      {endLabels ? (
        <HStack className="justify-between">
          <Text size="xs" className="text-typography-400">
            {endLabels[0]}
          </Text>
          <Text size="xs" className="text-typography-400">
            {endLabels[1]}
          </Text>
        </HStack>
      ) : null}
      {hint && hintPlacement === 'below' ? (
        <Text size="xs" className="mt-2 text-typography-500">
          {hint}
        </Text>
      ) : null}
    </VStack>
  );
}
