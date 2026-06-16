import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton, Header, palette, Screen } from '@/components/recipe-ui';

export default function AboutScreen() {
  return (
    <Screen>
      <BackButton onPress={() => router.back()} label="Settings" />
      <Header eyebrow="Settings" title="About" subtitle="Cooked" />

      <View style={styles.panel}>
        <Text style={styles.appName}>Cooked</Text>
        <Text style={styles.description}>
          Cooked helps you turn pasted recipe text and social captions into clean, editable recipes.
        </Text>
        <Text style={styles.version}>Version 0.1.0</Text>
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
    gap: 10,
  },
  appName: {
    color: palette.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  description: {
    color: palette.ink,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  version: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
