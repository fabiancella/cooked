import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton, BackButton, Header, Screen } from '@/components/recipe-ui';
import { useAuth } from '@/context/auth-store';
import { AppPalette, useAppTheme, useThemeStyles } from '@/context/theme-store';

export default function AccountScreen() {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const {
    action,
    changePassword,
    clearError,
    deleteAccount,
    error,
    keepPasswordChangeSession,
    signOutAllAfterPasswordChange,
    user,
  } = useAuth();
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [changeValidationError, setChangeValidationError] = useState<string | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const isDeleting = action === 'deleting-account';
  const isChangingPassword = action === 'changing-password';
  const isSigningOutAll = action === 'signing-out-all';
  const isBusy = isDeleting || isChangingPassword || isSigningOutAll;

  const clearChangeForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangeValidationError(null);
    setPasswordChanged(false);
  };

  const openChangeForm = () => {
    clearError();
    setDeletePassword('');
    setShowDeleteForm(false);
    clearChangeForm();
    setShowChangeForm(true);
  };

  const cancelChange = () => {
    clearError();
    clearChangeForm();
    setShowChangeForm(false);
  };

  const submitChange = async () => {
    clearError();
    setChangeValidationError(null);

    if (newPassword !== confirmPassword) {
      setChangeValidationError('New passwords do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setChangeValidationError('New password must be different from the current password.');
      return;
    }

    const success = await changePassword(currentPassword, newPassword);

    if (success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordChanged(true);
    }
  };

  const keepCurrentSessions = () => {
    keepPasswordChangeSession();
    clearChangeForm();
    setShowChangeForm(false);
  };

  const signOutAll = async () => {
    const success = await signOutAllAfterPasswordChange();

    if (success) {
      router.replace('/');
    }
  };

  const openDeleteForm = () => {
    clearError();
    clearChangeForm();
    setShowChangeForm(false);
    setShowDeleteForm(true);
  };

  const cancelDelete = () => {
    clearError();
    setDeletePassword('');
    setShowDeleteForm(false);
  };

  const submitDelete = async () => {
    const success = await deleteAccount(deletePassword);

    if (!success) {
      setDeletePassword('');
    }
  };

  const confirmDelete = () => {
    Keyboard.dismiss();

    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, all saved recipes, and associated information. This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            void submitDelete();
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <BackButton
        onPress={() => {
          if (!isBusy) {
            router.back();
          }
        }}
        label="Settings"
      />
      <Header eyebrow="Settings" title="Account" subtitle="Manage your Cooked account." />

      <View style={styles.panel}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.email}>{user?.email ?? 'Unknown email'}</Text>
      </View>

      <View style={styles.passwordSection}>
        <Text style={styles.sectionTitle}>Password</Text>
        <Text style={styles.note}>Update the password used to log in to your account.</Text>

        {showChangeForm ? (
          passwordChanged ? (
            <>
              <Text style={styles.successText}>Your password has been changed.</Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <AppButton disabled={isSigningOutAll} variant="secondary" onPress={keepCurrentSessions}>
                Don&apos;t Sign Out
              </AppButton>
              <AppButton
                disabled={isSigningOutAll}
                variant="danger"
                onPress={() => void signOutAll()}>
                {isSigningOutAll ? 'Signing out...' : 'Sign Out of All Devices'}
              </AppButton>
            </>
          ) : (
            <>
              <Text style={styles.label}>Current password</Text>
              <TextInput
                value={currentPassword}
                onChangeText={(value) => {
                  setCurrentPassword(value);
                  setChangeValidationError(null);
                }}
                editable={!isChangingPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Current password"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />

              <Text style={styles.label}>New password</Text>
              <TextInput
                value={newPassword}
                onChangeText={(value) => {
                  setNewPassword(value);
                  setChangeValidationError(null);
                }}
                editable={!isChangingPassword}
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
                  setChangeValidationError(null);
                }}
                editable={!isChangingPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Confirm new password"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />

              {changeValidationError ? <Text style={styles.errorText}>{changeValidationError}</Text> : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <AppButton variant="secondary" disabled={isChangingPassword} onPress={cancelChange}>
                Cancel
              </AppButton>
              <AppButton
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                onPress={submitChange}>
                {isChangingPassword ? 'Changing password...' : 'Change Password'}
              </AppButton>
            </>
          )
        ) : (
          <AppButton disabled={isBusy} variant="secondary" onPress={openChangeForm}>
            Change Password
          </AppButton>
        )}
      </View>

      <View style={styles.dangerSection}>
        <Text style={styles.dangerTitle}>Delete account</Text>
        <Text style={styles.note}>Permanently delete your account, saved recipes, and associated information.</Text>

        {showDeleteForm ? (
          <>
            <Text style={styles.label}>Current password</Text>
            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              editable={!isDeleting}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Password"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <AppButton variant="secondary" disabled={isDeleting} onPress={cancelDelete}>
              Cancel
            </AppButton>
            <AppButton variant="danger" disabled={isDeleting || !deletePassword} onPress={confirmDelete}>
              {isDeleting ? 'Deleting account...' : 'Continue'}
            </AppButton>
          </>
        ) : (
          <AppButton disabled={isBusy} variant="danger" onPress={openDeleteForm}>
            Delete Account
          </AppButton>
        )}
      </View>
    </Screen>
  );
}

const createStyles = (palette: AppPalette) => StyleSheet.create({
  panel: {
    backgroundColor: palette.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 18,
    gap: 8,
  },
  label: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  email: {
    color: palette.ink,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
  },
  passwordSection: {
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 22,
    gap: 12,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  dangerSection: {
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 22,
    gap: 12,
  },
  dangerTitle: {
    color: palette.tomato,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  note: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  successText: {
    color: palette.herb,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
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
});
