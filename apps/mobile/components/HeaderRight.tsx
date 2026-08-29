/**
 * Avatar button in the header, opening the app menu.
 *
 * Replaces an ActionSheetIOS / Alert.alert platform fork with a single
 * gluestack Menu, which also means it works on web.
 *
 * Fixes three live bugs while it is here:
 *  - The icon was an SF Symbol name (`person.circle.fill`) that was missing
 *    from IconSymbol's 4-entry MAPPING, so it rendered BLANK on Android and
 *    web. It typechecked only because MAPPING was cast `as IconMapping`.
 *  - "Notifications" only console.logged, even though
 *    app/(menu)/notification-controls exists and is routed.
 *  - The trigger fought the iOS 26 glass background UIKit puts behind header
 *    bar button items: `mr-1` pushed it off centre, and a filled avatar circle
 *    inside the glass circle looked like a double ring. See the trigger.
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
          // Deliberately unsized and margin-free. On iOS 26 UIKit stretches a
          // bar button item's custom view to a 36pt minimum; rn-screens used to
          // leave the subview pinned at that box's origin, which is why this
          // rendered hard against the trailing edge. Fixed upstream in 4.19.0
          // (PR #3449) by centring the subview in a wrapper view, so sizing this
          // to 36 by hand is no longer needed — hitSlop covers the tap target.
          // Do not add a margin: it sits inside the box UIKit centres.
          // https://github.com/software-mansion/react-native-screens/issues/2990
          {...triggerProps}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          testID="header-avatar-button"
        >
          {/*
            Bare icon, not a filled Avatar, when there is no photo. The iOS 26
            glass background behind a bar button item cannot be suppressed here
            (hidesSharedBackground needs the headerRightItems API, which is
            iOS-only and arrived with expo-router's move off React Navigation),
            and a filled circle inside that circle reads as a rendering bug. A
            real photo fills the ring, so it still uses Avatar.
          */}
          {avatarUrl ? (
            <Avatar size="sm" className="bg-primary-500">
              <AvatarFallbackText>Me</AvatarFallbackText>
              <AvatarImage source={{ uri: avatarUrl }} />
            </Avatar>
          ) : (
            <Icon as={User} size="xl" className="text-primary-600" />
          )}
        </Pressable>
      )}
    >
      {ITEMS.map(({ key, label, icon }) => (
        <MenuItem
          key={key}
          textValue={label}
          className="gap-3"
          // Navigation hangs off the item's own onPress rather than the Menu's
          // onSelectionChange. gluestack routes a press through
          // `state.selectionManager.select(key)`, and useTreeState defaults
          // selectionMode to 'none', where select() returns early — so
          // onSelectionChange never fires. selectionMode="single" would revive
          // it but adds toggle semantics a nav menu does not want: re-picking
          // the item that is already selected deselects it and emits an empty
          // key set, so every second tap on the same entry would do nothing.
          onPress={() => router.push(DESTINATIONS[key] as never)}
          testID={`header-menu-${key}`}
        >
          <Icon as={icon} size="sm" className="text-typography-700" />
          <MenuItemLabel size="sm">{label}</MenuItemLabel>
        </MenuItem>
      ))}
    </Menu>
  );
}
