/**
 * Stats Screen (Placeholder)
 *
 * Accessed from avatar menu.
 */

import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function StatsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Stats' }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>📊</Text>
        <Text style={styles.title}>Stats</Text>
        <Text style={styles.description}>
          Review statistics and progress tracking coming soon.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
