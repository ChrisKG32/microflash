/**
 * Onboarding: Create First Card
 *
 * Redirects to the standard card creation screen with onboarding context.
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function OnboardingCreateCardScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();

  useEffect(() => {
    if (deckId) {
      // Redirect to the standard card creation screen
      // with returnTo pointing to fixture-sprint
      router.replace({
        pathname: '/(tabs)/library/card/new',
        params: {
          deckId,
          returnTo: '/onboarding/fixture-sprint',
        },
      });
    }
  }, [deckId]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2196f3" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
