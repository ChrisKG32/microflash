import { act } from '@testing-library/react-native';

type Cleanup = () => void;
type FocusCallback = () => void | Cleanup;
type FocusRegistry = Map<FocusCallback, Cleanup | undefined>;

/**
 * Replay a blur-then-focus on every screen currently rendered.
 *
 * The useFocusEffect mock in jest.setup runs a screen's focus callback once,
 * like useEffect, which covers first paint but never the case a real user hits
 * constantly: coming BACK to a screen that already has content on it. Screens
 * refetch on focus, and a screen that also flips a blocking `loading` flag
 * there will tear down what is on screen and flash a spinner.
 *
 * Registration happens in jest.setup's mock; this reads the same global map,
 * matching the __routeParams handoff in test-utils/router-params.
 */
export async function refocus(): Promise<void> {
  const registry = (globalThis as Record<string, unknown>).__focusCallbacks as
    | FocusRegistry
    | undefined;

  // An empty registry is not an error: a screen that deliberately loads on
  // mount instead of on focus registers nothing, and asserting that a refocus
  // changes nothing there is a test worth having.
  await act(async () => {
    for (const cb of [...(registry?.keys() ?? [])]) {
      registry?.get(cb)?.();
      registry?.set(cb, cb() ?? undefined);
    }
  });
}
