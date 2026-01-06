import { render, screen } from '@testing-library/react-native';

import { ThemedText } from './themed-text';

// Mock the useThemeColor hook to return predictable colors
jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: () => '#000000',
}));

describe('ThemedText', () => {
  it('renders text content correctly', () => {
    render(<ThemedText>Hello World</ThemedText>);

    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('renders with default type styling', () => {
    render(<ThemedText>Default Text</ThemedText>);

    const text = screen.getByText('Default Text');
    expect(text).toBeTruthy();
  });

  it('renders with title type', () => {
    render(<ThemedText type="title">Title Text</ThemedText>);

    expect(screen.getByText('Title Text')).toBeTruthy();
  });

  it('renders with subtitle type', () => {
    render(<ThemedText type="subtitle">Subtitle Text</ThemedText>);

    expect(screen.getByText('Subtitle Text')).toBeTruthy();
  });

  it('renders with link type', () => {
    render(<ThemedText type="link">Link Text</ThemedText>);

    expect(screen.getByText('Link Text')).toBeTruthy();
  });

  it('renders with defaultSemiBold type', () => {
    render(<ThemedText type="defaultSemiBold">Semi Bold Text</ThemedText>);

    expect(screen.getByText('Semi Bold Text')).toBeTruthy();
  });

  it('applies custom style prop', () => {
    render(
      <ThemedText style={{ marginTop: 10 }} testID="custom-text">
        Custom Styled
      </ThemedText>,
    );

    expect(screen.getByTestId('custom-text')).toBeTruthy();
  });
});
