import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { AppButton, Header, palette, PlaceholderImage, Screen } from '@/components/recipe-ui';
import { useRecipes } from '@/context/recipe-store';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteRecipe, getRecipe } = useRecipes();
  const recipe = getRecipe(id);

  const deleteCurrentRecipe = () => {
    deleteRecipe(id);
    router.replace('/');
  };

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      deleteCurrentRecipe();
      return;
    }

    Alert.alert('Delete recipe?', 'This only removes it from mock local data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteCurrentRecipe },
    ]);
  };

  if (!recipe) {
    return (
      <Screen>
        <Header title="Recipe not found" subtitle="This mock recipe is not available in local state." />
        <AppButton onPress={() => router.replace('/')}>Back to Recipes</AppButton>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header eyebrow={recipe.source} title={recipe.title} subtitle={`${recipe.cookTime} • ${recipe.servings}`} />
      <PlaceholderImage color={recipe.color} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        {recipe.ingredients.map((ingredient, index) => (
          <Text key={`${ingredient}-${index}`} style={styles.bodyText}>• {ingredient}</Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Steps</Text>
        {recipe.steps.map((step, index) => (
          <View key={`${step}-${index}`} style={styles.stepRow}>
            <Text style={styles.stepNumber}>{index + 1}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <AppButton onPress={() => router.push({ pathname: '/cooking/[id]', params: { id: recipe.id } })} icon={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}>
          Start Cooking
        </AppButton>
        <AppButton
          variant="secondary"
          onPress={() => router.push({ pathname: '/preview', params: { id: recipe.id } })}
          icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}>
          Edit
        </AppButton>
        <AppButton variant="danger" onPress={confirmDelete} icon={{ ios: 'trash', android: 'delete', web: 'delete' }}>
          Delete
        </AppButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: palette.paper,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 18,
    gap: 10,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  bodyText: {
    color: palette.ink,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '600',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: palette.sage,
    color: palette.herb,
    textAlign: 'center',
    lineHeight: 30,
    fontSize: 15,
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    color: palette.ink,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '600',
  },
  actions: {
    gap: 10,
  },
});
