/**
 * Card Edit Screen
 *
 * Edit or delete an existing card.
 * Includes live preview of markdown + LaTeX rendering.
 */

import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { HStack } from '@/components/ui/hstack';
import { KeyboardAvoidingView } from '@/components/ui/keyboard-avoiding-view';
import { ScrollView } from '@/components/ui/scroll-view';
import {
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
} from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { useAppToast } from '@/components/feedback/use-app-toast';
import { useConfirm } from '@/components/feedback/use-confirm';
import { getCard, updateCard, deleteCard, type Card } from '@/lib/api';
import { CardContent } from '@/components/CardContent';

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
        <Center className="flex-1 bg-background-50">
          <Spinner size="large" className="text-primary-500" />
          <Text size="md" className="mt-4 text-typography-500">
            Loading card...
          </Text>
        </Center>
      </>
    );
  }

  if (error || !card) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Card' }} />
        <Center className="flex-1 bg-background-50 p-5">
          <Text className="mb-4 text-4xl">!</Text>
          <Text size="md" className="mb-4 text-center text-error-700">
            {error || 'Card not found'}
          </Text>
          <Button action="primary" onPress={leave} testID="go-back-button">
            <ButtonText>Go Back</ButtonText>
          </Button>
        </Center>
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
      {/* Explicit flex:1 alongside the class: KeyboardAvoidingView is
          remapProps'd rather than cssInterop'd, and the bottom action bar is
          a sibling of the ScrollView that must stay pinned. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        className="flex-1 bg-background-50"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {/* Preview Toggle */}
          <HStack className="gap-2 border-b border-outline-100 bg-background-0 p-3">
            <Button
              variant={showPreview ? 'outline' : 'solid'}
              action={showPreview ? 'secondary' : 'primary'}
              size="sm"
              className="flex-1"
              onPress={() => setShowPreview(false)}
              testID="edit-tab"
            >
              <ButtonText>Edit</ButtonText>
            </Button>
            <Button
              variant={showPreview ? 'solid' : 'outline'}
              action={showPreview ? 'primary' : 'secondary'}
              size="sm"
              className="flex-1"
              onPress={() => setShowPreview(true)}
              testID="preview-tab"
            >
              <ButtonText>Preview</ButtonText>
            </Button>
          </HStack>

          {showPreview ? (
            /* Preview Mode */
            <VStack className="gap-4 p-4">
              <Box className="rounded-xl bg-background-0 p-4">
                <Text size="xs" className="mb-2 uppercase text-typography-400">
                  Front (Question)
                </Text>
                {front.trim() ? (
                  <CardContent content={front} fontSize={18} />
                ) : (
                  <Text size="md" className="italic text-typography-400">
                    Enter the front of the card...
                  </Text>
                )}
              </Box>

              <Box className="rounded-xl bg-background-0 p-4">
                <Text size="xs" className="mb-2 uppercase text-typography-400">
                  Back (Answer)
                </Text>
                {back.trim() ? (
                  <CardContent content={back} fontSize={18} />
                ) : (
                  <Text size="md" className="italic text-typography-400">
                    Enter the back of the card...
                  </Text>
                )}
              </Box>
            </VStack>
          ) : (
            /* Edit Mode */
            <VStack className="gap-5 p-4">
              <VStack>
                <Text
                  size="sm"
                  className="mb-2 font-semibold text-typography-900"
                >
                  Front (Question)
                </Text>
                <Textarea size="md" className="min-h-[120px]">
                  <TextareaInput
                    placeholder="Enter the question or prompt..."
                    value={front}
                    onChangeText={setFront}
                    testID="front-input"
                  />
                </Textarea>
                <Text size="xs" className="mt-1 text-typography-500">
                  Supports markdown and LaTeX ($...$ or $$...$$)
                </Text>
              </VStack>

              <VStack>
                <Text
                  size="sm"
                  className="mb-2 font-semibold text-typography-900"
                >
                  Back (Answer)
                </Text>
                <Textarea size="md" className="min-h-[120px]">
                  <TextareaInput
                    placeholder="Enter the answer..."
                    value={back}
                    onChangeText={setBack}
                    testID="back-input"
                  />
                </Textarea>
                <Text size="xs" className="mt-1 text-typography-500">
                  Supports markdown and LaTeX ($...$ or $$...$$)
                </Text>
              </VStack>

              {/* Priority Slider */}
              <VStack>
                <HStack className="items-center justify-between">
                  <Text size="sm" className="font-semibold text-typography-900">
                    Priority
                  </Text>
                  <Text size="md" className="font-semibold text-primary-500">
                    {priority}
                  </Text>
                </HStack>
                <Slider
                  className="my-3"
                  minValue={0}
                  maxValue={100}
                  step={1}
                  value={priority}
                  onChange={setPriority}
                  testID="priority-slider"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <HStack className="justify-between">
                  <Text size="xs" className="text-typography-400">
                    Low
                  </Text>
                  <Text size="xs" className="text-typography-400">
                    High
                  </Text>
                </HStack>
                <Text size="xs" className="mt-2 text-typography-500">
                  Higher priority cards appear first in sprints
                </Text>
              </VStack>

              {/* Delete Button */}
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
            </VStack>
          )}
        </ScrollView>

        {/* Bottom Action Buttons */}
        <HStack className="gap-3 border-t border-outline-100 bg-background-0 p-4">
          <Button
            variant="outline"
            action="secondary"
            className="flex-1"
            onPress={handleCancel}
            isDisabled={saving || deleting}
            testID="cancel-button"
          >
            <ButtonText>Cancel</ButtonText>
          </Button>
          <Button
            action="primary"
            className="flex-1"
            onPress={handleSave}
            isDisabled={saving || deleting}
            testID="save-changes-button"
          >
            {saving ? (
              <ButtonSpinner className="text-typography-0" />
            ) : (
              <ButtonText>Save Changes</ButtonText>
            )}
          </Button>
        </HStack>
      </KeyboardAvoidingView>
      <ConfirmDialog />
    </>
  );
}
