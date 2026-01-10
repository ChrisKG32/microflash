import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  TextField,
  TextArea,
  Card,
  Dialog,
  Callout,
  Spinner,
  IconButton,
} from '@radix-ui/themes';
import { Cross2Icon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import {
  getDecks,
  createDeck,
  deleteDeck,
  startSprint,
  ApiError,
  type Deck,
} from '@microflash/api-client';

export function DecksPage() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [startingSprint, setStartingSprint] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Deck | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDecks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDecks();
      setDecks(response.decks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load decks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckTitle.trim()) return;

    try {
      setCreating(true);
      await createDeck({
        title: newDeckTitle.trim(),
        description: newDeckDescription.trim() || undefined,
      });
      setNewDeckTitle('');
      setNewDeckDescription('');
      setShowCreateModal(false);
      await loadDecks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deck');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDeck = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await deleteDeck(deleteTarget.id);
      setDeleteTarget(null);
      await loadDecks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deck');
    } finally {
      setDeleting(false);
    }
  };

  const handleStartSprint = async () => {
    setStartingSprint(true);
    setError(null);

    try {
      const { sprint } = await startSprint({ source: 'HOME' });
      navigate(
        `/sprint/${sprint.id}?returnTo=${encodeURIComponent('/')}&launchSource=HOME`,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'NO_ELIGIBLE_CARDS') {
          setError('No cards are due for review right now.');
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to start sprint');
      }
    } finally {
      setStartingSprint(false);
    }
  };

  const filteredDecks = decks.filter(
    (deck) =>
      deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <Box p="6">
        <Flex align="center" justify="center" py="9">
          <Spinner size="3" />
          <Text ml="3" color="gray">
            Loading decks...
          </Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box p="6" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <Flex justify="between" align="center" mb="5">
        <Heading size="6">Decks</Heading>
        <Flex gap="2">
          <Button
            variant="soft"
            onClick={handleStartSprint}
            disabled={startingSprint || decks.length === 0}
          >
            {startingSprint ? <Spinner size="1" /> : null}
            {startingSprint ? 'Starting...' : 'Start Sprint'}
          </Button>
          <Dialog.Root open={showCreateModal} onOpenChange={setShowCreateModal}>
            <Dialog.Trigger>
              <Button>Create Deck</Button>
            </Dialog.Trigger>
            <Dialog.Content maxWidth="450px">
              <Dialog.Title>Create New Deck</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                Add a new deck to organize your flashcards.
              </Dialog.Description>

              <form onSubmit={handleCreateDeck}>
                <Flex direction="column" gap="3">
                  <label>
                    <Text as="div" size="2" mb="1" weight="bold">
                      Title
                    </Text>
                    <TextField.Root
                      value={newDeckTitle}
                      onChange={(e) => setNewDeckTitle(e.target.value)}
                      placeholder="Enter deck title"
                      autoFocus
                    />
                  </label>
                  <label>
                    <Text as="div" size="2" mb="1" weight="bold">
                      Description (optional)
                    </Text>
                    <TextArea
                      value={newDeckDescription}
                      onChange={(e) => setNewDeckDescription(e.target.value)}
                      placeholder="Enter deck description"
                      rows={3}
                    />
                  </label>
                </Flex>

                <Flex gap="3" mt="4" justify="end">
                  <Dialog.Close>
                    <Button variant="soft" color="gray" type="button">
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button
                    type="submit"
                    disabled={!newDeckTitle.trim() || creating}
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </Button>
                </Flex>
              </form>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>
      </Flex>

      {/* Error banner */}
      {error && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
          <IconButton
            size="1"
            variant="ghost"
            color="red"
            onClick={() => setError(null)}
            style={{ marginLeft: 'auto' }}
          >
            <Cross2Icon />
          </IconButton>
        </Callout.Root>
      )}

      {/* Search */}
      <Box mb="4">
        <TextField.Root
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search decks..."
          style={{ maxWidth: '400px' }}
        />
      </Box>

      {/* Deck list */}
      {filteredDecks.length === 0 ? (
        <Flex direction="column" align="center" py="9">
          {searchQuery ? (
            <Text color="gray">No decks match your search.</Text>
          ) : (
            <>
              <Text color="gray" mb="3">
                No decks yet.
              </Text>
              <Button onClick={() => setShowCreateModal(true)}>
                Create your first deck
              </Button>
            </>
          )}
        </Flex>
      ) : (
        <Flex direction="column" gap="2">
          {filteredDecks.map((deck) => (
            <Card
              key={deck.id}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/deck/${deck.id}`)}
            >
              <Flex justify="between" align="start">
                <Box>
                  <Text weight="medium" size="3">
                    {deck.title}
                  </Text>
                  {deck.description && (
                    <Text as="p" size="2" color="gray" mt="1">
                      {deck.description}
                    </Text>
                  )}
                  <Flex gap="4" mt="2">
                    <Text size="1" color="gray">
                      {deck.cardCount} {deck.cardCount === 1 ? 'card' : 'cards'}
                    </Text>
                    <Text size="1" color="gray">
                      Priority: {deck.priority}
                    </Text>
                  </Flex>
                </Box>
                <IconButton
                  size="1"
                  variant="ghost"
                  color="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(deck);
                  }}
                >
                  <Cross2Icon />
                </IconButton>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      {/* Delete confirmation dialog */}
      <Dialog.Root
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <Dialog.Content maxWidth="400px">
          <Dialog.Title>Delete Deck</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Are you sure you want to delete "{deleteTarget?.title}"? This will
            also delete all cards in this deck. This action cannot be undone.
          </Dialog.Description>
          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button color="red" onClick={handleDeleteDeck} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
}
