import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton, Header, palette, Screen } from '@/components/recipe-ui';
import { useAuth } from '@/context/auth-store';

export default function AccountScreen() {
  const { user } = useAuth();

  return (
    <Screen>
      <BackButton onPress={() => router.back()} label="Settings" />
      <Header eyebrow="Settings" title="Account" subtitle="Manage your Cooked account." />

      <View style={styles.panel}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.email}>{user?.email ?? 'Unknown email'}</Text>
      </View>

      <Text style={styles.note}>Account deletion is not available in this MVP.</Text>

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
  note: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
