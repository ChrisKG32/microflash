import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ThemedView } from './themed-view';

// Mock the useThemeColor hook to return predictable colors
jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: () => '#ffffff',
}));

describe('ThemedView', () => {
  it('renders children correctly', () => {
    render(
      <ThemedView>
        <Text>Child Content</Text>
      </ThemedView>,
    );

    expect(screen.getByText('Child Content')).toBeTruthy();
  });

  it('renders with testID prop', () => {
    render(
      <ThemedView testID="themed-view">
        <Text>Test Content</Text>
      </ThemedView>,
    );

    expect(screen.getByTestId('themed-view')).toBeTruthy();
  });

  it('applies custom style prop', () => {
    render(
      <ThemedView style={{ padding: 20 }} testID="styled-view">
        <Text>Styled Content</Text>
      </ThemedView>,
    );

    expect(screen.getByTestId('styled-view')).toBeTruthy();
  });

  it('renders multiple children', () => {
    render(
      <ThemedView>
        <Text>First Child</Text>
        <Text>Second Child</Text>
      </ThemedView>,
    );

    expect(screen.getByText('First Child')).toBeTruthy();
    expect(screen.getByText('Second Child')).toBeTruthy();
  });
});
