/**
 * Card Edit Screen
 *
 * Edit or delete an existing card.
 * Includes live preview of markdown + LaTeX rendering.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import Slider from '@react-native-community/slider';

import { getCard, updateCard, deleteCard, type Card } from '@/lib/api';
import { CardContent } from '@/components/CardContent';

export default function EditCardScreen() {
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
    if (!id) return;

    try {
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

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchCard();
    }, [fetchCard]),
  );

  const hasChanges = () => {
    if (!card) return false;
    return (
      front !== card.front || back !== card.back || priority !== card.priority
    );
  };

  const handleSave = async () => {
    if (!front.trim()) {
      Alert.alert('Error', 'Please enter the front of the card (question)');
      return;
    }
    if (!back.trim()) {
      Alert.alert('Error', 'Please enter the back of the card (answer)');
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
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update card',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Card?',
      'This action cannot be undone. Are you sure you want to delete this card?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;

            setDeleting(true);
            try {
              await deleteCard(id);

              // Navigate back
              if (returnTo) {
                router.replace(returnTo as any);
              } else {
                router.back();
              }
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to delete card',
              );
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    if (hasChanges()) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              if (returnTo) {
                router.replace(returnTo as any);
              } else {
                router.back();
              }
            },
          },
        ],
      );
    } else {
      if (returnTo) {
        router.replace(returnTo as any);
      } else {
        router.back();
      }
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Card' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2196f3" />
          <Text style={styles.loadingText}>Loading card...</Text>
        </View>
      </>
    );
  }

  if (error || !card) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Card' }} />
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorText}>{error || 'Card not found'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              if (returnTo) {
                router.replace(returnTo as any);
              } else {
                router.back();
              }
            }}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
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
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || deleting}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#2196f3" />
              ) : (
                <Text style={styles.saveButton}>Save</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
        >
          {/* Preview Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, !showPreview && styles.toggleActive]}
              onPress={() => setShowPreview(false)}
            >
              <Text
                style={[
                  styles.toggleText,
                  !showPreview && styles.toggleTextActive,
                ]}
              >
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, showPreview && styles.toggleActive]}
              onPress={() => setShowPreview(true)}
            >
              <Text
                style={[
                  styles.toggleText,
                  showPreview && styles.toggleTextActive,
                ]}
              >
                Preview
              </Text>
            </TouchableOpacity>
          </View>

          {showPreview ? (
            /* Preview Mode */
            <View style={styles.previewContainer}>
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Front (Question)</Text>
                {front.trim() ? (
                  <CardContent content={front} fontSize={18} color="#333" />
                ) : (
                  <Text style={styles.previewPlaceholder}>
                    Enter the front of the card...
                  </Text>
                )}
              </View>

              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Back (Answer)</Text>
                {back.trim() ? (
                  <CardContent content={back} fontSize={18} color="#333" />
                ) : (
                  <Text style={styles.previewPlaceholder}>
                    Enter the back of the card...
                  </Text>
                )}
              </View>

              {/* Card Info */}
              <View style={styles.cardInfo}>
                <Text style={styles.cardInfoText}>
                  State: {card.state} | Reps: {card.reps} | Lapses:{' '}
                  {card.lapses}
                </Text>
              </View>
            </View>
          ) : (
            /* Edit Mode */
            <View style={styles.editContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Front (Question)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter the question or prompt..."
                  value={front}
                  onChangeText={setFront}
                  multiline
                  textAlignVertical="top"
                />
                <Text style={styles.inputHint}>
                  Supports markdown and LaTeX ($...$ or $$...$$)
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Back (Answer)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter the answer..."
                  value={back}
                  onChangeText={setBack}
                  multiline
                  textAlignVertical="top"
                />
                <Text style={styles.inputHint}>
                  Supports markdown and LaTeX ($...$ or $$...$$)
                </Text>
              </View>

              {/* Priority Slider */}
              <View style={styles.priorityContainer}>
                <View style={styles.priorityHeader}>
                  <Text style={styles.inputLabel}>Priority</Text>
                  <Text style={styles.priorityValue}>{priority}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={priority}
                  onValueChange={setPriority}
                  minimumTrackTintColor="#2196f3"
                  maximumTrackTintColor="#ddd"
                  thumbTintColor="#2196f3"
                />
                <View style={styles.priorityLabels}>
                  <Text style={styles.priorityLabelText}>Low</Text>
                  <Text style={styles.priorityLabelText}>High</Text>
                </View>
                <Text style={styles.inputHint}>
                  Higher priority cards appear first in sprints
                </Text>
              </View>

              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? (
                  <ActivityIndicator color="#d32f2f" size="small" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete Card</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Bottom Action Buttons */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={saving || deleting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveButtonLarge,
              (saving || deleting) && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving || deleting}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonLargeText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 48,
    color: '#d32f2f',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    color: '#2196f3',
    fontSize: 17,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  toggleActive: {
    backgroundColor: '#2196f3',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
  },
  // Edit Mode
  editContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    lineHeight: 24,
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  // Priority
  priorityContainer: {
    marginBottom: 20,
  },
  priorityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196f3',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  priorityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  priorityLabelText: {
    fontSize: 12,
    color: '#999',
  },
  // Delete Button
  deleteButton: {
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d32f2f',
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#d32f2f',
    fontWeight: '600',
  },
  // Preview Mode
  previewContainer: {
    padding: 16,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  previewPlaceholder: {
    fontSize: 16,
    color: '#ccc',
    fontStyle: 'italic',
  },
  cardInfo: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cardInfoText: {
    fontSize: 12,
    color: '#999',
  },
  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButtonLarge: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#2196f3',
    alignItems: 'center',
  },
  saveButtonLargeText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
