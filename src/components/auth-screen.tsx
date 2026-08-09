import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton, Header, Screen } from '@/components/recipe-ui';
import { useAuth } from '@/context/auth-store';
import { AppPalette, useAppTheme, useThemeStyles } from '@/context/theme-store';

export function AuthScreen() {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { action, clearError, error, requestPasswordReset, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const isSubmitting =
    action === 'signing-in' ||
    action === 'signing-up' ||
    action === 'requesting-password-reset';

  const title =
    mode === 'login'
      ? 'Log in'
      : mode === 'signup'
        ? 'Create account'
        : 'Reset password';

  const subtitle =
    mode === 'forgot-password'
      ? 'Enter your account email to receive a reset link.'
      : 'Sign in to save recipes to your account.';

  const buttonText =
    action === 'signing-in'
      ? 'Logging in...'
      : action === 'signing-up'
        ? 'Creating account...'
        : action === 'requesting-password-reset'
          ? 'Sending reset link...'
          : mode === 'forgot-password'
            ? 'Send Reset Link'
            : mode === 'login'
              ? 'Log In'
              : 'Sign Up';

  const changeMode = (nextMode: 'login' | 'signup' | 'forgot-password') => {
    setMode(nextMode);
    setPassword('');
    setMessage(null);
    clearError();
  };

  const submit = async () => {
    setMessage(null);

    if (mode === 'forgot-password') {
      const success = await requestPasswordReset(email.trim());

      if (success) {
        setMessage('If an account exists for this email, a password reset link has been sent.');
      }

      return;
    }

    if (mode === 'login') {
      await signIn(email.trim(), password);
      return;
    }

    const result = await signUp(email.trim(), password);

    if (result.success && result.needsEmailConfirmation) {
      setMessage('Account created. Check your email to confirm it before logging in.');
      setMode('login')
    }
  };

  return (
    <Screen>
      <Header
        eyebrow="Cooked"
        title={title}
        subtitle={subtitle}
      />

      <View style={styles.panel}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        {mode !== 'forgot-password' ? (
          <>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Password"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <AppButton
          onPress={submit}
          disabled={isSubmitting || !email || (mode !== 'forgot-password' && !password)}>
          {buttonText}
        </AppButton>

        {mode === 'login' ? (
          <AppButton variant="ghost" onPress={() => changeMode('forgot-password')}>
            Forgot Password?
          </AppButton>
        ) : null}

        <AppButton variant="secondary" onPress={() => changeMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Create Account' : 'Back to Login'}
        </AppButton>
      </View>
    </Screen>
  );
}

const createStyles = (palette: AppPalette) => StyleSheet.create({
  panel: {
    backgroundColor: palette.paper,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 18,
    gap: 12,
  },
  label: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    color: palette.ink,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 14,
  },
  errorText: {
    color: palette.tomato,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  messageText: {
    color: palette.herb,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
