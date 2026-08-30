import { fireEvent, screen } from '@testing-library/react-native';

import { Text } from '@/components/ui/text';
import { renderScreen } from '@/test-utils/render-screen';
import { ScreenLoading, ScreenMessage } from './screen-state';

/**
 * These two compositions now stand behind ~20 call sites, so their contract is
 * worth pinning directly rather than only through the screens that use them.
 */
describe('ScreenLoading', () => {
  it.each(['light', 'dark'] as const)('renders in %s', (scheme) => {
    renderScreen(<ScreenLoading label="Loading decks..." />, scheme);
    expect(screen.getByText('Loading decks...')).toBeTruthy();
  });

  it('omits the caption when no label is given', () => {
    renderScreen(<ScreenLoading />);
    expect(screen.queryByText('Loading decks...')).toBeNull();
  });
});

describe('ScreenMessage', () => {
  it.each(['light', 'dark'] as const)(
    'renders glyph, title and body in %s',
    (scheme) => {
      renderScreen(
        <ScreenMessage glyph="📚" title="No decks yet" body="Create one." />,
        scheme,
      );
      expect(screen.getByText('📚')).toBeTruthy();
      expect(screen.getByText('No decks yet')).toBeTruthy();
      expect(screen.getByText('Create one.')).toBeTruthy();
    },
  );

  it('renders an action only when both label and handler are given', () => {
    const onAction = jest.fn();
    renderScreen(
      <ScreenMessage
        body="boom"
        actionLabel="Retry"
        onAction={onAction}
        actionTestID="retry-button"
      />,
    );

    fireEvent.press(screen.getByTestId('retry-button'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('omits the action when there is no handler', () => {
    renderScreen(<ScreenMessage body="boom" actionLabel="Retry" />);
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('renders children between the body and the action', () => {
    // Order matters: browse.tsx puts two paragraphs above its button.
    renderScreen(
      <ScreenMessage
        body="first"
        actionLabel="Go Back"
        onAction={jest.fn()}
        actionTestID="go-back-button"
      >
        <Text>second</Text>
      </ScreenMessage>,
    );
    expect(screen.getByText('second')).toBeTruthy();
    expect(screen.getByTestId('go-back-button')).toBeTruthy();
  });
});
