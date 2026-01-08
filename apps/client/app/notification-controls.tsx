/**
 * Notification Controls Screen
 *
 * Allows users to configure notification preferences.
 * This is a placeholder that will be fully implemented in E4.5.
 */

import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function NotificationControlsScreen() {
  // TODO (E4.5): Implement full notification controls
  // - Toggle notifications on/off
  // - Set cooldown (min 2h)
  // - Set max notifications per day
  // - Show permission-denied guidance + "Open Settings" link

  return (
    <>
      <Stack.Screen options={{ title: 'Notification Controls' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Notification Controls</Text>
        <Text style={styles.subtext}>
          Full notification settings will be implemented in E4.5
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
    padding: 20,
    backgroundColor: '#f5f5f5',
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
  },
});
