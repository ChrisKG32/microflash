'use client';
import { useCallback, useMemo } from 'react';
import {
  Toast,
  ToastDescription,
  ToastTitle,
  useToast,
} from '@/components/ui/toast';

type ToastAction = 'error' | 'warning' | 'success' | 'info' | 'muted';

/**
 * Replaces the single-outcome `Alert.alert(title, body)` calls — validation
 * failures, save errors, "Saved" confirmations. Anything where the user has no
 * choice to make.
 *
 * Use `useConfirm()` instead when the user must decide something, or when the
 * action is destructive.
 *
 * Requires the ToastProvider that GluestackUIProvider mounts in
 * app/_layout.tsx.
 */
export function useAppToast() {
  const toast = useToast();

  const show = useCallback(
    (action: ToastAction, title: string, description?: string) => {
      toast.show({
        id: `${action}-${Date.now()}`,
        placement: 'top',
        // Errors linger; confirmations get out of the way.
        duration: action === 'error' ? 5000 : 3000,
        render: ({ id }: { id: string }) => (
          <Toast nativeID={`toast-${id}`} action={action} variant="solid">
            <ToastTitle>{title}</ToastTitle>
            {description ? (
              <ToastDescription>{description}</ToastDescription>
            ) : null}
          </Toast>
        ),
      });
    },
    [toast],
  );

  return useMemo(
    () => ({
      error: (title: string, description?: string) =>
        show('error', title, description),
      success: (title: string, description?: string) =>
        show('success', title, description),
      info: (title: string, description?: string) =>
        show('info', title, description),
      warning: (title: string, description?: string) =>
        show('warning', title, description),
    }),
    [show],
  );
}
