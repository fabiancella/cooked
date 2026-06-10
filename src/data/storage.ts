import AsyncStorage from '@react-native-async-storage/async-storage';

import { Recipe } from '@/data/mock-recipes';

export const STORAGE_KEY = '@cooked:recipes';

function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const recipe = value as Partial<Recipe>;

  return (
    typeof recipe.id === 'string' &&
    typeof recipe.title === 'string' &&
    typeof recipe.cookTime === 'string' &&
    typeof recipe.servings === 'string' &&
    typeof recipe.source === 'string' &&
    typeof recipe.color === 'string' &&
    Array.isArray(recipe.ingredients) &&
    Array.isArray(recipe.steps)
  );
}

async function readRecipeList() {
  try {
    const storedValue = await AsyncStorage.getItem(STORAGE_KEY);

    // Nothing has been saved yet, so callers can decide whether to show mock data.
    if (!storedValue) {
      return null;
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    // AsyncStorage only stores strings, so we validate the parsed JSON before trusting it.
    if (!Array.isArray(parsedValue) || !parsedValue.every(isRecipe)) {
      return null;
    }

    return parsedValue;
  } catch (error) {
    console.error('Error loading recipes from storage:', error);
    return null;
  }
}

export async function loadRecipes(fallbackRecipes: Recipe[] = []) {
  const storedRecipes = await readRecipeList();

  // If storage is empty or invalid, return the provided fallback list.
  return storedRecipes ?? fallbackRecipes;
}

export async function saveRecipes(recipes: Recipe[]) {
  try {
    const jsonValue = JSON.stringify(recipes);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    return recipes;
  } catch (error) {
    console.error('Error saving recipes to storage:', error);
    return recipes;
  }
}

export async function getRecipe(id: string) {
  const recipes = await loadRecipes();
  return recipes.find((recipe) => recipe.id === id);
}

export async function addRecipe(recipe: Recipe) {
  const recipes = await loadRecipes();
  const nextRecipes = [recipe, ...recipes];

  // Save the full list back because AsyncStorage does not update array items by itself.
  await saveRecipes(nextRecipes);
  return recipe;
}

export async function updateRecipe(id: string, recipe: Recipe) {
  const recipes = await loadRecipes();
  const updatedRecipe = { ...recipe, id };
  const nextRecipes = recipes.map((currentRecipe) =>
    currentRecipe.id === id ? updatedRecipe : currentRecipe,
  );

  await saveRecipes(nextRecipes);
  return updatedRecipe;
}

export async function deleteRecipe(id: string) {
  const recipes = await loadRecipes();
  const nextRecipes = recipes.filter((recipe) => recipe.id !== id);

  await saveRecipes(nextRecipes);
  return nextRecipes;
}

export async function clearRecipes() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing recipes from storage:', error);
  }
}
