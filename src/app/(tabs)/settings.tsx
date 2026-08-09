import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton, Header, Screen } from '@/components/recipe-ui';
import { useAuth } from '@/context/auth-store';
import { AppPalette, useAppTheme, useThemeStyles } from '@/context/theme-store';

type SettingsRow = {
  title: string;
  route?: '/settings/account' | '/settings/help' | '/settings/about';
  disabled?: boolean;
};

const rows: SettingsRow[] = [
  { title: 'Account', route: '/settings/account' },
  { title: 'Export recipes', disabled: true },
  { title: 'Subscription', disabled: true },
  { title: 'Help', route: '/settings/help' },
  { title: 'About', route: '/settings/about' },
];

export default function SettingsScreen() {
  const { action, error, signOut, user } = useAuth();
  const { colors, isDark, setDarkMode } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const isSigningOut = action === 'signing-out';

  return (
    <Screen bottomPadding={24}>
      <Header eyebrow="Settings" title="Preferences" subtitle={user?.email ?? 'Signed in'} />
      <View style={styles.panel}>
        <View style={[styles.row, styles.switchRows]}>
          <Text style={styles.rowText}>Dark Mode</Text>
          <Switch
            accessibilityLabel="Dark Mode"
            value={isDark}
            onValueChange={setDarkMode}
            trackColor={{ false: colors.line, true: colors.herb }}
            ios_backgroundColor={colors.line}
          />
        </View>
        {rows.map((row) => (
          <Pressable
            key={row.title}
            disabled={row.disabled}
            onPress={() => {
              if (row.route) {
                router.push(row.route);
              }
            }}
            style={({ pressed }) => [
              styles.row,
              row.disabled && styles.disabledRow,
              pressed && !row.disabled && styles.pressedRow,
            ]}>
            <View style={styles.rowTextGroup}>
              <Text style={[styles.rowText, row.disabled && styles.disabledText]}>{row.title}</Text>
              {row.disabled ? <Text style={styles.rowStatus}>Coming later</Text> : null}
            </View>
            {row.disabled ? null : (
              <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} tintColor={colors.muted} />
            )}
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <AppButton disabled={isSigningOut} variant="danger" onPress={signOut}>
        {isSigningOut ? 'Logging out...' : 'Log Out'}
      </AppButton>
    </Screen>
  );
}

const createStyles = (palette: AppPalette) => StyleSheet.create({
  panel: {
    backgroundColor: palette.paper,
    borderRadius: 18,
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
  switchRows: {
    paddingVertical: 15,
  },
  pressedRow: {
    opacity: 0.72,
  },
  disabledRow: {
    opacity: 0.62,
  },
  rowTextGroup: {
    gap: 3,
  },
  rowText: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  disabledText: {
    color: palette.muted,
  },
  rowStatus: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: palette.tomato,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
