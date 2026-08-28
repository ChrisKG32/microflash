'use client';
import { useCallback, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

export type ConfirmOptions = {
  title: string;
  body?: string;
  confirmText?: string;
  cancelText?: string;
  /** 'negative' renders a destructive confirm button. */
  action?: 'primary' | 'negative';
  /** Single acknowledge button, no cancel. */
  acknowledgeOnly?: boolean;
};

/**
 * Promise-returning confirmation dialog.
 *
 * Deliberately keeps the imperative shape of the `Alert.alert(..., [buttons])`
 * calls it replaces: a call site adds one `await` and renders
 * `<ConfirmDialog />`, rather than being restructured into dialog state. That
 * matters most in the card delete/discard flows, whose async work currently
 * lives inside a button callback and would otherwise have to be hoisted.
 *
 *   const { confirm, ConfirmDialog } = useConfirm();
 *   if (!(await confirm({ title: 'Delete card?', action: 'negative' }))) return;
 *   ...
 *   <ConfirmDialog />
 *
 * Requires the OverlayProvider that GluestackUIProvider mounts in
 * app/_layout.tsx.
 */
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const settle = useCallback((ok: boolean) => {
    setOpts(null);
    resolver.current?.(ok);
    resolver.current = null;
  }, []);

  const confirm = useCallback((next: ConfirmOptions) => {
    // If one is already open, resolve it false rather than orphaning its
    // promise — otherwise the earlier caller awaits forever.
    resolver.current?.(false);
    setOpts(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const ConfirmDialog = useCallback(() => {
    if (!opts) return null;
    const {
      title,
      body,
      confirmText = 'OK',
      cancelText = 'Cancel',
      action = 'primary',
      acknowledgeOnly = false,
    } = opts;

    return (
      <AlertDialog isOpen onClose={() => settle(false)} size="md">
        <AlertDialogBackdrop />
        <AlertDialogContent testID="confirm-dialog">
          <AlertDialogHeader>
            <Heading size="md">{title}</Heading>
          </AlertDialogHeader>
          {body ? (
            <AlertDialogBody className="mb-4 mt-3">
              <Text size="sm" className="text-typography-500">
                {body}
              </Text>
            </AlertDialogBody>
          ) : null}
          <AlertDialogFooter>
            {!acknowledgeOnly && (
              <Button
                variant="outline"
                action="secondary"
                size="sm"
                onPress={() => settle(false)}
                testID="confirm-cancel"
              >
                <ButtonText>{cancelText}</ButtonText>
              </Button>
            )}
            <Button
              action={action}
              size="sm"
              onPress={() => settle(true)}
              testID="confirm-accept"
            >
              <ButtonText>{confirmText}</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }, [opts, settle]);

  return { confirm, ConfirmDialog };
}
