/**
 * Card Edit Screen
 *
 * Edit or delete an existing card.
 * Includes live preview of markdown + LaTeX rendering.
 */

import { useState, useCallback, useEffect } from 'react';
import { useLocalSearchParams, Stack, router } from 'expo-router';

import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { useAppToast } from '@/components/feedback/use-app-toast';
import { useConfirm } from '@/components/feedback/use-confirm';
import { CardEditorForm } from '@/components/card/card-editor-form';
import { ScreenLoading, ScreenMessage } from '@/components/ui-app/screen-state';
import { getCard, updateCard, deleteCard, type Card } from '@/lib/api';

export default function EditCardScreen() {
  const notify = useAppToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const { id, returnTo } = useLocalSearchParams<{
    id: string;
    returnTo?: string;
  }>();

  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [priority, setPriority] = useState(50);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchCard = useCallback(async () => {
    try {
      // Guard inside the try so the finally below still clears `loading`. As a
      // bare early return this left the screen on its spinner forever whenever
      // the route param was missing.
      if (!id) throw new Error('Card not found');

      setError(null);
      const { card: fetchedCard } = await getCard(id);
      setCard(fetchedCard);
      setFront(fetchedCard.front);
      setBack(fetchedCard.back);
      setPriority(fetchedCard.priority);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load card');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Loads once per mount, deliberately NOT on every focus.
  //
  // This screen is a form: fetchCard() overwrites front/back/priority with the
  // server's copy. On a focus effect, leaving and returning — opening the
  // avatar menu, say — silently discarded whatever the user had typed, behind
  // a spinner flash that hid it happening. That fights the unsaved-changes
  // confirm this screen already has.
  //
  // Nothing here needs refreshing on focus: it is the only editor of this
  // card, and navigating to a different one mounts a new screen (fetchCard is
  // keyed on `id` regardless).
  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  const hasChanges = () => {
    if (!card) return false;
    return (
      front !== card.front || back !== card.back || priority !== card.priority
    );
  };

  const handleSave = async () => {
    if (!front.trim()) {
      notify.error('Error', 'Please enter the front of the card (question)');
      return;
    }
    if (!back.trim()) {
      notify.error('Error', 'Please enter the back of the card (answer)');
      return;
    }
    if (!id) return;

    setSaving(true);
    try {
      await updateCard(id, {
        front: front.trim(),
        back: back.trim(),
        priority,
      });

      // Navigate back
      if (returnTo) {
        router.replace(returnTo as any);
      } else {
        router.back();
      }
    } catch (err) {
      notify.error(
        'Error',
        err instanceof Error ? err.message : 'Failed to update card',
      );
    } finally {
      setSaving(false);
    }
  };

  const leave = () => {
    if (returnTo) {
      router.replace(returnTo as any);
    } else {
      router.back();
    }
  };

  // The promise-returning confirm flattens what used to be an async callback
  // nested inside the Alert button array.
  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete Card?',
      body: 'This action cannot be undone. Are you sure you want to delete this card?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      action: 'negative',
    });
    if (!ok || !id) return;

    setDeleting(true);
    try {
      await deleteCard(id);
      leave();
    } catch (err) {
      notify.error(
        'Error',
        err instanceof Error ? err.message : 'Failed to delete card',
      );
      setDeleting(false);
    }
  };

  const handleCancel = async () => {
    if (hasChanges()) {
      const discard = await confirm({
        title: 'Discard Changes?',
        body: 'You have unsaved changes. Are you sure you want to discard them?',
        confirmText: 'Discard',
        cancelText: 'Keep Editing',
        action: 'negative',
      });
      if (!discard) return;
    }
    leave();
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Card' }} />
        <ScreenLoading label="Loading card..." />
      </>
    );
  }

  if (error || !card) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Card' }} />
        <ScreenMessage
          glyph="!"
          glyphClassName="mb-4 text-4xl"
          tone="error"
          body={error || 'Card not found'}
          actionLabel="Go Back"
          onAction={leave}
          actionTestID="go-back-button"
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Card',
          headerBackTitle: 'Cancel',
          headerRight: () => (
            <Button
              variant="link"
              action="primary"
              size="sm"
              onPress={handleSave}
              isDisabled={saving || deleting}
              testID="header-save-button"
            >
              {saving ? <ButtonSpinner /> : <ButtonText>Save</ButtonText>}
            </Button>
          ),
        }}
      />
      <CardEditorForm
        front={front}
        back={back}
        priority={priority}
        onFrontChange={setFront}
        onBackChange={setBack}
        onPriorityChange={setPriority}
        showPreview={showPreview}
        onShowPreviewChange={setShowPreview}
        busy={saving || deleting}
        saving={saving}
        saveLabel="Save Changes"
        saveTestID="save-changes-button"
        onSave={handleSave}
        onCancel={handleCancel}
        extraActions={
          <Button
            variant="outline"
            action="negative"
            onPress={handleDelete}
            isDisabled={deleting || saving}
            testID="delete-card-button"
          >
            {deleting ? (
              <ButtonSpinner className="text-error-700" />
            ) : (
              <ButtonText>Delete Card</ButtonText>
            )}
          </Button>
        }
      />
      <ConfirmDialog />
    </>
  );
}
