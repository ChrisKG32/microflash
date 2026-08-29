/**
 * Set the params expo-router's useLocalSearchParams returns for a test.
 *
 * Screens routed on an [id] segment treat a missing param as a load failure,
 * so without this they render their not-found error instead of content.
 */
export function setSearchParams(params: Record<string, string>): void {
  (globalThis as Record<string, unknown>).__routeParams = params;
}

export function clearSearchParams(): void {
  delete (globalThis as Record<string, unknown>).__routeParams;
}
