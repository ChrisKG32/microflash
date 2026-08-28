/**
 * Avatar button in the header, opening the app menu.
 *
 * Replaces an ActionSheetIOS / Alert.alert platform fork with a single
 * gluestack Menu, which also means it works on web.
 *
 * Fixes two live bugs while it is here:
 *  - The icon was an SF Symbol name (`person.circle.fill`) that was missing
 *    from IconSymbol's 4-entry MAPPING, so it rendered BLANK on Android and
 *    web. It typechecked only because MAPPING was cast `as IconMapping`.
 *  - "Notifications" only console.logged, even though
 *    app/(menu)/notification-controls exists and is routed.
 */
'use client';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { BarChart3, Bell, Settings, User } from 'lucide-react-native';

import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Menu, MenuItem, MenuItemLabel } from '@/components/ui/menu';
import { Pressable } from '@/components/ui/pressable';
import { getMe } from '@/lib/api';

type MenuKey = 'profile' | 'notifications' | 'settings' | 'stats';

const DESTINATIONS: Record<MenuKey, string> = {
  profile: '/(menu)/profile',
  notifications: '/(menu)/notification-controls',
  settings: '/(menu)/settings',
  stats: '/(menu)/stats',
};

const ITEMS: { key: MenuKey; label: string; icon: typeof User }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'stats', label: 'Stats', icon: BarChart3 },
];

export function HeaderRight() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then(() => {
        if (cancelled) return;
        // TODO(clerk): populate from user.avatarUrl once Clerk is wired up.
        setAvatarUrl(null);
      })
      .catch((err) => {
        console.error('[HeaderRight] Failed to load user profile:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Menu
      placement="bottom right"
      offset={8}
      testID="header-menu"
      trigger={(triggerProps) => (
        <Pressable
          {...triggerProps}
          className="mr-1"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          testID="header-avatar-button"
        >
          <Avatar size="sm" className="bg-primary-500">
            <AvatarFallbackText>Me</AvatarFallbackText>
            {avatarUrl ? <AvatarImage source={{ uri: avatarUrl }} /> : null}
          </Avatar>
        </Pressable>
      )}
      onSelectionChange={(keys) => {
        const key = [...(keys as Set<MenuKey>)][0];
        if (key) router.push(DESTINATIONS[key] as never);
      }}
    >
      {ITEMS.map(({ key, label, icon }) => (
        <MenuItem key={key} textValue={label} className="gap-3">
          <Icon as={icon} size="sm" className="text-typography-700" />
          <MenuItemLabel size="sm">{label}</MenuItemLabel>
        </MenuItem>
      ))}
    </Menu>
  );
}
