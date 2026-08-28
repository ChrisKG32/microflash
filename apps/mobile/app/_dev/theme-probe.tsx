/**
 * Dev-only theme probe. Route: /_dev/theme-probe
 *
 * Each swatch is split down the middle:
 *   left  — styled with `className`, i.e. through NativeWind -> CSS variable
 *           -> react-native-css-interop
 *   right — styled with an inline `backgroundColor` read straight from
 *           theme/tokens.ts
 *
 * If the two halves of a swatch ever differ, variable resolution has diverged
 * from the source of truth. Under the bug that stalled the first migration,
 * light mode would have shown a screaming black/white split on every
 * background swatch, on device, immediately — no source-diving required.
 *
 * The invariant to check across platforms: for a given token in a given
 * scheme, iOS, Android and web must all render the SAME hex. That equality is
 * exactly what a universal-variable rule breaks, and it breaks it on native
 * only.
 *
 * Toggle the scheme from the OS while the app is foregrounded — a stale-cache
 * bug can look correct on a fresh load but fail to flip live.
 */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GLUESTACK_STEPS, SCALES } from '@/theme/token-map';
import { palette } from '@/theme/tokens';

const SCALE_NAMES = Object.keys(SCALES) as (keyof typeof SCALES)[];

const SPECIALS = [
  'background-error',
  'background-warning',
  'background-success',
  'background-info',
  'background-muted',
  'indicator-primary',
  'indicator-info',
  'indicator-error',
] as const;

function Swatch({ token, hex }: { token: string; hex: string }) {
  return (
    <VStack className="mr-1 mb-1 w-[74px]">
      <View style={{ flexDirection: 'row', height: 34 }}>
        {/* className path: NativeWind -> CSS var -> interop */}
        <Box className={`flex-1 bg-${token}`} />
        {/* JS path: straight from theme/tokens.ts */}
        <View style={{ flex: 1, backgroundColor: hex }} />
      </View>
      <Text size="2xs" className="text-typography-500">
        {token.replace(/^[a-z]+-/, '')}
      </Text>
      <Text size="2xs" className="text-typography-400">
        {hex}
      </Text>
    </VStack>
  );
}

export default function ThemeProbe() {
  const scheme = useColorScheme();
  const [showSpecials, setShowSpecials] = useState(true);
  const p = palette[scheme];

  return (
    <ScrollView className="flex-1 bg-background-0">
      <VStack className="gap-4 p-4">
        <VStack className="gap-1">
          <Heading size="lg">Theme probe</Heading>
          <Text size="sm" className="text-typography-500">
            Resolved scheme: {scheme}. Each swatch is className (left) vs
            palette hex (right) — any visible seam means the variables and the
            source of truth disagree.
          </Text>
        </VStack>

        <Divider />

        {SCALE_NAMES.map((scale) => (
          <VStack key={scale} className="gap-1">
            <Heading size="sm">{scale}</Heading>
            <HStack className="flex-wrap">
              {GLUESTACK_STEPS.map((step) => (
                <Swatch
                  key={step}
                  token={`${scale}-${step}`}
                  hex={p[`${scale}-${step}`]}
                />
              ))}
            </HStack>
          </VStack>
        ))}

        <Divider />

        <Button
          variant="outline"
          onPress={() => setShowSpecials((v) => !v)}
          testID="toggle-specials"
        >
          <ButtonText>
            {showSpecials ? 'Hide' : 'Show'} special tokens
          </ButtonText>
        </Button>

        {showSpecials && (
          <HStack className="flex-wrap">
            {SPECIALS.map((token) => (
              <Swatch key={token} token={token} hex={p[token]} />
            ))}
          </HStack>
        )}

        <Divider />

        <VStack className="gap-2">
          <Heading size="sm">Components</Heading>
          <Heading size="md">Heading on background-0</Heading>
          <Text>Body text, typography-700.</Text>
          <Text className="text-typography-500">
            Secondary, typography-500.
          </Text>
          <Input>
            <InputField placeholder="Input placeholder" />
          </Input>
          <HStack className="gap-2">
            <Button action="primary">
              <ButtonText>Primary</ButtonText>
            </Button>
            <Button action="secondary" variant="outline">
              <ButtonText>Outline</ButtonText>
            </Button>
            <Button action="negative">
              <ButtonText>Delete</ButtonText>
            </Button>
          </HStack>
        </VStack>
      </VStack>
    </ScrollView>
  );
}
