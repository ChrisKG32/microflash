/**
 * Tabs Index Redirect
 *
 * Redirects to the Review tab (default tab)
 */

import { Redirect } from 'expo-router';

export default function TabsIndex() {
  return <Redirect href="/(tabs)/review" />;
}
