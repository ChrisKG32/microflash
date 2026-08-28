/**
 * Settings Screen
 *
 * Central place for app settings including notification controls and account.
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotifications } from '@/hooks/use-notifications';

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { hasPermission, expoPushToken } = useNotifications();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Notifications Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Notifications
        </Text>

        <View style={styles.statusRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Permission
          </Text>
          <Text
            style={[
              styles.value,
              { color: hasPermission ? '#4CAF50' : '#F44336' },
            ]}
          >
            {hasPermission ? 'Granted' : 'Denied'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Push Token
          </Text>
          <Text
            style={[
              styles.value,
              { color: expoPushToken ? '#4CAF50' : colors.textSecondary },
            ]}
          >
            {expoPushToken ? 'Registered' : 'Not registered'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(menu)/notification-controls')}
        >
          <Text style={[styles.menuItemText, { color: colors.text }]}>
            Notification Controls
          </Text>
          <Text style={[styles.chevron, { color: colors.textSecondary }]}>
            {'>'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sprint Preferences Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Sprint Preferences
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Sprint size and preferences will be configurable in a future update.
        </Text>
      </View>

      {/* Account Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Account
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Account management will be available once Clerk authentication is
          fully integrated.
        </Text>
      </View>

      {/* About Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
        <View style={styles.statusRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Version
          </Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>
            MVP
          </Text>
        </View>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          MicroFlash - Microlearning-first spaced repetition
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  menuItemText: {
    fontSize: 16,
  },
  chevron: {
    fontSize: 18,
  },
});
