import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton, Header, palette, Screen } from '@/components/recipe-ui';
import { useAuth } from '@/context/auth-store';

export function AuthScreen() {
  const { action, clearError, error, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const isSubmitting = action === 'signing-in' || action === 'signing-up';

  const buttonText =
    action === 'signing-in'
      ? 'Logging in...'
      : action === 'signing-up'
        ? 'Creating account...'
        : mode === 'login'
          ? 'Log In'
          : 'Sign Up';

  const submit = async () => {
    setMessage(null);

    if (mode === 'login') {
      await signIn(email.trim(), password);
      return;
    }

    const result = await signUp(email.trim(), password);

    if (result.success && result.needsEmailConfirmation) {
      setMessage('Account created. Check your email to confirm it before logging in.');
    }
  };

  return (
    <Screen>
      <Header
        eyebrow="Cooked"
        title={mode === 'login' ? 'Log in' : 'Create account'}
        subtitle="Sign in to save recipes to your Supabase account."
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
          placeholderTextColor={palette.muted}
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={palette.muted}
          style={styles.input}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <AppButton onPress={submit} disabled={isSubmitting || !email || !password}>
          {buttonText}
        </AppButton>
        <AppButton
          variant="secondary"
          onPress={() => {
            setMode((current) => (current === 'login' ? 'signup' : 'login'));
            setMessage(null);
            clearError();
          }}>
          {mode === 'login' ? 'Create Account' : 'Already Have Account'}
        </AppButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
