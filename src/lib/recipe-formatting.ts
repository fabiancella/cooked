import { Recipe } from '@/data/types';
import { supabase } from '@/lib/supabase';

export type RecipeImportMode = 'paste' | 'shared-url';

type FormattedRecipeResponse = {
  recipe?: Partial<Recipe>;
};

type FunctionErrorBody = {
  error?: unknown;
};

export const EMPTY_RECIPE_TEXT_ERROR = 'Paste recipe text before formatting.';
const FORMAT_FAILED_ERROR = 'Could not format this recipe. Check the text and try again.';
const INVALID_RECIPE_ERROR = 'The formatter returned recipe data we could not read. Try formatting again.';
const NOT_RECIPE_ERROR = 'That does not look like a recipe. Paste ingredients and cooking steps, then try again.';

function getReadableFunctionError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('does not look like a recipe')) {
    return NOT_RECIPE_ERROR;
  }

  if (lowerMessage.includes('invalid recipe') || lowerMessage.includes('bad recipe json')) {
    return INVALID_RECIPE_ERROR;
  }

  if (lowerMessage.includes('gemini') || lowerMessage.includes('edge function') || lowerMessage.includes('non-2xx')) {
    return FORMAT_FAILED_ERROR;
  }

  return message;
}

async function getFunctionErrorMessage(error: unknown) {
  const fallback = error instanceof Error && error.message ? error.message : 'Could not format this recipe. Try again.';
  const context = error && typeof error === 'object' && 'context' in error ? (error as { context?: unknown }).context : null;

  if (!(context instanceof Response)) {
    return fallback;
  }

  try {
    const body = (await context.clone().json()) as FunctionErrorBody;

    if (typeof body.error === 'string' && body.error.trim()) {
      return getReadableFunctionError(body.error);
    }
  } catch {
    return getReadableFunctionError(fallback);
  }

  return getReadableFunctionError(fallback);
}

export function getRecipeColor(source?: string) {
  if (source === 'TikTok') {
    return '#F18F7A';
  }

  if (source === 'Instagram') {
    return '#F6C453';
  }

  if (source === 'Screenshot') {
    return '#C86738';
  }

  return '#E7A458';
}

function getFormattedRecipe(data: FormattedRecipeResponse | null, fallbackText: string): Recipe | null {
  const recipe = data?.recipe;

  if (!recipe) {
    return null;
  }

  if (
    typeof recipe.title !== 'string' ||
    typeof recipe.cookTime !== 'string' ||
    typeof recipe.servings !== 'string' ||
    typeof recipe.source !== 'string' ||
    !Array.isArray(recipe.ingredients) ||
    !Array.isArray(recipe.steps)
  ) {
    return null;
  }

  return {
    id: 'formatted-preview',
    title: recipe.title,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    source: recipe.source,
    sourceText: typeof recipe.sourceText === 'string' ? recipe.sourceText : fallbackText,
    imageUrl: null,
    color: getRecipeColor(recipe.source),
    ingredients: recipe.ingredients.filter((ingredient): ingredient is string => typeof ingredient === 'string'),
    steps: recipe.steps.filter((step): step is string => typeof step === 'string'),
  };
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function formatRecipeInput(text: string, importMode: RecipeImportMode = 'paste') {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error(EMPTY_RECIPE_TEXT_ERROR);
  }

  const { data, error } = await supabase.functions.invoke<FormattedRecipeResponse>('format-recipe', {
    body: { text: trimmedText, importMode },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }

  const formattedRecipe = getFormattedRecipe(data, trimmedText);

  if (!formattedRecipe) {
    throw new Error(INVALID_RECIPE_ERROR);
  }

  return formattedRecipe;
}
