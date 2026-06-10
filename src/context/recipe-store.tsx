import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { mockRecipes, Recipe } from '@/data/mock-recipes';
import { loadRecipes, saveRecipes } from '@/data/storage';

type RecipeContextValue = {
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => Recipe;
  updateRecipe: (id: string, recipe: Recipe) => Recipe | undefined;
  deleteRecipe: (id: string) => void;
  getRecipe: (id: string) => Recipe | undefined;
};

const RecipeContext = createContext<RecipeContextValue | null>(null);

export function RecipeProvider({ children }: PropsWithChildren) {
  const [recipes, setRecipes] = useState<Recipe[]>(mockRecipes);

  useEffect(() => {
    let isMounted = true;

    async function hydrateRecipes() {
      const storedRecipes = await loadRecipes(mockRecipes);

      // Avoid setting state if the provider unmounts while AsyncStorage is loading.
      if (isMounted) {
        setRecipes(storedRecipes);
      }
    }

    void hydrateRecipes();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<RecipeContextValue>(
    () => ({
      recipes,
      addRecipe: (recipe) => {
        const savedRecipe = {
          ...recipe,
          id: `${recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        };
        const nextRecipes = [savedRecipe, ...recipes];

        setRecipes(nextRecipes);
        void saveRecipes(nextRecipes);

        return savedRecipe;
      },
      updateRecipe: (id, recipe) => {
        const updatedRecipe = { ...recipe, id };
        const nextRecipes = recipes.map((currentRecipe) =>
          currentRecipe.id === id ? updatedRecipe : currentRecipe,
        );

        setRecipes(nextRecipes);
        void saveRecipes(nextRecipes);

        return recipes.some((currentRecipe) => currentRecipe.id === id) ? updatedRecipe : undefined;
      },
      deleteRecipe: (id) => {
        const nextRecipes = recipes.filter((recipe) => recipe.id !== id);

        setRecipes(nextRecipes);
        void saveRecipes(nextRecipes);
      },
      getRecipe: (id) => recipes.find((recipe) => recipe.id === id),
    }),
    [recipes],
  );

  return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>;
}

export function useRecipes() {
  const context = useContext(RecipeContext);

  if (!context) {
    throw new Error('useRecipes must be used inside RecipeProvider');
  }

  return context;
}
