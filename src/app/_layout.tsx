import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StatusBar, Text } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { PendingSharedImportProcessor } from '@/components/pending-shared-import-processor';
import { PasswordRecoveryScreen } from '@/components/password-recovery-screen';
import { Header, Screen } from '@/components/recipe-ui';
import { AuthProvider, useAuth } from '@/context/auth-store';
import { RecipeProvider } from '@/context/recipe-store';
import { AppThemeProvider, useAppTheme } from '@/context/theme-store';

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
  const { loading, passwordRecoveryStatus, session } = useAuth();
  const { colors } = useAppTheme();

  if (loading) {
    return (
      <Screen>
        <Header eyebrow="Cooked" title="Loading" subtitle="Checking your session." />
        <ActivityIndicator color={colors.herb} />
        <Text style={{ color: colors.muted, fontWeight: '700' }}>Preparing your recipe box...</Text>
      </Screen>
    );
  }

  if (passwordRecoveryStatus !== 'idle') {
    return <PasswordRecoveryScreen />;
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
          contentStyle: { backgroundColor: colors.cream },
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

function ThemedApp() {
  const { colors, isDark } = useAppTheme();
  const navigationTheme = React.useMemo(
    () => ({
      ...DefaultTheme,
      dark: isDark,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.herb,
        background: colors.cream,
        card: colors.paper,
        text: colors.ink,
        border: colors.line,
        notification: colors.tomato,
      },
    }),
    [colors, isDark],
  );

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.cream}
      />
      <RootErrorBoundary>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </RootErrorBoundary>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <ThemedApp />
    </AppThemeProvider>
  );
}
