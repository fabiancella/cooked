import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton, Header, Screen } from '@/components/recipe-ui';
import { useAuth } from '@/context/auth-store';
import { AppPalette, useAppTheme, useThemeStyles } from '@/context/theme-store';

export function PasswordRecoveryScreen() {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const {
    action,
    cancelPasswordRecovery,
    clearError,
    error,
    keepPasswordChangeSession,
    passwordRecoveryError,
    passwordRecoveryStatus,
    session,
    signOutAllAfterPasswordChange,
    updateRecoveredPassword,
  } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const isUpdating = action === 'updating-password';
  const isSigningOut = action === 'signing-out-all';

  const cancelRecovery = async () => {
    const success = await cancelPasswordRecovery();

    if (success) {
      router.replace('/');
    }
  };

  const keepCurrentSessions = () => {
    keepPasswordChangeSession();
    router.replace('/');
  };

  const signOutAll = async () => {
    const success = await signOutAllAfterPasswordChange();

    if (success) {
      router.replace('/');
    }
  };

  const submit = async () => {
    clearError();
    setValidationError(null);

    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    await updateRecoveredPassword(newPassword);
  };

  if (passwordRecoveryStatus === 'processing') {
    return (
      <Screen>
        <Header eyebrow="Cooked" title="Opening reset link" subtitle="Verifying your password reset request." />
        <ActivityIndicator color={colors.herb} />
      </Screen>
    );
  }

  if (passwordRecoveryStatus === 'error') {
    return (
      <Screen>
        <Header eyebrow="Cooked" title="Reset link unavailable" subtitle={passwordRecoveryError ?? undefined} />
        <AppButton variant="secondary" onPress={() => void cancelRecovery()}>
          {session ? 'Return to Cooked' : 'Return to Login'}
        </AppButton>
      </Screen>
    );
  }

  if (passwordRecoveryStatus === 'complete') {
    return (
      <Screen>
        <Header eyebrow="Cooked" title="Password changed" subtitle="Your new password is ready to use." />
        <View style={styles.panel}>
          <Text style={styles.note}>Choose whether to keep your current sessions signed in.</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <AppButton disabled={isSigningOut} variant="secondary" onPress={keepCurrentSessions}>
            Don&apos;t Sign Out
          </AppButton>
          <AppButton
            disabled={isSigningOut}
            variant="danger"
            onPress={() => void signOutAll()}>
            {isSigningOut ? 'Signing out...' : 'Sign Out of All Devices'}
          </AppButton>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header eyebrow="Cooked" title="Create a new password" subtitle="Enter the new password for your account." />

      <View style={styles.panel}>
        <Text style={styles.label}>New password</Text>
        <TextInput
          value={newPassword}
          onChangeText={(value) => {
            setNewPassword(value);
            setValidationError(null);
          }}
          editable={!isUpdating}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="New password"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.label}>Confirm new password</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            setValidationError(null);
          }}
          editable={!isUpdating}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Confirm new password"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <AppButton disabled={isUpdating || !newPassword || !confirmPassword} onPress={submit}>
          {isUpdating ? 'Changing password...' : 'Change Password'}
        </AppButton>
        <AppButton disabled={isUpdating} variant="secondary" onPress={() => void cancelRecovery()}>
          Cancel
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
  note: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  errorText: {
    color: palette.tomato,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
