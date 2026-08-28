/**
 * Guards the build pipeline, not any feature: proves the vendored gluestack
 * registry actually transforms and renders under jest-expo. The gluestack /
 * nativewind / css-interop / legend-motion packages ship ESM, so a regression
 * in jest.config.cjs `transformIgnorePatterns` shows up here as a syntax
 * error rather than as 27 confusing screen-test failures.
 */
import { Button, ButtonText } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { renderScreen } from '@/test-utils/render-screen';

describe('gluestack registry', () => {
  it.each(['light', 'dark'] as const)(
    'renders primitives in %s mode',
    (mode) => {
      const { getByText, getByTestId } = renderScreen(
        <Center>
          <VStack>
            <Heading size="md">Due today</Heading>
            <Text size="sm">7 cards</Text>
            <Spinner testID="spinner" />
            <Button testID="cta">
              <ButtonText>Start Sprint</ButtonText>
            </Button>
          </VStack>
        </Center>,
        mode,
      );

      expect(getByText('Due today')).toBeTruthy();
      expect(getByText('7 cards')).toBeTruthy();
      expect(getByTestId('spinner')).toBeTruthy();
      expect(getByTestId('cta')).toBeTruthy();
    },
  );
});
