/**
 * Sprint Complete Screen
 *
 * Displays completion feedback after finishing a sprint.
 * This is a placeholder that will be fully implemented in E3.3.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';

export default function SprintCompleteScreen() {
  // TODO (E3.3): Implement full sprint complete flow
  // - Show completion stats (cards reviewed, time taken)
  // - "Done" button returns to launch context
  // - "One More Sprint" starts a new sprint

  const handleDone = () => {
    router.replace('/');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>Sprint Complete!</Text>
        <Text style={styles.subtext}>
          Full completion stats will be shown in E3.3
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleDone}>
          <Text style={styles.buttonText}>Done</Text>
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
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
