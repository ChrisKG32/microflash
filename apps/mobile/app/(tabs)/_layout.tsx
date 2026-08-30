import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { CheckCircle2, Folder } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';

export default function TabLayout() {
  return (
    <Tabs
      // tabBarActiveTintColor defaults to the navigation theme's `primary`.
      screenOptions={{
        headerShown: false, // Each tab's Stack handles its own headers
        tabBarButton: HapticTab,
      }}
    >
      {/* Redirect index to review */}
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: 'Review',
          tabBarIcon: ({ color }) => (
            <Icon as={CheckCircle2} size="xl" style={{ color }} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => (
            <Icon as={Folder} size="xl" style={{ color }} />
          ),
        }}
      />
    </Tabs>
  );
}
