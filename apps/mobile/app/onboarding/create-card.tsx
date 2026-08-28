/**
 * Onboarding: Create First Card
 *
 * Redirects to the standard card creation screen with onboarding context.
 */

import { useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';

import { Center } from '@/components/ui/center';
import { Spinner } from '@/components/ui/spinner';

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
    <Center className="flex-1 bg-background-50">
      <Spinner size="large" className="text-primary-500" />
    </Center>
  );
}
