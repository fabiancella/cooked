import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton, Header, palette, Screen } from '@/components/recipe-ui';
import { formatRecipeText } from '@/data/mock-formatter';

const options = [
  { title: 'Paste recipe text', icon: { ios: 'doc.plaintext', android: 'article', web: 'article' } },
  { title: 'Paste TikTok/Instagram link', icon: { ios: 'link', android: 'link', web: 'link' } },
  { title: 'Upload screenshot', icon: { ios: 'photo.on.rectangle', android: 'image', web: 'image' } },
] as const;

export default function AddRecipeScreen() {
  const [text, setText] = useState('');

  const formatRecipe = () => {
    const formattedRecipe = formatRecipeText(text);

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
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          placeholder="Example: saw this pasta on IG... boil rigatoni, lemon, parm, butter, pasta water..."
          placeholderTextColor={palette.muted}
          style={styles.textArea}
        />
      </View>

      <AppButton onPress={formatRecipe} icon={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}>
        Format Recipe
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
});
