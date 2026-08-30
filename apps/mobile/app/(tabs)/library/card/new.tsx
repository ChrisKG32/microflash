/**
 * Card Creation Screen
 *
 * Creates a new card in a specified deck.
 * Includes live preview of markdown + LaTeX rendering.
 */

import { useState } from 'react';
import { useLocalSearchParams, Stack, router } from 'expo-router';

import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { useAppToast } from '@/components/feedback/use-app-toast';
import { useConfirm } from '@/components/feedback/use-confirm';
import { CardEditorForm } from '@/components/card/card-editor-form';
import { createCard } from '@/lib/api';

export default function NewCardScreen() {
  const notify = useAppToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const { deckId, returnTo } = useLocalSearchParams<{
    deckId: string;
    returnTo?: string;
  }>();

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [priority, setPriority] = useState(50);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!front.trim()) {
      notify.error('Error', 'Please enter the front of the card (question)');
      return;
    }
    if (!back.trim()) {
      notify.error('Error', 'Please enter the back of the card (answer)');
      return;
    }
    if (!deckId) {
      notify.error('Error', 'No deck specified');
      return;
    }

    setSaving(true);
    try {
      await createCard({
        front: front.trim(),
        back: back.trim(),
        deckId,
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
        err instanceof Error ? err.message : 'Failed to create card',
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

  const handleCancel = async () => {
    if (front.trim() || back.trim()) {
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

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New Card',
          headerBackTitle: 'Cancel',
          headerRight: () => (
            <Button
              variant="link"
              action="primary"
              size="sm"
              onPress={handleSave}
              isDisabled={saving}
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
        autoFocusFront
        busy={saving}
        saving={saving}
        saveLabel="Create Card"
        saveTestID="create-card-button"
        onSave={handleSave}
        onCancel={handleCancel}
      />
      <ConfirmDialog />
    </>
  );
}
