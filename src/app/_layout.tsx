import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, useColorScheme } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { PendingSharedImportProcessor } from '@/components/pending-shared-import-processor';
import { Header, palette, Screen } from '@/components/recipe-ui';
import { AuthProvider, useAuth } from '@/context/auth-store';
import { RecipeProvider } from '@/context/recipe-store';

type RootErrorBoundaryState = {
  error: Error | null;
};

class RootErrorBoundary extends React.Component<React.PropsWithChildren, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <Screen>
          <Header eyebrow="Cooked" title="Something went wrong" subtitle={this.state.error.message} />
        </Screen>
      );
    }

    return this.props.children;
  }
}

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
      <PendingSharedImportProcessor />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFF8F0' },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="preview"
          options={{
            animation: 'slide_from_right',
            fullScreenGestureEnabled: true,
            gestureEnabled: true,
            presentation: 'card',
          }}
        />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen name="cooking/[id]" />
        <Stack.Screen name="settings/account" />
        <Stack.Screen name="settings/help" />
        <Stack.Screen name="settings/about" />
      </Stack>
    </RecipeProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RootErrorBoundary>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </RootErrorBoundary>
    </ThemeProvider>
  );
}
