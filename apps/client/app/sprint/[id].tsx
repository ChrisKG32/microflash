/**
 * Sprint Review Screen
 *
 * Displays a sprint review session. Loads sprint by ID from the server.
 * This is a placeholder that will be fully implemented in E3.2.
 */

import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';

export default function SprintReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO (E3.2): Implement full sprint review flow
  // - Load sprint from GET /api/sprints/:id
  // - Show cards one at a time
  // - Grade with Again/Hard/Good/Easy
  // - Submit reviews via POST /api/sprints/:id/review
  // - Navigate to complete screen when done

  return (
    <>
      <Stack.Screen options={{ title: 'Sprint Review' }} />
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2196f3" />
        <Text style={styles.text}>Sprint: {id}</Text>
        <Text style={styles.subtext}>
          Sprint review will be implemented in E3.2
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
  text: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    color: '#333',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});
