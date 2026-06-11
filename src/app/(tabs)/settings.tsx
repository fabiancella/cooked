import { SymbolView } from 'expo-symbols';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton, Header, palette, Screen } from '@/components/recipe-ui';
import { useAuth } from '@/context/auth-store';

const rows = ['Account', 'Export recipes', 'Subscription', 'Help', 'About'];

export default function SettingsScreen() {
  const { action, error, signOut, user } = useAuth();
  const isSigningOut = action === 'signing-out';

  return (
    <Screen>
      <Header eyebrow="Settings" title="Preferences" subtitle={user?.email ?? 'Signed in'} />
      <View style={styles.panel}>
        {rows.map((row) => (
          <View key={row} style={styles.row}>
            <Text style={styles.rowText}>{row}</Text>
            <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} tintColor={palette.muted} />
          </View>
        ))}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <AppButton disabled={isSigningOut} variant="danger" onPress={signOut}>
        {isSigningOut ? 'Logging out...' : 'Log Out'}
      </AppButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: palette.paper,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: 'hidden',
  },
  row: {
    minHeight: 60,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  rowText: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  errorText: {
    color: palette.tomato,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
