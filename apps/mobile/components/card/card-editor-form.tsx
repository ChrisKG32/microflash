'use client';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { KeyboardAvoidingView } from '@/components/ui/keyboard-avoiding-view';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { CardContent } from '@/components/CardContent';
import { LabeledSlider } from '@/components/ui-app/labeled-slider';

/**
 * The card editor body, shared by the create and edit screens.
 *
 * Those two files carried ~170 lines of identical JSX — the Edit/Preview tab
 * bar, both preview panes, both labelled textareas, the priority slider and the
 * bottom action bar — differing only in placeholder copy, the save button's
 * label, and whether a Delete button appears. Every className here is lifted
 * verbatim from them; this is de-duplication, not a redesign.
 *
 * The screens keep their own data flow (create posts, edit fetches-then-puts)
 * because that is where they genuinely differ.
 */

const MARKDOWN_HINT = 'Supports markdown and LaTeX ($...$ or $$...$$)';

function PreviewPane({
  label,
  emptyText,
  value,
}: {
  label: string;
  emptyText: string;
  value: string;
}) {
  return (
    <Box className="rounded-xl bg-background-0 p-4">
      <Text size="xs" className="mb-2 uppercase text-typography-400">
        {label}
      </Text>
      {value.trim() ? (
        <CardContent content={value} fontSize={18} />
      ) : (
        <Text size="md" className="italic text-typography-400">
          {emptyText}
        </Text>
      )}
    </Box>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  autoFocus,
  testID,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  autoFocus?: boolean;
  testID: string;
}) {
  return (
    <VStack>
      <Text size="sm" className="mb-2 font-semibold text-typography-900">
        {label}
      </Text>
      {/* Textarea's base height is fixed; the old TextInput used minHeight, so
          restore a comfortable minimum. */}
      <Textarea size="md" className="min-h-[120px]">
        <TextareaInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          autoFocus={autoFocus}
          testID={testID}
        />
      </Textarea>
      <Text size="xs" className="mt-1 text-typography-500">
        {MARKDOWN_HINT}
      </Text>
    </VStack>
  );
}

export function CardEditorForm({
  front,
  back,
  priority,
  onFrontChange,
  onBackChange,
  onPriorityChange,
  showPreview,
  onShowPreviewChange,
  autoFocusFront = false,
  busy,
  saving,
  saveLabel,
  saveTestID,
  onSave,
  onCancel,
  extraActions,
}: {
  front: string;
  back: string;
  priority: number;
  onFrontChange: (v: string) => void;
  onBackChange: (v: string) => void;
  onPriorityChange: (v: number) => void;
  showPreview: boolean;
  onShowPreviewChange: (v: boolean) => void;
  /** The create screen focuses the front field; the edit screen must not. */
  autoFocusFront?: boolean;
  /** Disables the action bar — true while a save OR a delete is in flight. */
  busy: boolean;
  /** Spins the save button. The edit screen disables on delete but only spins
   *  on save, which is the distinction `busy` alone cannot express. */
  saving: boolean;
  saveLabel: string;
  saveTestID: string;
  onSave: () => void;
  onCancel: () => void;
  /** Rendered at the end of edit mode — the edit screen's Delete button. */
  extraActions?: ReactNode;
}) {
  return (
    // Explicit flex:1 alongside the class: KeyboardAvoidingView is remapProps'd
    // rather than cssInterop'd, and the bottom action bar is a sibling of the
    // ScrollView that must stay pinned.
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
            onPress={() => onShowPreviewChange(false)}
            testID="edit-tab"
          >
            <ButtonText>Edit</ButtonText>
          </Button>
          <Button
            variant={showPreview ? 'solid' : 'outline'}
            action={showPreview ? 'primary' : 'secondary'}
            size="sm"
            className="flex-1"
            onPress={() => onShowPreviewChange(true)}
            testID="preview-tab"
          >
            <ButtonText>Preview</ButtonText>
          </Button>
        </HStack>

        {showPreview ? (
          <VStack className="gap-4 p-4">
            <PreviewPane
              label="Front (Question)"
              emptyText="Enter the front of the card..."
              value={front}
            />
            <PreviewPane
              label="Back (Answer)"
              emptyText="Enter the back of the card..."
              value={back}
            />
          </VStack>
        ) : (
          <VStack className="gap-5 p-4">
            <Field
              label="Front (Question)"
              placeholder="Enter the question or prompt..."
              value={front}
              onChangeText={onFrontChange}
              autoFocus={autoFocusFront}
              testID="front-input"
            />
            <Field
              label="Back (Answer)"
              placeholder="Enter the answer..."
              value={back}
              onChangeText={onBackChange}
              testID="back-input"
            />
            <LabeledSlider
              label="Priority"
              value={priority}
              minValue={0}
              maxValue={100}
              onChange={onPriorityChange}
              endLabels={['Low', 'High']}
              hint="Higher priority cards appear first in sprints"
              testID="priority-slider"
            />
            {extraActions}
          </VStack>
        )}
      </ScrollView>

      {/* Bottom Action Buttons */}
      <HStack className="gap-3 border-t border-outline-100 bg-background-0 p-4">
        <Button
          variant="outline"
          action="secondary"
          className="flex-1"
          onPress={onCancel}
          isDisabled={busy}
          testID="cancel-button"
        >
          <ButtonText>Cancel</ButtonText>
        </Button>
        <Button
          action="primary"
          className="flex-1"
          onPress={onSave}
          isDisabled={busy}
          testID={saveTestID}
        >
          {saving ? (
            <ButtonSpinner className="text-typography-0" />
          ) : (
            <ButtonText>{saveLabel}</ButtonText>
          )}
        </Button>
      </HStack>
    </KeyboardAvoidingView>
  );
}
