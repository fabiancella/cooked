import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';

import { RecipeProvider } from '@/context/recipe-store';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RecipeProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#FFF8F0' },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="preview" options={{ presentation: 'card' }} />
          <Stack.Screen name="recipe/[id]" />
          <Stack.Screen name="cooking/[id]" />
        </Stack>
      </RecipeProvider>
    </ThemeProvider>
  );
}
