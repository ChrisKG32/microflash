import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  TextField,
  IconButton,
  Callout,
  Spinner,
  Dialog,
  SegmentedControl,
} from '@radix-ui/themes';
import * as Toolbar from '@radix-ui/react-toolbar';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  Cross2Icon,
  FontBoldIcon,
  FontItalicIcon,
  CodeIcon,
  Link2Icon,
  ListBulletIcon,
  DividerHorizontalIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import {
  getCard,
  createCard,
  updateCard,
  deleteCard,
  type Card,
} from '@microflash/api-client';
import { CardContent } from '../components/CardContent';
import { DraggableDivider } from '../components/DraggableDivider';
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

  // Dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDraggingRef = useRef(false);
  const isDraggingVerticalRef = useRef(false);

  // Editor/Preview split ratio (0.5 = 50/50)
  const [editorSplitRatio, setEditorSplitRatio] = useState(0.5);

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
          front,
          back,
          deckId,
          priority,
        });
      } else if (cardId) {
        await updateCard(cardId, {
          front,
          back,
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

    try {
      setDeleting(true);
      await deleteCard(cardId);
      navigate(`/deck/${deckId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete card');
      setDeleting(false);
    }
  };

  const hasChanges =
    isNew ||
    markdown !== originalMarkdown ||
    priority !== originalCard?.priority;

  const handleCancel = () => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      navigate(`/deck/${deckId}`);
    }
  };

  const confirmDiscard = () => {
    setShowDiscardDialog(false);
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

  // Combined mode drag handler (horizontal divider)
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

  // Vertical divider drag handler (editor/preview split)
  const handleVerticalDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingVerticalRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingVerticalRef.current) return;
      const container = document.querySelector('.editor-preview-container');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const ratio = (moveEvent.clientX - rect.left) / rect.width;
      setEditorSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
    };

    const handleMouseUp = () => {
      isDraggingVerticalRef.current = false;
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
      <Box p="6">
        <Flex align="center" justify="center" py="9">
          <Spinner size="3" />
          <Text ml="3" color="gray">
            Loading card...
          </Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box
      p="4"
      style={{
        height: 'calc(100vh - 16px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Flex justify="between" align="center" mb="3">
        <Flex align="center" gap="3">
          <IconButton variant="ghost" onClick={handleCancel}>
            <ArrowLeftIcon />
          </IconButton>
          <Heading size="5">{isNew ? 'New Card' : 'Edit Card'}</Heading>
        </Flex>
        <Flex gap="2">
          {!isNew && (
            <Button
              variant="soft"
              color="red"
              onClick={() => setShowDeleteDialog(true)}
            >
              <TrashIcon />
              Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={!parts.front.trim() || saving}>
            {saving ? <Spinner size="1" /> : null}
            {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
          </Button>
        </Flex>
      </Flex>

      {/* Error banner */}
      {error && (
        <Callout.Root color="red" mb="3">
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

      {/* Toolbar */}
      <Toolbar.Root
        className="editor-toolbar"
        aria-label="Formatting options"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: 'var(--gray-2)',
          border: '1px solid var(--gray-6)',
          borderRadius: 'var(--radius-2) var(--radius-2) 0 0',
        }}
      >
        <Flex gap="4" align="center">
          <Toolbar.Button
            asChild
            aria-label="Bold"
            onClick={() => insertFormatting('**')}
          >
            <IconButton size="1" variant="ghost">
              <FontBoldIcon width="24" height="24" />
            </IconButton>
          </Toolbar.Button>
          <Toolbar.Button
            asChild
            aria-label="Italic"
            onClick={() => insertFormatting('*')}
          >
            <IconButton size="1" variant="ghost">
              <FontItalicIcon width="24" height="24" />
            </IconButton>
          </Toolbar.Button>
          <Toolbar.Button
            asChild
            aria-label="Code"
            onClick={() => insertFormatting('`')}
          >
            <IconButton size="1" variant="ghost">
              <CodeIcon width="24" height="24" />
            </IconButton>
          </Toolbar.Button>
          <Toolbar.Button asChild aria-label="Link" onClick={insertLink}>
            <IconButton size="1" variant="ghost">
              <Link2Icon width="24" height="24" />
            </IconButton>
          </Toolbar.Button>
          <Toolbar.Button
            asChild
            aria-label="Bullet List"
            onClick={insertBulletList}
          >
            <IconButton size="1" variant="ghost">
              <ListBulletIcon width="24" height="24" />
            </IconButton>
          </Toolbar.Button>

          <Toolbar.Separator
            style={{
              width: '1px',
              height: '20px',
              backgroundColor: 'var(--gray-6)',
              margin: '0 8px',
            }}
          />

          <Toolbar.Button
            asChild
            aria-label="Insert Front/Back Separator"
            disabled={parts.hasSeparator}
            onClick={insertSeparator}
          >
            <IconButton size="1" variant="ghost" disabled={parts.hasSeparator}>
              <DividerHorizontalIcon />
            </IconButton>
          </Toolbar.Button>
        </Flex>

        <SegmentedControl.Root
          value={previewMode}
          onValueChange={(value) => setPreviewMode(value as PreviewMode)}
          size="2"
        >
          <SegmentedControl.Item value="adaptive">
            Adaptive
          </SegmentedControl.Item>
          <SegmentedControl.Item value="combined">
            Combined
          </SegmentedControl.Item>
          <SegmentedControl.Item value="toggle">Toggle</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Toolbar.Root>

      {/* Main Editor Area */}
      <Flex
        className="editor-preview-container"
        style={{
          flex: 1,
          minHeight: 0,
          border: '1px solid var(--gray-6)',
          borderTop: 'none',
          borderRadius: '0 0 var(--radius-2) var(--radius-2)',
          overflow: 'hidden',
        }}
      >
        {/* Editor Pane */}
        <Box
          style={{
            width: `${editorSplitRatio * 100}%`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
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
        </Box>

        {/* Vertical Divider (Draggable) */}
        <DraggableDivider
          orientation="vertical"
          onMouseDown={handleVerticalDragStart}
        />

        {/* Preview Pane */}
        <Box
          style={{
            width: `${(1 - editorSplitRatio) * 100}%`,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--gray-2)',
          }}
        >
          {previewMode === 'toggle' && (
            <Flex
              gap="1"
              p="2"
              style={{ borderBottom: '1px solid var(--gray-6)' }}
            >
              <Button
                size="1"
                variant={toggleSide === 'front' ? 'solid' : 'soft'}
                onClick={() => setToggleSide('front')}
              >
                Front
              </Button>
              <Button
                size="1"
                variant={toggleSide === 'back' ? 'solid' : 'soft'}
                onClick={() => setToggleSide('back')}
                disabled={!parts.hasSeparator && !parts.back.trim()}
              >
                Back
              </Button>
            </Flex>
          )}

          {previewMode === 'combined' ? (
            <Box
              className="editor-preview-combined"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <Box
                style={{
                  height: `${combinedSplitRatio * 100}%`,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Text
                  size="1"
                  weight="bold"
                  color="gray"
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    padding: '8px 16px 4px',
                  }}
                >
                  Front
                </Text>
                <Box p="3" style={{ flex: 1, overflowY: 'auto' }}>
                  <CardContent content={parts.front || 'No content'} />
                </Box>
              </Box>
              <DraggableDivider
                orientation="horizontal"
                onMouseDown={handleDragStart}
              />
              <Box
                style={{
                  height: `${(1 - combinedSplitRatio) * 100}%`,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Text
                  size="1"
                  weight="bold"
                  color="gray"
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    padding: '8px 16px 4px',
                  }}
                >
                  Back
                </Text>
                <Box p="3" style={{ flex: 1, overflowY: 'auto' }}>
                  {parts.back.trim() ? (
                    <CardContent content={parts.back} />
                  ) : (
                    <Text color="gray" style={{ fontStyle: 'italic' }}>
                      No back content
                    </Text>
                  )}
                </Box>
              </Box>
            </Box>
          ) : (
            <Box p="4" style={{ flex: 1, overflowY: 'auto' }}>
              {previewMode === 'adaptive' && (
                <Text
                  size="1"
                  weight="bold"
                  color="gray"
                  mb="2"
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'block',
                  }}
                >
                  {previewContent.front ? 'Front' : 'Back'}
                </Text>
              )}
              {previewContent.front && (
                <CardContent content={parts.front || 'No content'} />
              )}
              {previewContent.back &&
                (parts.back.trim() ? (
                  <CardContent content={parts.back} />
                ) : (
                  <Text color="gray" style={{ fontStyle: 'italic' }}>
                    No back content
                  </Text>
                ))}
            </Box>
          )}
        </Box>
      </Flex>

      {/* Footer with Priority and Meta */}
      <Flex justify="between" align="center" pt="3">
        <Flex align="center" gap="2">
          <Text size="2" weight="bold">
            Priority (1-10)
          </Text>
          <TextField.Root
            type="number"
            min={1}
            max={10}
            value={String(priority)}
            onChange={(e) => setPriority(Number(e.target.value))}
            style={{ width: '80px' }}
          />
        </Flex>

        {!isNew && originalCard && (
          <Flex gap="4">
            <Text size="1" color="gray">
              State: {originalCard.state}
            </Text>
            <Text size="1" color="gray">
              Reviews: {originalCard.reps}
            </Text>
            <Text size="1" color="gray">
              Lapses: {originalCard.lapses}
            </Text>
            {originalCard.lastReview && (
              <Text size="1" color="gray">
                Last: {new Date(originalCard.lastReview).toLocaleDateString()}
              </Text>
            )}
            <Text size="1" color="gray">
              Next: {new Date(originalCard.nextReview).toLocaleDateString()}
            </Text>
          </Flex>
        )}
      </Flex>

      {/* Delete Card Dialog */}
      <Dialog.Root open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
            <Button color="red" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Discard Changes Dialog */}
      <Dialog.Root open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <Dialog.Content maxWidth="400px">
          <Dialog.Title>Discard Changes</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            You have unsaved changes. Are you sure you want to discard them?
          </Dialog.Description>
          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Keep Editing
              </Button>
            </Dialog.Close>
            <Button color="red" onClick={confirmDiscard}>
              Discard
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
}
