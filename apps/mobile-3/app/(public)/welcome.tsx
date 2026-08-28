/**
 * Welcome Screen (Public)
 *
 * Entry point for unauthenticated users.
 * Explains micro-sprints value prop and pushes to sign-in.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';

export default function WelcomeScreen() {
  const handleSignIn = () => {
    // TODO: Integrate Clerk sign-in
    // For now, this is a placeholder
    router.push('/(tabs)/review');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>⚡</Text>
        <Text style={styles.title}>Welcome to MicroFlash</Text>
        <Text style={styles.description}>
          Master anything with micro-sprints: quick 30-90 second review sessions
          that fit into your day.
        </Text>
        <Text style={styles.description}>
          Respectful notifications keep you on track without overwhelming you.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleSignIn}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Authentication coming soon (Clerk integration)
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
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    fontSize: 12,
    color: '#999',
    marginTop: 24,
    fontStyle: 'italic',
  },
});
