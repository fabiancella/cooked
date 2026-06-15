import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton, Header, palette, Screen } from '@/components/recipe-ui';

const helpSteps = [
  'Paste recipe text, notes, or a caption into Add Recipe.',
  'Tap Format Recipe to turn it into a structured draft.',
  'Review and edit the title, ingredients, steps, cook time, and servings.',
  'Save the recipe when it looks right.',
];

export default function HelpScreen() {
  return (
    <Screen>
      <Header eyebrow="Settings" title="Help" subtitle="How to add a recipe." />

      <View style={styles.panel}>
        {helpSteps.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <Text style={styles.stepNumber}>{index + 1}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <AppButton variant="secondary" onPress={() => router.back()}>
        Back
      </AppButton>
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
    gap: 14,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: palette.sage,
    color: palette.herb,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 14,
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    color: palette.ink,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
});
