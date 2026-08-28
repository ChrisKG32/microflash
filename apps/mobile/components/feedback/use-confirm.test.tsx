import { fireEvent, screen } from '@testing-library/react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { renderScreen } from '@/test-utils/render-screen';
import { useConfirm, type ConfirmOptions } from './use-confirm';

/**
 * Covers the shared machinery behind every rewritten Alert.alert confirm site,
 * which is far better leverage than testing each call site.
 */
function Harness({
  options,
  onResult,
}: {
  options: ConfirmOptions;
  onResult: (ok: boolean) => void;
}) {
  const { confirm, ConfirmDialog } = useConfirm();
  return (
    <>
      <Button
        testID="open"
        onPress={async () => onResult(await confirm(options))}
      >
        <ButtonText>Open</ButtonText>
      </Button>
      <ConfirmDialog />
    </>
  );
}

const BASIC: ConfirmOptions = {
  title: 'Delete Card?',
  body: 'Cannot be undone.',
};

describe('useConfirm', () => {
  it('renders nothing until confirm() is called', () => {
    renderScreen(<Harness options={BASIC} onResult={jest.fn()} />);
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('shows the title and body', async () => {
    renderScreen(<Harness options={BASIC} onResult={jest.fn()} />);
    fireEvent.press(screen.getByTestId('open'));
    expect(await screen.findByText('Delete Card?')).toBeTruthy();
    expect(screen.getByText('Cannot be undone.')).toBeTruthy();
  });

  it('resolves true when confirmed', async () => {
    const onResult = jest.fn();
    renderScreen(<Harness options={BASIC} onResult={onResult} />);
    fireEvent.press(screen.getByTestId('open'));
    fireEvent.press(await screen.findByTestId('confirm-accept'));
    await screen.findByTestId('open');
    expect(onResult).toHaveBeenCalledWith(true);
  });

  it('resolves false when cancelled', async () => {
    const onResult = jest.fn();
    renderScreen(<Harness options={BASIC} onResult={onResult} />);
    fireEvent.press(screen.getByTestId('open'));
    fireEvent.press(await screen.findByTestId('confirm-cancel'));
    await screen.findByTestId('open');
    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('closes after settling', async () => {
    renderScreen(<Harness options={BASIC} onResult={jest.fn()} />);
    fireEvent.press(screen.getByTestId('open'));
    fireEvent.press(await screen.findByTestId('confirm-accept'));
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('omits the cancel button when acknowledgeOnly', async () => {
    renderScreen(
      <Harness
        options={{ ...BASIC, acknowledgeOnly: true }}
        onResult={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('open'));
    expect(await screen.findByTestId('confirm-accept')).toBeTruthy();
    expect(screen.queryByTestId('confirm-cancel')).toBeNull();
  });

  it('uses custom button labels', async () => {
    renderScreen(
      <Harness
        options={{
          ...BASIC,
          confirmText: 'Delete',
          cancelText: 'Keep Editing',
        }}
        onResult={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('open'));
    expect(await screen.findByText('Delete')).toBeTruthy();
    expect(screen.getByText('Keep Editing')).toBeTruthy();
  });

  it('does not orphan the first promise when confirm() is called twice', async () => {
    const onResult = jest.fn();
    renderScreen(<Harness options={BASIC} onResult={onResult} />);
    fireEvent.press(screen.getByTestId('open'));
    fireEvent.press(screen.getByTestId('open'));
    await screen.findByTestId('confirm-dialog');
    // The superseded call must settle rather than await forever.
    expect(onResult).toHaveBeenCalledWith(false);
  });
});
