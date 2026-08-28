/**
 * Onboarding: Create First Deck
 *
 * User creates their first real deck.
 */

import { useState } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';

import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { KeyboardAvoidingView } from '@/components/ui/keyboard-avoiding-view';
import { Text } from '@/components/ui/text';
import { useAppToast } from '@/components/feedback/use-app-toast';
import { createDeck } from '@/lib/api';

export default function OnboardingCreateDeckScreen() {
  const notify = useAppToast();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!title.trim()) {
      notify.error('Required', 'Please enter a deck name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { deck } = await createDeck({ title: title.trim() });

      // Navigate to create card for this deck
      router.push({
        pathname: '/onboarding/create-card',
        params: { deckId: deck.id },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deck');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{ title: 'Create Deck', headerBackTitle: 'Back' }}
      />
      {/* Explicit flex:1 alongside the class: KeyboardAvoidingView is
          remapProps'd rather than cssInterop'd, so its style resolution is
          shallower than a normal interop component's. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        className="flex-1 bg-background-50"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Center className="flex-1 p-6">
          <Text className="mb-4 text-7xl">📚</Text>
          <Heading size="2xl" className="mb-2 text-center">
            Create Your First Deck
          </Heading>
          <Text size="md" className="mb-8 text-center text-typography-500">
            A deck is a collection of flashcards on a topic. You can create as
            many as you need.
          </Text>

          <Input variant="outline" size="xl" className="mb-4 w-full">
            <InputField
              placeholder="e.g., Spanish Vocabulary"
              value={title}
              onChangeText={setTitle}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              testID="deck-name-input"
            />
          </Input>

          {error && (
            <Text size="sm" className="mb-4 text-center text-error-700">
              {error}
            </Text>
          )}

          <Button
            size="xl"
            action="primary"
            className="w-full rounded-xl"
            onPress={handleContinue}
            isDisabled={loading || !title.trim()}
            testID="continue-button"
          >
            {loading ? (
              <ButtonSpinner className="text-typography-0" />
            ) : (
              <ButtonText>Continue</ButtonText>
            )}
          </Button>
        </Center>
      </KeyboardAvoidingView>
    </>
  );
}
