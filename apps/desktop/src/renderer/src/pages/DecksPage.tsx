import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const handleDeleteDeck = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this deck?')) return;

    try {
      await deleteDeck(deckId);
      await loadDecks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deck');
    }
  };

  const handleStartSprint = async () => {
    setStartingSprint(true);
    setError(null);

    try {
      const { sprint } = await startSprint({ source: 'HOME' });
      // Use push to navigate to sprint (match mobile semantics)
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
      <div className="page">
        <div className="loading">Loading decks...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Decks</h2>
        <div className="page-header-actions">
          <button
            className="btn btn-secondary"
            onClick={handleStartSprint}
            disabled={startingSprint || decks.length === 0}
          >
            {startingSprint ? 'Starting...' : 'Start Sprint'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            Create Deck
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

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search decks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {filteredDecks.length === 0 ? (
        <div className="empty-state">
          {searchQuery ? (
            <p>No decks match your search.</p>
          ) : (
            <>
              <p>No decks yet.</p>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Create your first deck
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="deck-list">
          {filteredDecks.map((deck) => (
            <div
              key={deck.id}
              className="deck-card"
              onClick={() => navigate(`/deck/${deck.id}`)}
            >
              <div className="deck-card-content">
                <h3 className="deck-title">{deck.title}</h3>
                {deck.description && (
                  <p className="deck-description">{deck.description}</p>
                )}
                <div className="deck-meta">
                  <span className="deck-card-count">
                    {deck.cardCount} {deck.cardCount === 1 ? 'card' : 'cards'}
                  </span>
                  <span className="deck-priority">
                    Priority: {deck.priority}
                  </span>
                </div>
              </div>
              <div className="deck-card-actions">
                <button
                  className="btn btn-icon btn-danger"
                  onClick={(e) => handleDeleteDeck(deck.id, e)}
                  title="Delete deck"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Create New Deck</h3>
            <form onSubmit={handleCreateDeck}>
              <div className="form-group">
                <label htmlFor="deck-title">Title</label>
                <input
                  id="deck-title"
                  type="text"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="Enter deck title"
                  className="form-input"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="deck-description">Description (optional)</label>
                <textarea
                  id="deck-description"
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                  placeholder="Enter deck description"
                  className="form-input form-textarea"
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newDeckTitle.trim() || creating}
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
