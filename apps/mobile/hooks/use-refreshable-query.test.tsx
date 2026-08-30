import { act, renderHook, waitFor } from '@testing-library/react-native';

import { refocus } from '@/test-utils/focus';
import { useRefreshableQuery } from './use-refreshable-query';

/**
 * The two behaviours this hook exists to make un-losable, both of which were
 * previously re-argued in a comment on every screen that inlined it.
 */
describe('useRefreshableQuery', () => {
  it('resolves to data and stops loading', async () => {
    const fetcher = jest.fn().mockResolvedValue({ n: 1 });
    const { result } = renderHook(() => useRefreshableQuery(fetcher, 'failed'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ n: 1 });
    expect(result.current.error).toBeNull();
  });

  it('reports the error message, falling back when the throw is not an Error', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useRefreshableQuery(fetcher, 'failed'));
    await waitFor(() => expect(result.current.error).toBe('boom'));

    const odd = jest.fn().mockRejectedValue('not-an-error');
    const { result: r2 } = renderHook(() => useRefreshableQuery(odd, 'failed'));
    await waitFor(() => expect(r2.current.error).toBe('failed'));
  });

  it('never re-raises `loading` on a refocus', async () => {
    // This is the flash-of-spinner regression: raising loading on every focus
    // swapped the whole screen for a spinner each time it regained focus.
    const fetcher = jest.fn().mockResolvedValue({ n: 1 });
    const { result } = renderHook(() => useRefreshableQuery(fetcher, 'failed'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await refocus();

    expect(result.current.loading).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('clears a stale error only once new data actually arrives', async () => {
    // Clearing up front leaves a frame with no error, no data and loading
    // already false — which paints the empty state.
    const fetcher = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ n: 2 });

    const { result } = renderHook(() => useRefreshableQuery(fetcher, 'failed'));
    await waitFor(() => expect(result.current.error).toBe('boom'));

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.data).toEqual({ n: 2 });
  });

  it('runs onSuccess after each successful fetch', async () => {
    const onSuccess = jest.fn();
    const fetcher = jest.fn().mockResolvedValue({ n: 1 });
    renderHook(() => useRefreshableQuery(fetcher, 'failed', { onSuccess }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ n: 1 }));
  });
});
