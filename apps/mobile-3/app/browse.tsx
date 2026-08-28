/**
 * Browse / Review Ahead Screen
 *
 * Allows users to review cards ahead of schedule.
 * This is a placeholder - deferred to post-MVP (MF-8).
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';

export default function BrowseScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Review Ahead' }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>📚</Text>
        <Text style={styles.title}>Review Ahead</Text>
        <Text style={styles.subtext}>
          This feature allows you to review cards before they are due.
        </Text>
        <Text style={styles.deferredText}>Coming soon!</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  deferredText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
