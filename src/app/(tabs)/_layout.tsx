import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';

import { palette } from '@/components/recipe-ui';

type IconName = React.ComponentProps<typeof SymbolView>['name'];

function TabIcon({ focused, name }: { focused: boolean; name: IconName }) {
  return <SymbolView name={name} size={24} tintColor={focused ? palette.herb : palette.muted} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.herb,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: palette.paper,
          borderTopColor: palette.line,
          height: 86,
          paddingTop: 8,
          paddingBottom: 24,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={{ ios: 'book', android: 'menu_book', web: 'menu_book' }} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={{ ios: 'plus.circle', android: 'add_circle', web: 'add_circle' }} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={{ ios: 'gear', android: 'settings', web: 'settings' }} />
          ),
        }}
      />
    </Tabs>
  );
}
