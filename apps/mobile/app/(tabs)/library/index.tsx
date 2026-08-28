import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { FlatList } from '@/components/ui/flat-list';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAppToast } from '@/components/feedback/use-app-toast';
import { ThemedRefreshControl } from '@/components/ui-app/themed-refresh-control';
import { getDecks, createDeck, type Deck } from '@/lib/api';

export default function DecksScreen() {
  const notify = useAppToast();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create deck form
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchDecks = useCallback(async () => {
    try {
      setError(null);
      const { decks: fetchedDecks } = await getDecks();
      setDecks(fetchedDecks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load decks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDecks();
    }, [fetchDecks]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDecks();
  };

  const handleCreateDeck = async () => {
    if (!newTitle.trim()) {
      notify.error('Error', 'Please enter a deck title');
      return;
    }

    try {
      setCreating(true);
      await createDeck({ title: newTitle.trim() });
      setNewTitle('');
      setShowForm(false);
      await fetchDecks();
    } catch (err) {
      notify.error(
        'Error',
        err instanceof Error ? err.message : 'Failed to create deck',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDeckPress = (deck: Deck) => {
    router.push(`/(tabs)/library/deck/${deck.id}`);
  };

  // Pressable, not Button: Button forces a fixed height and centred row,
  // which squashes a multi-line list item.
  const renderDeck = ({ item }: { item: Deck }) => (
    <Pressable
      className="flex-row items-center justify-between rounded-xl bg-background-0 p-4"
      onPress={() => handleDeckPress(item)}
      testID={`deck-${item.id}`}
    >
      <VStack className="flex-1">
        <Text size="md" className="font-semibold text-typography-900">
          {item.title}
        </Text>
        {item.description && (
          <Text
            size="sm"
            className="mt-1 text-typography-500"
            numberOfLines={1}
          >
            {item.description}
          </Text>
        )}
      </VStack>
      <HStack className="items-center">
        <Text size="sm" className="text-typography-500">
          {item.cardCount} cards
        </Text>
        <Text size="xl" className="ml-2 text-typography-300">
          ›
        </Text>
      </HStack>
    </Pressable>
  );

  if (loading) {
    return (
      <Center className="flex-1 bg-background-50">
        <Spinner size="large" className="text-primary-500" />
        <Text size="md" className="mt-3 text-typography-500">
          Loading decks...
        </Text>
      </Center>
    );
  }

  return (
    <Box className="flex-1 bg-background-50">
      {/* Create Deck Form */}
      {showForm ? (
        <VStack className="border-b border-outline-100 bg-background-0 p-4">
          <Input variant="outline" isDisabled={creating} className="mb-3">
            <InputField
              placeholder="Deck title"
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
              testID="deck-title-input"
            />
          </Input>
          <HStack className="gap-3">
            <Button
              variant="outline"
              action="secondary"
              className="flex-1"
              isDisabled={creating}
              onPress={() => {
                setShowForm(false);
                setNewTitle('');
              }}
              testID="cancel-deck-button"
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button
              action="primary"
              className="flex-1"
              isDisabled={creating}
              onPress={handleCreateDeck}
              testID="create-deck-button"
            >
              {creating ? (
                <ButtonSpinner className="text-typography-0" />
              ) : (
                <ButtonText>Create</ButtonText>
              )}
            </Button>
          </HStack>
        </VStack>
      ) : (
        <Button
          variant="link"
          action="primary"
          className="justify-start p-4"
          onPress={() => setShowForm(true)}
          testID="new-deck-button"
        >
          <ButtonText>+ New Deck</ButtonText>
        </Button>
      )}

      {error ? (
        <Center className="flex-1 p-5">
          <Text size="md" className="mb-4 text-center text-error-700">
            {error}
          </Text>
          <Button
            action="primary"
            onPress={handleRefresh}
            testID="retry-button"
          >
            <ButtonText>Retry</ButtonText>
          </Button>
        </Center>
      ) : decks.length === 0 ? (
        <Center className="flex-1 p-5">
          <Text className="mb-4 text-6xl">📚</Text>
          <Heading size="lg" className="mb-2">
            No decks yet
          </Heading>
          <Text size="md" className="text-center text-typography-500">
            Create your first deck to start learning!
          </Text>
        </Center>
      ) : (
        // Spacing stays on the content container: wrapping FlatList children
        // in a stack would defeat virtualization.
        <FlatList
          data={decks}
          renderItem={renderDeck}
          keyExtractor={(item: Deck) => item.id}
          contentContainerClassName="gap-3 p-4"
          refreshControl={
            <ThemedRefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        />
      )}
    </Box>
  );
}
