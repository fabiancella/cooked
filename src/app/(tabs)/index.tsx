import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton, Header, palette, RecipeCard, Screen } from '@/components/recipe-ui';
import { useRecipes } from '@/context/recipe-store';

export default function HomeScreen() {
  const { recipes } = useRecipes();
  const [query, setQuery] = useState('');

  const filteredRecipes = useMemo(
    () => recipes.filter((recipe) => recipe.title.toLowerCase().includes(query.trim().toLowerCase())),
    [query, recipes],
  );

  return (
    <Screen>
      <Header eyebrow="Cooked" title="Your saved recipes" subtitle="Clean recipe cards from links, captions, screenshots, and notes." />

      <View style={styles.searchBox}>
        <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} tintColor={palette.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search recipes"
          placeholderTextColor={palette.muted}
          style={styles.searchInput}
        />
      </View>

      {filteredRecipes.length > 0 ? (
        <View style={styles.list}>
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <SymbolView name={{ ios: 'doc.text.magnifyingglass', android: 'description', web: 'description' }} size={34} tintColor={palette.herb} />
          </View>
          <Text style={styles.emptyTitle}>No recipes found</Text>
          <Text style={styles.emptyText}>Paste a caption, link, or screenshot and Cooked will turn it into a tidy recipe card.</Text>
          <AppButton onPress={() => router.push('/add')} icon={{ ios: 'plus', android: 'add', web: 'add' }}>
            Add Recipe
          </AppButton>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: palette.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    gap: 16,
  },
  emptyState: {
    backgroundColor: palette.paper,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  emptyText: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
    textAlign: 'center',
  },
});
