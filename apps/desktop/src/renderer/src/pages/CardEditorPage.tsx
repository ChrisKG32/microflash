import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCard,
  createCard,
  updateCard,
  deleteCard,
  type Card,
} from '@microflash/api-client';

export function CardEditorPage() {
  const { deckId, cardId } = useParams<{ deckId: string; cardId: string }>();
  const navigate = useNavigate();
  const isNew = cardId === 'new';

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [priority, setPriority] = useState(5);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalCard, setOriginalCard] = useState<Card | null>(null);

  const loadCard = useCallback(async () => {
    if (isNew || !cardId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getCard(cardId);
      const card = response.card;
      setOriginalCard(card);
      setFront(card.front);
      setBack(card.back);
      setPriority(card.priority);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load card');
    } finally {
      setLoading(false);
    }
  }, [cardId, isNew]);

  useEffect(() => {
    loadCard();
  }, [loadCard]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim() || !deckId) return;

    try {
      setSaving(true);
      setError(null);

      if (isNew) {
        await createCard({
          front: front.trim(),
          back: back.trim(),
          deckId,
          priority,
        });
      } else if (cardId) {
        await updateCard(cardId, {
          front: front.trim(),
          back: back.trim(),
          priority,
        });
      }

      navigate(`/deck/${deckId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!cardId || isNew) return;
    if (!confirm('Are you sure you want to delete this card?')) return;

    try {
      await deleteCard(cardId);
      navigate(`/deck/${deckId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete card');
    }
  };

  const hasChanges =
    isNew ||
    front !== originalCard?.front ||
    back !== originalCard?.back ||
    priority !== originalCard?.priority;

  const handleCancel = () => {
    if (hasChanges && !confirm('Discard unsaved changes?')) return;
    navigate(`/deck/${deckId}`);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading card...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-text" onClick={handleCancel}>
            &larr; Back
          </button>
          <h2 className="page-title">{isNew ? 'New Card' : 'Edit Card'}</h2>
        </div>
        {!isNew && (
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete Card
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button className="btn btn-text" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="card-editor-form">
        <div className="form-group">
          <label htmlFor="card-front">Front</label>
          <textarea
            id="card-front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Enter the question or prompt"
            className="form-input form-textarea"
            rows={4}
            autoFocus
          />
          <p className="form-hint">Supports Markdown and LaTeX</p>
        </div>

        <div className="form-group">
          <label htmlFor="card-back">Back</label>
          <textarea
            id="card-back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Enter the answer"
            className="form-input form-textarea"
            rows={4}
          />
          <p className="form-hint">Supports Markdown and LaTeX</p>
        </div>

        <div className="form-group">
          <label htmlFor="card-priority">Priority (1-10)</label>
          <input
            id="card-priority"
            type="number"
            min={1}
            max={10}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="form-input form-input-small"
          />
          <p className="form-hint">
            Higher priority cards are shown more frequently
          </p>
        </div>

        {!isNew && originalCard && (
          <div className="card-editor-meta">
            <p>
              <strong>State:</strong> {originalCard.state}
            </p>
            <p>
              <strong>Reviews:</strong> {originalCard.reps}
            </p>
            <p>
              <strong>Lapses:</strong> {originalCard.lapses}
            </p>
            {originalCard.lastReview && (
              <p>
                <strong>Last Review:</strong>{' '}
                {new Date(originalCard.lastReview).toLocaleDateString()}
              </p>
            )}
            <p>
              <strong>Next Review:</strong>{' '}
              {new Date(originalCard.nextReview).toLocaleDateString()}
            </p>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!front.trim() || !back.trim() || saving}
          >
            {saving ? 'Saving...' : isNew ? 'Create Card' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
