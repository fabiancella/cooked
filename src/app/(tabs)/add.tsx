import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton, Header, palette, Screen } from '@/components/recipe-ui';
import { Recipe } from '@/data/mock-recipes';
import { supabase } from '@/lib/supabase';

const options = [
  { title: 'Paste recipe text', icon: { ios: 'doc.plaintext', android: 'article', web: 'article' } },
  { title: 'Paste TikTok/Instagram link', icon: { ios: 'link', android: 'link', web: 'link' } },
  { title: 'Upload screenshot', icon: { ios: 'photo.on.rectangle', android: 'image', web: 'image' } },
] as const;

type FormattedRecipeResponse = {
  recipe?: Partial<Recipe>;
};

type FunctionErrorBody = {
  error?: unknown;
};

async function getFunctionErrorMessage(error: unknown) {
  const fallback = error instanceof Error && error.message ? error.message : 'Could not format this recipe. Try again.';
  const context = error && typeof error === 'object' && 'context' in error ? (error as { context?: unknown }).context : null;

  if (!(context instanceof Response)) {
    return fallback;
  }

  try {
    const body = (await context.clone().json()) as FunctionErrorBody;

    if (typeof body.error === 'string' && body.error.trim()) {
      return body.error;
    }
  } catch {
    return fallback;
  }

  return fallback;
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
      setFormatError('Paste recipe text before formatting.');
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
      setFormatError('The formatter returned an invalid recipe. Try again.');
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
      <Header eyebrow="Add recipe" title="Turn messy text into a clean card" subtitle="Paste what you have. The formatter is mocked for now." />

      <View style={styles.optionsGrid}>
        {options.map((option) => (
          <View key={option.title} style={styles.optionCard}>
            <View style={styles.optionIcon}>
              <SymbolView name={option.icon} size={22} tintColor={palette.herb} />
            </View>
            <Text style={styles.optionText}>{option.title}</Text>
          </View>
        ))}
      </View>

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

      {formatError ? <Text style={styles.errorText}>{formatError}</Text> : null}

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
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    minHeight: 76,
    borderRadius: 22,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
  },
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
    borderRadius: 24,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
    color: palette.ink,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  errorText: {
    color: palette.tomato,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
