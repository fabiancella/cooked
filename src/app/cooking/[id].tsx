import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton, BackButton, Header, Screen } from '@/components/recipe-ui';
import { useRecipes } from '@/context/recipe-store';
import { AppPalette, useThemeStyles } from '@/context/theme-store';

export default function CookingModeScreen() {
  const styles = useThemeStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipe } = useRecipes();
  const recipe = getRecipe(id);
  const [stepIndex, setStepIndex] = useState(0);

  if (!recipe) {
    return (
      <Screen>
        <Header title="Recipe not found" />
        <AppButton onPress={() => router.replace('/')}>Back to Recipes</AppButton>
      </Screen>
    );
  }

  const progress = ((stepIndex + 1) / recipe.steps.length) * 100;

  return (
    <Screen contentStyle={styles.content}>
      <BackButton onPress={() => router.back()} label="Recipe" />
      <Header eyebrow="Cooking mode" title={recipe.title} subtitle={`Step ${stepIndex + 1} of ${recipe.steps.length}`} />

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={styles.stepCard}>
        <Text style={styles.stepLabel}>Step {stepIndex + 1}</Text>
        <Text style={styles.stepText}>{recipe.steps[stepIndex]}</Text>
      </View>

      <View style={styles.controls}>
        <AppButton
          variant="secondary"
          disabled={stepIndex === 0}
          style={styles.controlButton}
          onPress={() => setStepIndex((current) => Math.max(current - 1, 0))}>
          Back
        </AppButton>
        {stepIndex === recipe.steps.length - 1 ? (
          <AppButton style={styles.controlButton} onPress={() => router.back()}>Done</AppButton>
        ) : (
          <AppButton style={styles.controlButton} onPress={() => setStepIndex((current) => Math.min(current + 1, recipe.steps.length - 1))}>
            Next
          </AppButton>
        )}
      </View>
    </Screen>
  );
}

const createStyles = (palette: AppPalette) => StyleSheet.create({
  content: {
    gap: 20,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: palette.tomato,
  },
  stepCard: {
    width: '100%',
    minHeight: 360,
    backgroundColor: palette.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 22,
    justifyContent: 'flex-start',
    gap: 16,
  },
  stepLabel: {
    color: palette.tomato,
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  stepText: {
    flexShrink: 1,
    minWidth: 0,
    color: palette.ink,
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '800',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
  },
});
