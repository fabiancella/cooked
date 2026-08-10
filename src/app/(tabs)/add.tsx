import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton, Header, KeyboardDoneAccessory, Screen } from '@/components/recipe-ui';
import { AppPalette, useAppTheme, useThemeStyles } from '@/context/theme-store';
import { EMPTY_RECIPE_TEXT_ERROR, formatRecipeInput, isHttpUrl } from '@/lib/recipe-formatting';

type AddRecipeParams = {
  sharedText?: string | string[];
  importError?: string | string[];
};

function getParamText(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

export default function AddRecipeScreen() {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { importError, sharedText } = useLocalSearchParams<AddRecipeParams>();
  const [text, setText] = useState('');
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  useEffect(() => {
    const nextError = getParamText(importError);
    const nextText = getParamText(sharedText);

    if (nextText) {
      setText(nextText);
    }

    if (nextError) {
      setFormatError(nextError);
      return;
    }

    if (nextText) {
      setFormatError(null);
    }
  }, [importError, sharedText]);

  const formatRecipe = async () => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      setFormatError(EMPTY_RECIPE_TEXT_ERROR);
      return;
    }

    try {
      setIsFormatting(true);
      setFormatError(null);

      const importMode = isHttpUrl(trimmedText) ? 'shared-url' : 'paste';
      const formattedRecipe = await formatRecipeInput(trimmedText, importMode);

      router.push({
        pathname: '/preview',
        params: {
          recipe: JSON.stringify(formattedRecipe),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not format this recipe. Check if caption contains recipe.';
      setFormatError(message);
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <>
      <Screen bottomPadding={24}>
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
            placeholderTextColor={colors.muted}
            style={styles.textArea}
          />
        </View>

        {formatError ? (
          <View style={styles.errorPanel}>
            <Text style={styles.errorText}>{formatError}</Text>
            {text.trim() ? (
              <AppButton
                disabled={isFormatting}
                variant="secondary"
                onPress={formatRecipe}
                icon={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}>
                Retry
              </AppButton>
            ) : null}
          </View>
        ) : null}

        <AppButton
          disabled={isFormatting || !text.trim()}
          onPress={formatRecipe}
          icon={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}>
          {isFormatting ? 'Formatting...' : 'Format Recipe'}
        </AppButton>
      </Screen>
      <KeyboardDoneAccessory />
    </>
  );
}

const createStyles = (palette: AppPalette) => StyleSheet.create({
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
