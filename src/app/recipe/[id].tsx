import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton, BackButton, ExternalUrl, Header, RecipeImage, Screen } from '@/components/recipe-ui';
import { useRecipes } from '@/context/recipe-store';
import { AppPalette, useAppTheme, useThemeStyles } from '@/context/theme-store';
import { getScaledServingLabel, getServingCount, scaleIngredients } from '@/lib/ingredient-scaling';

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 100;

function isIngredientHeading(ingredient: string) {
  return /^[^:]{2,45}:$/.test(ingredient.trim());
}

export default function RecipeDetailScreen() {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteRecipe, error, getRecipe, loading } = useRecipes();
  const recipe = getRecipe(id);
  const originalServingCount = getServingCount(recipe?.servings);
  const [isDeleting, setIsDeleting] = useState(false);
  const [checkedIngredientIndexes, setCheckedIngredientIndexes] = useState<Set<number>>(() => new Set());
  const [selectedServingCount, setSelectedServingCount] = useState(originalServingCount ?? MIN_SERVINGS);

  const displayedIngredients = useMemo(
    () => scaleIngredients(recipe?.ingredients ?? [], originalServingCount ?? MIN_SERVINGS, selectedServingCount),
    [originalServingCount, recipe?.ingredients, selectedServingCount],
  );
  const displayedServingLabel = recipe
    ? originalServingCount
      ? getScaledServingLabel(recipe.servings, selectedServingCount)
      : recipe.servings
    : '';

  useEffect(() => {
    setCheckedIngredientIndexes(new Set());
    setSelectedServingCount(originalServingCount ?? MIN_SERVINGS);
  }, [originalServingCount, recipe?.id]);

  const toggleIngredientChecked = (index: number) => {
    setCheckedIngredientIndexes((currentIndexes) => {
      const nextIndexes = new Set(currentIndexes);

      if (nextIndexes.has(index)) {
        nextIndexes.delete(index);
      } else {
        nextIndexes.add(index);
      }

      return nextIndexes;
    });
  };

  const deleteCurrentRecipe = async () => {
    setIsDeleting(true);
    const wasDeleted = await deleteRecipe(id);
    setIsDeleting(false);

    if (wasDeleted) {
      router.replace('/');
    }
  };

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      deleteCurrentRecipe();
      return;
    }

    Alert.alert('Delete recipe?', 'This will remove it from your saved recipes.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteCurrentRecipe },
    ]);
  };

  if (loading) {
    return (
      <Screen>
        <Header title="Loading recipe" subtitle="Fetching this recipe from Supabase." />
      </Screen>
    );
  }

  if (!recipe) {
    return (
      <Screen>
        <Header title="Recipe not found" subtitle="This recipe is not available for the current user." />
        <AppButton onPress={() => router.replace('/')}>Back to Recipes</AppButton>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackButton onPress={() => router.dismissTo('/')} label="Recipes" />
      <Header eyebrow={recipe.source} title={recipe.title} subtitle={`${recipe.cookTime} • ${displayedServingLabel}`} />
      <RecipeImage recipe={recipe} />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {originalServingCount ? (
            <View style={styles.servingControl}>
              <Text style={styles.servingLabel}>Servings</Text>
              <View style={styles.servingStepper}>
                <Pressable
                  accessibilityLabel="Decrease servings"
                  disabled={selectedServingCount <= MIN_SERVINGS}
                  onPress={() => setSelectedServingCount((current) => Math.max(current - 1, MIN_SERVINGS))}
                  style={({ pressed }) => [
                    styles.servingButton,
                    selectedServingCount <= MIN_SERVINGS && styles.disabledServingButton,
                    pressed && styles.pressed,
                  ]}>
                  <SymbolView name={{ ios: 'minus', android: 'remove', web: 'remove' }} size={17} tintColor={colors.herb} />
                </Pressable>
                <Text style={styles.servingCount}>{selectedServingCount}</Text>
                <Pressable
                  accessibilityLabel="Increase servings"
                  disabled={selectedServingCount >= MAX_SERVINGS}
                  onPress={() => setSelectedServingCount((current) => Math.min(current + 1, MAX_SERVINGS))}
                  style={({ pressed }) => [
                    styles.servingButton,
                    selectedServingCount >= MAX_SERVINGS && styles.disabledServingButton,
                    pressed && styles.pressed,
                  ]}>
                  <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={17} tintColor={colors.herb} />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
        {displayedIngredients.map((ingredient, index) => {
          if (isIngredientHeading(ingredient)) {
            return <Text key={`${ingredient}-${index}`} style={styles.ingredientHeading}>{ingredient}</Text>;
          }

          const isChecked = checkedIngredientIndexes.has(index);

          return (
            <Pressable
              key={`${ingredient}-${index}`}
              accessibilityLabel={isChecked ? 'Uncheck ingredient' : 'Check ingredient'}
              onPress={() => toggleIngredientChecked(index)}
              style={({ pressed }) => [styles.ingredientRow, pressed && styles.pressed]}>
              <View style={styles.ingredientCheckButton}>
                <SymbolView
                  name={{
                    ios: isChecked ? 'checkmark.circle.fill' : 'circle',
                    android: isChecked ? 'check_circle' : 'radio_button_unchecked',
                    web: isChecked ? 'check_circle' : 'circle',
                  }}
                  size={22}
                  tintColor={isChecked ? colors.checkmark : colors.muted}
                />
              </View>
              <Text style={[styles.bodyText, isChecked && styles.checkedIngredientText]}>{ingredient}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Steps</Text>
        <View style={styles.stepList}>
          {recipe.steps.map((step, index) => (
            <View key={`${step}-${index}`} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <View style={styles.stepTextBox}>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <ExternalUrl url={recipe.sourceText} />
        <AppButton onPress={() => router.push({ pathname: '/cooking/[id]', params: { id: recipe.id } })} icon={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}>
          Start Cooking
        </AppButton>
        <AppButton
          variant="secondary"
          onPress={() => router.push({ pathname: '/preview', params: { id: recipe.id } })}
          icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}>
          Edit
        </AppButton>
        <AppButton disabled={isDeleting} variant="danger" onPress={confirmDelete} icon={{ ios: 'trash', android: 'delete', web: 'delete' }}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </AppButton>
      </View>
    </Screen>
  );
}

const createStyles = (palette: AppPalette) => StyleSheet.create({
  section: {
    backgroundColor: palette.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  sectionHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  servingControl: {
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: 4,
  },
  servingLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  servingStepper: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 8,
    overflow: 'hidden',
  },
  servingButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.sage,
  },
  disabledServingButton: {
    opacity: 0.35,
  },
  servingCount: {
    width: 40,
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  bodyText: {
    flex: 1,
    minWidth: 0,
    color: palette.ink,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '600',
  },
  ingredientHeading: {
    color: palette.ink,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '900',
    marginTop: 6,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  ingredientCheckButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedIngredientText: {
    color: palette.muted,
  },
  stepRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepList: {
    gap: 14,
  },
  stepNumber: {
    width: 32,
    height: 32,
    flexShrink: 0,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: palette.sage,
    color: palette.herb,
    textAlign: 'center',
    lineHeight: 32,
    fontSize: 15,
    fontWeight: '900',
  },
  stepText: {
    flexShrink: 1,
    color: palette.ink,
    fontSize: 16,
    fontWeight: '600',
    flexWrap: 'wrap',
  },
  stepTextBox: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  actions: {
    gap: 10,
  },
  pressed: {
    opacity: 0.72,
  },
  errorText: {
    color: palette.tomato,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
