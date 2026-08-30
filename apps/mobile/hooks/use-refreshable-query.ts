'use client';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Fetch-on-focus with pull-to-refresh, for the list screens.
 *
 * Three screens carried this same block — three `useState`s, the same
 * try/catch/finally, the same `useFocusEffect`, and two long comments explaining
 * the same two decisions, copy-pasted almost verbatim. Both decisions are
 * load-bearing and are now made in one place:
 *
 * 1. `error` is cleared on SUCCESS, not before the request. Clearing up front
 *    leaves a frame with no error, no data and `loading` already false — which
 *    paints the empty state.
 *
 * 2. `loading` is only ever true before the FIRST settle. Raising it on refocus
 *    swapped the whole screen for a spinner every time it regained focus;
 *    against a local server the refetch lands immediately, so it read as a
 *    flash rather than a load. A refocus now refreshes underneath the content.
 *
 * Screens whose fetch must NOT re-run on focus (the card editor is a form —
 * refetching discards what the user typed) deliberately do not use this hook.
 */
export function useRefreshableQuery<T>(
  fetcher: () => Promise<T>,
  fallbackMessage: string,
  options: {
    /** Runs after every successful fetch — e.g. arming the resume-CTA timer. */
    onSuccess?: (data: T) => void;
    /** Returned from the focus effect, so it runs on blur and unmount. */
    onBlur?: () => void;
  } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { onSuccess, onBlur } = options;

  const load = useCallback(async () => {
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
      onSuccess?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // `fetcher` and `onSuccess` are expected to be useCallback-stable at the
    // call site, the same contract the inlined versions had.
  }, [fetcher, fallbackMessage, onSuccess]);

  useFocusEffect(
    useCallback(() => {
      load();
      return onBlur;
    }, [load, onBlur]),
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { data, setData, loading, refreshing, error, setError, refresh, load };
}
