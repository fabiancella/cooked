import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';

import { useAppTheme } from '@/context/theme-store';

type IconName = React.ComponentProps<typeof SymbolView>['name'];

function TabIcon({ color, name }: { color: string; name: IconName }) {
  return <SymbolView name={name} size={24} tintColor={color} />;
}

export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.herb,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
          height: 86,
          paddingTop: 8,
          paddingBottom: 24,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name={{ ios: 'book', android: 'menu_book', web: 'menu_book' }} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name={{ ios: 'plus.circle', android: 'add_circle', web: 'add_circle' }} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name={{ ios: 'gear', android: 'settings', web: 'settings' }} />
          ),
        }}
      />
    </Tabs>
  );
}
