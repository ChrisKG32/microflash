/**
 * HeaderRight Component
 *
 * Shared header right content for tabs and menu screens:
 * - Avatar button (opens popover menu with Profile, Notifications, Settings, Stats)
 */

import {
  TouchableOpacity,
  StyleSheet,
  View,
  ActionSheetIOS,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { IconSymbol } from './ui/icon-symbol';
import { useState, useEffect } from 'react';
import { getMe } from '@/lib/api';

export function HeaderRight() {
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [hasNotifications, setHasNotifications] = useState(true); // Placeholder: always show badge

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { user } = await getMe();
      // TODO: Add avatarUrl to user type when Clerk is integrated
      // setUserAvatar(user.avatarUrl);
      // TODO: Check for unread notifications
      // setHasNotifications(user.hasUnreadNotifications);
    } catch (err) {
      console.error('[HeaderRight] Failed to load user profile:', err);
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Profile', 'Notifications', 'Settings', 'Stats'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            router.push('/(menu)/profile');
          } else if (buttonIndex === 2) {
            // TODO: Navigate to notifications screen when implemented
            console.log('[HeaderRight] Notifications tapped (no-op)');
          } else if (buttonIndex === 3) {
            router.push('/(menu)/settings');
          } else if (buttonIndex === 4) {
            router.push('/(menu)/stats');
          }
        },
      );
    } else {
      // Android fallback: simple Alert
      Alert.alert(
        'Menu',
        'Choose an option',
        [
          { text: 'Profile', onPress: () => router.push('/(menu)/profile') },
          {
            text: 'Notifications',
            onPress: () =>
              console.log('[HeaderRight] Notifications tapped (no-op)'),
          },
          { text: 'Settings', onPress: () => router.push('/(menu)/settings') },
          { text: 'Stats', onPress: () => router.push('/(menu)/stats') },
          { text: 'Cancel', style: 'cancel' },
        ],
        { cancelable: true },
      );
    }
  };

  return (
    <TouchableOpacity
      onPress={handleAvatarPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {userAvatar ? (
        <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
      ) : (
        <IconSymbol size={28} name="person.circle.fill" color="#007AFF" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});
