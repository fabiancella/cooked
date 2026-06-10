import { SymbolView } from 'expo-symbols';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Header, palette, Screen } from '@/components/recipe-ui';

const rows = ['Account', 'Export recipes', 'Subscription', 'Help', 'About'];

export default function SettingsScreen() {
  return (
    <Screen>
      <Header eyebrow="Settings" title="Preferences" subtitle="Placeholder settings for the clickable prototype." />
      <View style={styles.panel}>
        {rows.map((row) => (
          <View key={row} style={styles.row}>
            <Text style={styles.rowText}>{row}</Text>
            <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} tintColor={palette.muted} />
          </View>
        ))}
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
});
