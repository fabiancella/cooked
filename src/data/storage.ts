import { Recipe } from '@/data/mock-recipes';
import { supabase } from '@/lib/supabase';

type RecipeRow = {
  id: string;
  user_id: string;
  title: string;
  cook_time: string;
  servings: string;
  source: string;
  ingredients: string[];
  steps: string[];
  source_text: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

function getRecipeColor(source: string) {
  if (source === 'TikTok') {
    return '#F18F7A';
  }

  if (source === 'Instagram') {
    return '#0a18e9';
  }

  if (source === 'Screenshot') {
    return '#C86738';
  }

  return '#E7A458';
}

function toRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    cookTime: row.cook_time,
    servings: row.servings,
    source: row.source,
    sourceText: row.source_text,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    color: getRecipeColor(row.source),
    ingredients: row.ingredients,
    steps: row.steps,
  };
}

function toRecipePayload(recipe: Recipe) {
  return {
    title: recipe.title,
    cook_time: recipe.cookTime,
    servings: recipe.servings,
    source: recipe.source,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    source_text: recipe.sourceText ?? null,
    image_url: recipe.imageUrl ?? null,
  };
}

function throwSupabaseError(error: { message: string; code?: string; details?: string; hint?: string }) {
  const detailParts = [error.message, error.details, error.hint, error.code].filter(Boolean);
  throw new Error(detailParts.join(' '));
}

export async function loadRecipes(userId: string) {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throwSupabaseError(error);
  }

  return (data as RecipeRow[]).map(toRecipe);
}

export async function getRecipe(id: string, userId: string) {
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).eq('user_id', userId).single();

  if (error) {
    throwSupabaseError(error);
  }

  return toRecipe(data as RecipeRow);
}

export async function addRecipe(recipe: Recipe, userId: string) {
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      ...toRecipePayload(recipe),
      user_id: userId,
    })
    .select('*')
    .single();

  if (error) {
    throwSupabaseError(error);
  }

  return toRecipe(data as RecipeRow);
}

export async function updateRecipe(id: string, recipe: Recipe, userId: string) {
  const { data, error } = await supabase
    .from('recipes')
    .update(toRecipePayload(recipe))
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throwSupabaseError(error);
  }

  return toRecipe(data as RecipeRow);
}

export async function deleteRecipe(id: string, userId: string) {
  const { error } = await supabase.from('recipes').delete().eq('id', id).eq('user_id', userId);

  if (error) {
    throwSupabaseError(error);
  }
}
