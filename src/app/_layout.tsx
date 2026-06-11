import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, useColorScheme } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Header, palette, Screen } from '@/components/recipe-ui';
import { AuthProvider, useAuth } from '@/context/auth-store';
import { RecipeProvider } from '@/context/recipe-store';

function AppContent() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <Screen>
        <Header eyebrow="Cooked" title="Loading" subtitle="Checking your session." />
        <ActivityIndicator color={palette.herb} />
        <Text style={{ color: palette.muted, fontWeight: '700' }}>Preparing your recipe box...</Text>
      </Screen>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
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
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
