import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/context/auth-store';
import { Recipe } from '@/data/mock-recipes';
import {
  addRecipe as addStoredRecipe,
  deleteRecipe as deleteStoredRecipe,
  loadRecipes,
  updateRecipe as updateStoredRecipe,
} from '@/data/storage';

function getRawErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return '';
}

function getRecipeErrorMessage(error: unknown, action: 'load' | 'save' | 'update' | 'delete') {
  const rawMessage = getRawErrorMessage(error).toLowerCase();
  const actionText = {
    load: 'load your recipes',
    save: 'save this recipe',
    update: 'update this recipe',
    delete: 'delete this recipe',
  }[action];

  if (rawMessage.includes('jwt') || rawMessage.includes('session') || rawMessage.includes('auth')) {
    return 'Your session expired. Log in again, then try again.';
  }

  if (rawMessage.includes('row level security') || rawMessage.includes('permission') || rawMessage.includes('policy')) {
    return `Supabase would not allow Cooked to ${actionText}. Check the recipe table RLS policies.`;
  }

  if (rawMessage.includes('network') || rawMessage.includes('fetch')) {
    return 'Could not reach Supabase. Check your connection and try again.';
  }

  if (rawMessage.includes('duplicate')) {
    return 'This recipe already exists.';
  }

  return `Could not ${actionText}. Please try again.`;
}

type RecipeContextValue = {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  refreshRecipes: () => Promise<void>;
  addRecipe: (recipe: Recipe) => Promise<Recipe | undefined>;
  updateRecipe: (id: string, recipe: Recipe) => Promise<Recipe | undefined>;
  deleteRecipe: (id: string) => Promise<boolean>;
  getRecipe: (id: string) => Recipe | undefined;
};

const RecipeContext = createContext<RecipeContextValue | null>(null);

export function RecipeProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const activeUserId = useRef<string | null>(userId);
  const refreshRequestId = useRef(0);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  activeUserId.current = userId;

  const refreshRecipesForUser = useCallback(async (nextUserId: string) => {
    const requestId = refreshRequestId.current + 1;
    refreshRequestId.current = requestId;

    setLoading(true);
    setError(null);

    try {
      const storedRecipes = await loadRecipes(nextUserId);

      if (refreshRequestId.current === requestId && activeUserId.current === nextUserId) {
        setRecipes(storedRecipes);
      }
    } catch (loadError) {
      if (refreshRequestId.current === requestId && activeUserId.current === nextUserId) {
        setError(getRecipeErrorMessage(loadError, 'load'));
        setRecipes([]);
      }
    } finally {
      if (refreshRequestId.current === requestId && activeUserId.current === nextUserId) {
        setLoading(false);
      }
    }
  }, []);

  const refreshRecipes = useCallback(async () => {
    if (!userId) {
      refreshRequestId.current += 1;
      setRecipes([]);
      setError(null);
      setLoading(false);
      return;
    }

    await refreshRecipesForUser(userId);
  }, [refreshRecipesForUser, userId]);

  useEffect(() => {
    void refreshRecipes();
  }, [refreshRecipes]);

  const value = useMemo<RecipeContextValue>(
    () => ({
      recipes,
      loading,
      error,
      refreshRecipes,
      addRecipe: async (recipe) => {
        if (!userId) {
          setError('You must be logged in to save recipes.');
          return undefined;
        }

        setError(null);

        try {
          const savedRecipe = await addStoredRecipe(recipe, userId);

          if (activeUserId.current === userId) {
            setRecipes((current) => [savedRecipe, ...current]);
          }

          await refreshRecipesForUser(userId);
          return savedRecipe;
        } catch (saveError) {
          setError(getRecipeErrorMessage(saveError, 'save'));
          return undefined;
        }
      },
      updateRecipe: async (id, recipe) => {
        setError(null);

        try {
          if (!userId) {
            setError('You must be logged in to update recipes.');
            return undefined;
          }

          const updatedRecipe = await updateStoredRecipe(id, recipe, userId);

          if (activeUserId.current === userId) {
            setRecipes((current) =>
              current.map((currentRecipe) => (currentRecipe.id === id ? updatedRecipe : currentRecipe)),
            );
          }

          await refreshRecipesForUser(userId);
          return updatedRecipe;
        } catch (updateError) {
          setError(getRecipeErrorMessage(updateError, 'update'));
          return undefined;
        }
      },
      deleteRecipe: async (id) => {
        setError(null);

        try {
          if (!userId) {
            setError('You must be logged in to delete recipes.');
            return false;
          }

          await deleteStoredRecipe(id, userId);

          if (activeUserId.current === userId) {
            setRecipes((current) => current.filter((recipe) => recipe.id !== id));
          }

          await refreshRecipesForUser(userId);
          return true;
        } catch (deleteError) {
          setError(getRecipeErrorMessage(deleteError, 'delete'));
          return false;
        }
      },
      getRecipe: (id) => recipes.find((recipe) => recipe.id === id),
    }),
    [error, loading, recipes, refreshRecipes, refreshRecipesForUser, userId],
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
