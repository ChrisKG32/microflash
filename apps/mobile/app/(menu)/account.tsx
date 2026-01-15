/**
 * Account Screen (Placeholder)
 *
 * Basic account management (sign out, etc.).
 * Accessed from avatar menu → Settings.
 */

import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function AccountScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Account' }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🔐</Text>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.description}>
          Account management (sign out, etc.) coming soon.
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
