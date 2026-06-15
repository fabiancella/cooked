import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton, Header, palette, Screen } from '@/components/recipe-ui';
import { Recipe } from '@/data/mock-recipes';
import { supabase } from '@/lib/supabase';

type FormattedRecipeResponse = {
  recipe?: Partial<Recipe>;
};

type FunctionErrorBody = {
  error?: unknown;
};

const EMPTY_RECIPE_TEXT_ERROR = 'Paste recipe text before formatting.';
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

function getRecipeColor(source?: string) {
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

export default function AddRecipeScreen() {
  const [text, setText] = useState('');
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  const formatRecipe = async () => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      setFormatError(EMPTY_RECIPE_TEXT_ERROR);
      return;
    }

    setIsFormatting(true);
    setFormatError(null);

    const { data, error } = await supabase.functions.invoke<FormattedRecipeResponse>('format-recipe', {
      body: { text: trimmedText },
    });

    setIsFormatting(false);

    if (error) {
      setFormatError(await getFunctionErrorMessage(error));
      return;
    }

    const formattedRecipe = getFormattedRecipe(data, trimmedText);

    if (!formattedRecipe) {
      setFormatError(INVALID_RECIPE_ERROR);
      return;
    }

    router.push({
      pathname: '/preview',
      params: {
        recipe: JSON.stringify(formattedRecipe),
      },
    });
  };

  return (
    <Screen>
      <Header eyebrow="Add recipe" title="Turn messy text into a clean card" subtitle="Paste recipe text, notes, or a caption. Cooked will format it into an editable draft." />

      <View style={styles.inputPanel}>
        <Text style={styles.inputLabel}>Recipe text, caption, or notes</Text>
        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            setFormatError(null);
          }}
          multiline
          textAlignVertical="top"
          placeholder="Example: saw this pasta on IG... boil rigatoni, lemon, parm, butter, pasta water..."
          placeholderTextColor={palette.muted}
          style={styles.textArea}
        />
      </View>

      {formatError ? (
        <View style={styles.errorPanel}>
          <Text style={styles.errorText}>{formatError}</Text>
          <AppButton
            disabled={isFormatting || !text.trim()}
            variant="secondary"
            onPress={formatRecipe}
            icon={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}>
            Retry
          </AppButton>
        </View>
      ) : null}

      <AppButton
        disabled={isFormatting || !text.trim()}
        onPress={formatRecipe}
        icon={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}>
        {isFormatting ? 'Formatting...' : 'Format Recipe'}
      </AppButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inputPanel: {
    gap: 10,
  },
  inputLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  textArea: {
    minHeight: 190,
    borderRadius: 18,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
    color: palette.ink,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  errorPanel: {
    gap: 10,
  },
  errorText: {
    color: palette.tomato,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
