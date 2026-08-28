/**
 * Set the params expo-router's useLocalSearchParams returns for a test.
 *
 * Screens routed on an [id] segment bail out of their fetch when the param is
 * missing, so without this they sit in their loading state forever.
 */
export function setSearchParams(params: Record<string, string>): void {
  (globalThis as Record<string, unknown>).__routeParams = params;
}

export function clearSearchParams(): void {
  delete (globalThis as Record<string, unknown>).__routeParams;
}
