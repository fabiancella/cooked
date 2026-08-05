import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton, BackButton, Header, palette, Screen } from '@/components/recipe-ui';
import { useAuth } from '@/context/auth-store';

export default function AccountScreen() {
  const { action, clearError, deleteAccount, error, user } = useAuth();
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [password, setPassword] = useState('');
  const isDeleting = action === 'deleting-account';

  const openDeleteForm = () => {
    clearError();
    setShowDeleteForm(true);
  };

  const cancelDelete = () => {
    clearError();
    setPassword('');
    setShowDeleteForm(false);
  };

  const submitDelete = async () => {
    const success = await deleteAccount(password);

    if (!success) {
      setPassword('');
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
          if (!isDeleting) {
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

      <View style={styles.dangerSection}>
        <Text style={styles.dangerTitle}>Delete account</Text>
        <Text style={styles.note}>Permanently delete your account, saved recipes, and associated information.</Text>

        {showDeleteForm ? (
          <>
            <Text style={styles.label}>Current password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              editable={!isDeleting}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Password"
              placeholderTextColor={palette.muted}
              style={styles.input}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <AppButton variant="secondary" disabled={isDeleting} onPress={cancelDelete}>
              Cancel
            </AppButton>
            <AppButton variant="danger" disabled={isDeleting || !password} onPress={confirmDelete}>
              {isDeleting ? 'Deleting account...' : 'Continue'}
            </AppButton>
          </>
        ) : (
          <AppButton variant="danger" onPress={openDeleteForm}>
            Delete Account
          </AppButton>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
