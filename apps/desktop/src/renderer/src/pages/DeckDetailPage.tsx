import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Badge,
} from '@radix-ui/themes';
import {
  Cross2Icon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  Pencil1Icon,
} from '@radix-ui/react-icons';
import {
  getDeck,
  getCards,
  updateDeck,
  deleteDeck,
  deleteCard,
  startSprint,
  ApiError,
  type Deck,
  type Card as CardType,
} from '@microflash/api-client';

export function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState(5);
  const [saving, setSaving] = useState(false);
  const [startingSprint, setStartingSprint] = useState(false);

  // Delete deck confirmation
  const [showDeleteDeckDialog, setShowDeleteDeckDialog] = useState(false);
  const [deletingDeck, setDeletingDeck] = useState(false);

  // Delete card confirmation
  const [deleteCardTarget, setDeleteCardTarget] = useState<CardType | null>(
    null,
  );
  const [deletingCard, setDeletingCard] = useState(false);

  const loadDeckAndCards = useCallback(async () => {
    if (!deckId) return;

    try {
      setLoading(true);
      setError(null);
      const [deckResponse, cardsResponse] = await Promise.all([
        getDeck(deckId),
        getCards(deckId),
      ]);
      setDeck(deckResponse.deck);
      setCards(cardsResponse.cards);
      setEditTitle(deckResponse.deck.title);
      setEditDescription(deckResponse.deck.description || '');
      setEditPriority(deckResponse.deck.priority);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load deck details',
      );
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    loadDeckAndCards();
  }, [loadDeckAndCards]);

  const handleUpdateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckId || !editTitle.trim()) return;

    try {
      setSaving(true);
      await updateDeck(deckId, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        priority: editPriority,
      });
      setShowEditModal(false);
      await loadDeckAndCards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update deck');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDeck = async () => {
    if (!deckId) return;

    try {
      setDeletingDeck(true);
      await deleteDeck(deckId);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deck');
      setDeletingDeck(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!deleteCardTarget) return;

    try {
      setDeletingCard(true);
      await deleteCard(deleteCardTarget.id);
      setDeleteCardTarget(null);
      await loadDeckAndCards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete card');
    } finally {
      setDeletingCard(false);
    }
  };

  const handleStartSprint = async () => {
    if (!deckId) return;

    setStartingSprint(true);
    setError(null);

    try {
      const { sprint } = await startSprint({ deckId, source: 'DECK' });
      navigate(
        `/sprint/${sprint.id}?` +
          `returnTo=${encodeURIComponent(`/deck/${deckId}`)}` +
          `&launchSource=DECK` +
          `&deckId=${encodeURIComponent(deckId)}`,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'NO_ELIGIBLE_CARDS') {
          setError('No cards are due for review in this deck.');
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

  const filteredCards = cards.filter(
    (card) =>
      card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.back.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <Box p="6">
        <Flex align="center" justify="center" py="9">
          <Spinner size="3" />
          <Text ml="3" color="gray">
            Loading deck...
          </Text>
        </Flex>
      </Box>
    );
  }

  if (!deck) {
    return (
      <Box p="6">
        <Flex direction="column" align="center" py="9">
          <Text color="gray" mb="3">
            Deck not found.
          </Text>
          <Button onClick={() => navigate('/')}>Back to Decks</Button>
        </Flex>
      </Box>
    );
  }

  return (
    <Box p="6" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <Flex justify="between" align="center" mb="5">
        <Flex align="center" gap="3">
          <IconButton variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeftIcon />
          </IconButton>
          <Heading size="6">{deck.title}</Heading>
        </Flex>
        <Flex gap="2">
          <Button
            variant="soft"
            onClick={handleStartSprint}
            disabled={startingSprint || cards.length === 0}
          >
            {startingSprint ? <Spinner size="1" /> : null}
            {startingSprint ? 'Starting...' : 'Start Sprint'}
          </Button>
          <Button variant="soft" onClick={() => setShowEditModal(true)}>
            Edit Deck
          </Button>
          <Button onClick={() => navigate(`/deck/${deckId}/card/new`)}>
            Add Card
          </Button>
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

      {/* Deck meta */}
      {deck.description && (
        <Text as="p" color="gray" mb="3">
          {deck.description}
        </Text>
      )}
      <Flex gap="4" mb="4">
        <Text size="2" color="gray">
          {deck.cardCount} {deck.cardCount === 1 ? 'card' : 'cards'}
        </Text>
        <Text size="2" color="gray">
          Priority: {deck.priority}
        </Text>
      </Flex>

      {/* Search */}
      <Box mb="4">
        <TextField.Root
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cards..."
          style={{ maxWidth: '400px' }}
        />
      </Box>

      {/* Card list */}
      {filteredCards.length === 0 ? (
        <Flex direction="column" align="center" py="9">
          {searchQuery ? (
            <Text color="gray">No cards match your search.</Text>
          ) : (
            <>
              <Text color="gray" mb="3">
                No cards in this deck yet.
              </Text>
              <Button onClick={() => navigate(`/deck/${deckId}/card/new`)}>
                Add your first card
              </Button>
            </>
          )}
        </Flex>
      ) : (
        <Flex direction="column" gap="2">
          {filteredCards.map((card) => (
            <Card key={card.id}>
              <Flex justify="between" align="start">
                <Box
                  style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => navigate(`/deck/${deckId}/card/${card.id}`)}
                >
                  <Text weight="medium" size="2">
                    {card.front}
                  </Text>
                  {card.back.trim() && (
                    <Text
                      as="p"
                      size="2"
                      color="gray"
                      mt="1"
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '500px',
                      }}
                    >
                      {card.back}
                    </Text>
                  )}
                  <Flex gap="3" mt="2" align="center">
                    <Badge size="1" variant="soft">
                      {card.state}
                    </Badge>
                    <Text size="1" color="gray">
                      Priority: {card.priority}
                    </Text>
                    <Text size="1" color="gray">
                      {card.reps} reviews
                    </Text>
                  </Flex>
                </Box>
                <Flex gap="1">
                  <IconButton
                    size="1"
                    variant="ghost"
                    onClick={() => navigate(`/deck/${deckId}/card/${card.id}`)}
                  >
                    <Pencil1Icon />
                  </IconButton>
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="red"
                    onClick={() => setDeleteCardTarget(card)}
                  >
                    <Cross2Icon />
                  </IconButton>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      {/* Edit Deck Dialog */}
      <Dialog.Root open={showEditModal} onOpenChange={setShowEditModal}>
        <Dialog.Content maxWidth="450px">
          <Dialog.Title>Edit Deck</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Update deck details or delete the deck.
          </Dialog.Description>

          <form onSubmit={handleUpdateDeck}>
            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Title
                </Text>
                <TextField.Root
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Description (optional)
                </Text>
                <TextArea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Priority (1-10)
                </Text>
                <TextField.Root
                  type="number"
                  min={1}
                  max={10}
                  value={String(editPriority)}
                  onChange={(e) => setEditPriority(Number(e.target.value))}
                  style={{ width: '100px' }}
                />
              </label>
            </Flex>

            <Flex gap="3" mt="4" justify="between">
              <Button
                type="button"
                color="red"
                variant="soft"
                onClick={() => {
                  setShowEditModal(false);
                  setShowDeleteDeckDialog(true);
                }}
              >
                Delete Deck
              </Button>
              <Flex gap="3">
                <Dialog.Close>
                  <Button variant="soft" color="gray" type="button">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={!editTitle.trim() || saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      {/* Delete Deck Confirmation Dialog */}
      <Dialog.Root
        open={showDeleteDeckDialog}
        onOpenChange={setShowDeleteDeckDialog}
      >
        <Dialog.Content maxWidth="400px">
          <Dialog.Title>Delete Deck</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Are you sure you want to delete "{deck.title}" and all its cards?
            This action cannot be undone.
          </Dialog.Description>
          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              color="red"
              onClick={handleDeleteDeck}
              disabled={deletingDeck}
            >
              {deletingDeck ? 'Deleting...' : 'Delete'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Delete Card Confirmation Dialog */}
      <Dialog.Root
        open={deleteCardTarget !== null}
        onOpenChange={(open) => !open && setDeleteCardTarget(null)}
      >
        <Dialog.Content maxWidth="400px">
          <Dialog.Title>Delete Card</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Are you sure you want to delete this card? This action cannot be
            undone.
          </Dialog.Description>
          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              color="red"
              onClick={handleDeleteCard}
              disabled={deletingCard}
            >
              {deletingCard ? 'Deleting...' : 'Delete'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
}
