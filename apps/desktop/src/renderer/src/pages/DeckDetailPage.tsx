import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getDeck,
  getCards,
  updateDeck,
  deleteDeck,
  deleteCard,
  startSprint,
  ApiError,
  type Deck,
  type Card,
} from '@microflash/api-client';

export function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState(5);
  const [saving, setSaving] = useState(false);
  const [startingSprint, setStartingSprint] = useState(false);

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
    if (
      !confirm('Are you sure you want to delete this deck and all its cards?')
    )
      return;

    try {
      await deleteDeck(deckId);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deck');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;

    try {
      await deleteCard(cardId);
      await loadDeckAndCards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete card');
    }
  };

  const handleStartSprint = async () => {
    if (!deckId) return;

    setStartingSprint(true);
    setError(null);

    try {
      const { sprint } = await startSprint({ deckId, source: 'DECK' });
      // Use push to navigate to sprint (match mobile semantics)
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
      <div className="page">
        <div className="loading">Loading deck...</div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="page">
        <div className="error-state">
          <p>Deck not found.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-text" onClick={() => navigate('/')}>
            &larr; Back
          </button>
          <h2 className="page-title">{deck.title}</h2>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-secondary"
            onClick={handleStartSprint}
            disabled={startingSprint || cards.length === 0}
          >
            {startingSprint ? 'Starting...' : 'Start Sprint'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowEditModal(true)}
          >
            Edit Deck
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/deck/${deckId}/card/new`)}
          >
            Add Card
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button className="btn btn-text" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {deck.description && (
        <p className="deck-detail-description">{deck.description}</p>
      )}

      <div className="deck-detail-meta">
        <span>
          {deck.cardCount} {deck.cardCount === 1 ? 'card' : 'cards'}
        </span>
        <span>Priority: {deck.priority}</span>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search cards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {filteredCards.length === 0 ? (
        <div className="empty-state">
          {searchQuery ? (
            <p>No cards match your search.</p>
          ) : (
            <>
              <p>No cards in this deck yet.</p>
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/deck/${deckId}/card/new`)}
              >
                Add your first card
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="card-list">
          {filteredCards.map((card) => (
            <div key={card.id} className="card-item">
              <div
                className="card-item-content"
                onClick={() => navigate(`/deck/${deckId}/card/${card.id}`)}
              >
                <div className="card-front">{card.front}</div>
                <div className="card-back">{card.back}</div>
                <div className="card-meta">
                  <span className="card-state">{card.state}</span>
                  <span className="card-priority">
                    Priority: {card.priority}
                  </span>
                  <span className="card-reps">{card.reps} reviews</span>
                </div>
              </div>
              <div className="card-item-actions">
                <button
                  className="btn btn-icon"
                  onClick={() => navigate(`/deck/${deckId}/card/${card.id}`)}
                  title="Edit card"
                >
                  Edit
                </button>
                <button
                  className="btn btn-icon btn-danger"
                  onClick={() => handleDeleteCard(card.id)}
                  title="Delete card"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Edit Deck</h3>
            <form onSubmit={handleUpdateDeck}>
              <div className="form-group">
                <label htmlFor="edit-title">Title</label>
                <input
                  id="edit-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-description">Description (optional)</label>
                <textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="form-input form-textarea"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-priority">Priority (1-10)</label>
                <input
                  id="edit-priority"
                  type="number"
                  min={1}
                  max={10}
                  value={editPriority}
                  onChange={(e) => setEditPriority(Number(e.target.value))}
                  className="form-input"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteDeck}
                >
                  Delete Deck
                </button>
                <div className="modal-actions-right">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!editTitle.trim() || saving}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
