import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { getRecipeColor } from '@/lib/recipe-formatting';
import { AppButton, Header, palette, RecipeCard, Screen } from '@/components/recipe-ui';
import { useRecipes } from '@/context/recipe-store';

export default function HomeScreen() {
  const { error, loading, recipes, refreshRecipes } = useRecipes();
  const [query, setQuery] = useState('');

  const filteredRecipes = useMemo(
    () => recipes.filter((recipe) => recipe.title.toLowerCase().includes(query.trim().toLowerCase())),
    [query, recipes],
  );

  return (
    <Screen bottomPadding={24}>
      <Header eyebrow="Cooked" title="Your saved recipes" subtitle="Clean recipe cards from pasted text, captions, and notes." />

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

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={palette.herb} />
          <Text style={styles.emptyTitle}>Loading recipes</Text>
          <Text style={styles.emptyText}>Fetching your saved recipes.</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <SymbolView name={{ ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' }} size={34} tintColor={palette.tomato} />
          </View>
          <Text style={styles.emptyTitle}>Could not load recipes</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <AppButton onPress={refreshRecipes}>Retry Loading</AppButton>
        </View>
      ) : filteredRecipes.length > 0 ? (
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
          <Text style={styles.emptyText}>Paste recipe text or notes and Cooked will turn them into a tidy recipe card.</Text>
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
    borderRadius: 14,
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 22,
    alignItems: 'center',
    gap: 14,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 21,
    lineHeight: 27,
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
