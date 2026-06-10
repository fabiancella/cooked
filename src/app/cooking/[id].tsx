import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton, Header, palette, Screen } from '@/components/recipe-ui';
import { useRecipes } from '@/context/recipe-store';

export default function CookingModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipe } = useRecipes();
  const recipe = getRecipe(id);
  const [stepIndex, setStepIndex] = useState(0);
  const [checkedSteps, setCheckedSteps] = useState<string[]>([]);

  if (!recipe) {
    return (
      <Screen>
        <Header title="Recipe not found" />
        <AppButton onPress={() => router.replace('/')}>Back to Recipes</AppButton>
      </Screen>
    );
  }

  const progress = ((stepIndex + 1) / recipe.steps.length) * 100;
  const currentStepKey = `${recipe.id}-${stepIndex}`;
  const currentStepIsChecked = checkedSteps.includes(currentStepKey);

  const toggleCurrentStep = () => {
    setCheckedSteps((current) =>
      current.includes(currentStepKey)
        ? current.filter((step) => step !== currentStepKey)
        : [...current, currentStepKey],
    );
  };

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <Header eyebrow="Cooking mode" title={recipe.title} subtitle={`Step ${stepIndex + 1} of ${recipe.steps.length}`} />

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={styles.stepCard}>
        <Text style={styles.stepLabel}>Step {stepIndex + 1}</Text>
        <Text style={styles.stepText}>{recipe.steps[stepIndex]}</Text>
        <Pressable onPress={toggleCurrentStep} style={({ pressed }) => [styles.checkButton, currentStepIsChecked && styles.checkButtonActive, pressed && styles.pressed]}>
          <Text style={[styles.checkButtonText, currentStepIsChecked && styles.checkButtonTextActive]}>
            {currentStepIsChecked ? 'Step checked' : 'Check off step'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.controls}>
        <AppButton
          variant="secondary"
          disabled={stepIndex === 0}
          onPress={() => setStepIndex((current) => Math.max(current - 1, 0))}>
          Back
        </AppButton>
        {stepIndex === recipe.steps.length - 1 ? (
          <AppButton onPress={() => router.back()}>Done</AppButton>
        ) : (
          <AppButton onPress={() => setStepIndex((current) => Math.min(current + 1, recipe.steps.length - 1))}>
            Next
          </AppButton>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E9DCCA',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: palette.tomato,
  },
  stepCard: {
    flex: 1,
    minHeight: 300,
    backgroundColor: palette.paper,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 26,
    justifyContent: 'center',
    gap: 18,
  },
  stepLabel: {
    color: palette.tomato,
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  stepText: {
    color: palette.ink,
    fontSize: 30,
    lineHeight: 40,
    fontWeight: '800',
  },
  checkButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4E1D0',
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  checkButtonActive: {
    backgroundColor: palette.herb,
    borderColor: palette.herb,
  },
  checkButtonText: {
    color: palette.herb,
    fontSize: 16,
    fontWeight: '900',
  },
  checkButtonTextActive: {
    color: palette.paper,
  },
  pressed: {
    opacity: 0.72,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
});
