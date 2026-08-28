import { fireEvent, screen } from '@testing-library/react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { renderScreen } from '@/test-utils/render-screen';
import { useAppToast } from './use-app-toast';

function Harness({
  kind,
  title,
  body,
}: {
  kind: 'error' | 'success' | 'info' | 'warning';
  title: string;
  body?: string;
}) {
  const notify = useAppToast();
  return (
    <Button testID="fire" onPress={() => notify[kind](title, body)}>
      <ButtonText>Fire</ButtonText>
    </Button>
  );
}

describe('useAppToast', () => {
  it.each(['error', 'success', 'info', 'warning'] as const)(
    'shows a %s toast with title and description',
    async (kind) => {
      renderScreen(<Harness kind={kind} title="Saved" body="All good" />);
      fireEvent.press(screen.getByTestId('fire'));
      expect(await screen.findByText('Saved')).toBeTruthy();
      expect(screen.getByText('All good')).toBeTruthy();
    },
  );

  it('omits the description when not given', async () => {
    renderScreen(<Harness kind="info" title="Heads up" />);
    fireEvent.press(screen.getByTestId('fire'));
    expect(await screen.findByText('Heads up')).toBeTruthy();
  });

  it('renders nothing before anything is fired', () => {
    renderScreen(<Harness kind="error" title="Boom" />);
    expect(screen.queryByText('Boom')).toBeNull();
  });
});
