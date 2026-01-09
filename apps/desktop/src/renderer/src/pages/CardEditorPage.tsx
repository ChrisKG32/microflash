import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCard,
  createCard,
  updateCard,
  deleteCard,
  type Card,
} from '@microflash/api-client';
import { CardContent } from '../components/CardContent';
import {
  splitCardMarkdown,
  joinCardMarkdown,
  getCursorSide,
} from '../lib/card-markdown';

type PreviewMode = 'adaptive' | 'combined' | 'toggle';
type Side = 'front' | 'back';

export function CardEditorPage() {
  const { deckId, cardId } = useParams<{ deckId: string; cardId: string }>();
  const navigate = useNavigate();
  const isNew = cardId === 'new';

  // Editor state
  const [markdown, setMarkdown] = useState('');
  const [priority, setPriority] = useState(5);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalCard, setOriginalCard] = useState<Card | null>(null);
  const [originalMarkdown, setOriginalMarkdown] = useState('');

  // Preview state
  const [previewMode, setPreviewMode] = useState<PreviewMode>('adaptive');
  const [toggleSide, setToggleSide] = useState<Side>('front');
  const [cursorIndex, setCursorIndex] = useState(0);
  const [combinedSplitRatio, setCombinedSplitRatio] = useState(0.5);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDraggingRef = useRef(false);

  // Parse markdown into parts
  const parts = splitCardMarkdown(markdown);

  const loadCard = useCallback(async () => {
    if (isNew || !cardId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getCard(cardId);
      const card = response.card;
      setOriginalCard(card);
      const combined = joinCardMarkdown(card.front, card.back);
      setMarkdown(combined);
      setOriginalMarkdown(combined);
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
    const { front, back } = splitCardMarkdown(markdown);

    if (!front.trim() || !deckId) return;

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
    markdown !== originalMarkdown ||
    priority !== originalCard?.priority;

  const handleCancel = () => {
    if (hasChanges && !confirm('Discard unsaved changes?')) return;
    navigate(`/deck/${deckId}`);
  };

  // Track cursor position for adaptive mode
  const handleSelectionChange = () => {
    if (textareaRef.current) {
      setCursorIndex(textareaRef.current.selectionStart);
    }
  };

  // Markdown formatting helpers
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.slice(start, end);

    const newText =
      markdown.slice(0, start) +
      prefix +
      selectedText +
      suffix +
      markdown.slice(end);

    setMarkdown(newText);

    // Restore cursor position after state update
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertSeparator = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const pos = textarea.selectionStart;
    const before = markdown.slice(0, pos);
    const after = markdown.slice(pos);

    // Add newlines if needed for clean separator
    const needsNewlineBefore = before.length > 0 && !before.endsWith('\n');
    const needsNewlineAfter = after.length > 0 && !after.startsWith('\n');

    const separator =
      (needsNewlineBefore ? '\n' : '') +
      '---' +
      (needsNewlineAfter ? '\n' : '');

    const newText = before + separator + after;
    setMarkdown(newText);

    setTimeout(() => {
      textarea.focus();
      const newPos = pos + separator.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (!url) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.slice(start, end) || 'link text';

    const linkMarkdown = `[${selectedText}](${url})`;
    const newText =
      markdown.slice(0, start) + linkMarkdown + markdown.slice(end);

    setMarkdown(newText);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + linkMarkdown.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const insertBulletList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.slice(start, end);

    // Convert selected lines to bullet points
    const lines = selectedText.split('\n');
    const bulletedLines = lines.map((line) => `- ${line}`).join('\n');

    const newText =
      markdown.slice(0, start) + bulletedLines + markdown.slice(end);
    setMarkdown(newText);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + bulletedLines.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Combined mode drag handler
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const container = document.querySelector('.editor-preview-combined');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const ratio = (moveEvent.clientY - rect.top) / rect.height;
      setCombinedSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Determine what to show in preview
  const getPreviewContent = (): { front: boolean; back: boolean } => {
    switch (previewMode) {
      case 'adaptive': {
        const side = getCursorSide(cursorIndex, parts.separatorIndex);
        return { front: side === 'front', back: side === 'back' };
      }
      case 'combined':
        return { front: true, back: true };
      case 'toggle':
        return { front: toggleSide === 'front', back: toggleSide === 'back' };
    }
  };

  const previewContent = getPreviewContent();

  if (loading) {
    return (
      <div className="page card-editor-page">
        <div className="loading">Loading card...</div>
      </div>
    );
  }

  return (
    <div className="page card-editor-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-text" onClick={handleCancel}>
            &larr; Back
          </button>
          <h2 className="page-title">{isNew ? 'New Card' : 'Edit Card'}</h2>
        </div>
        <div className="page-header-actions">
          {!isNew && (
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!parts.front.trim() || saving}
          >
            {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
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

      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => insertFormatting('**')}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => insertFormatting('*')}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => insertFormatting('`')}
            title="Code"
          >
            {'</>'}
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={insertLink}
            title="Link"
          >
            🔗
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={insertBulletList}
            title="Bullet List"
          >
            •
          </button>
          <div className="toolbar-divider" />
          <button
            type="button"
            className="btn btn-icon btn-separator"
            onClick={insertSeparator}
            title="Insert Front/Back Separator"
            disabled={parts.hasSeparator}
          >
            ---
          </button>
        </div>
        <div className="editor-toolbar-right">
          <div className="preview-mode-toggle">
            <button
              type="button"
              className={`toggle-btn ${previewMode === 'adaptive' ? 'active' : ''}`}
              onClick={() => setPreviewMode('adaptive')}
            >
              Adaptive
            </button>
            <button
              type="button"
              className={`toggle-btn ${previewMode === 'combined' ? 'active' : ''}`}
              onClick={() => setPreviewMode('combined')}
            >
              Combined
            </button>
            <button
              type="button"
              className={`toggle-btn ${previewMode === 'toggle' ? 'active' : ''}`}
              onClick={() => setPreviewMode('toggle')}
            >
              Toggle
            </button>
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="editor-main">
        {/* Editor Pane */}
        <div className="editor-pane">
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            onSelect={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            onClick={handleSelectionChange}
            placeholder="Enter card content...&#10;&#10;Use --- on its own line to separate front from back"
            className="editor-textarea"
            autoFocus
          />
        </div>

        {/* Vertical Divider */}
        <div className="editor-divider-vertical" />

        {/* Preview Pane */}
        <div className="editor-preview-pane">
          {previewMode === 'toggle' && (
            <div className="preview-toggle-header">
              <button
                type="button"
                className={`toggle-btn ${toggleSide === 'front' ? 'active' : ''}`}
                onClick={() => setToggleSide('front')}
              >
                Front
              </button>
              <button
                type="button"
                className={`toggle-btn ${toggleSide === 'back' ? 'active' : ''}`}
                onClick={() => setToggleSide('back')}
                disabled={!parts.hasSeparator && !parts.back.trim()}
              >
                Back
              </button>
            </div>
          )}

          {previewMode === 'combined' ? (
            <div className="editor-preview-combined">
              <div
                className="preview-section preview-front"
                style={{ height: `${combinedSplitRatio * 100}%` }}
              >
                <span className="preview-label">Front</span>
                <div className="preview-content">
                  <CardContent content={parts.front || 'No content'} />
                </div>
              </div>
              <div
                className="preview-divider-horizontal"
                onMouseDown={handleDragStart}
              />
              <div
                className="preview-section preview-back"
                style={{ height: `${(1 - combinedSplitRatio) * 100}%` }}
              >
                <span className="preview-label">Back</span>
                <div className="preview-content">
                  {parts.back.trim() ? (
                    <CardContent content={parts.back} />
                  ) : (
                    <span className="preview-placeholder">No back content</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="editor-preview-single">
              {previewMode === 'adaptive' && (
                <span className="preview-label">
                  {previewContent.front ? 'Front' : 'Back'}
                </span>
              )}
              <div className="preview-content">
                {previewContent.front && (
                  <CardContent content={parts.front || 'No content'} />
                )}
                {previewContent.back &&
                  (parts.back.trim() ? (
                    <CardContent content={parts.back} />
                  ) : (
                    <span className="preview-placeholder">No back content</span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Priority and Meta */}
      <div className="editor-footer">
        <div className="form-group form-group-inline">
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
        </div>

        {!isNew && originalCard && (
          <div className="card-editor-meta-inline">
            <span>State: {originalCard.state}</span>
            <span>Reviews: {originalCard.reps}</span>
            <span>Lapses: {originalCard.lapses}</span>
            {originalCard.lastReview && (
              <span>
                Last: {new Date(originalCard.lastReview).toLocaleDateString()}
              </span>
            )}
            <span>
              Next: {new Date(originalCard.nextReview).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
