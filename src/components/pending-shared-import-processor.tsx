import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/components/recipe-ui';
import { useRecipes } from '@/context/recipe-store';
import { clearPendingSharedImport, getPendingSharedImport } from '@/lib/pending-shared-import';
import { formatRecipeInput, isHttpUrl } from '@/lib/recipe-formatting';

const AUTO_IMPORT_FAILED_ERROR =
  'Could not import this link automatically. Open the post and copy the caption or recipe text to finish.';

export function PendingSharedImportProcessor() {
  const { addRecipe } = useRecipes();
  const isProcessing = useRef(false);
  const [isImporting, setIsImporting] = useState(false);

  const processPendingImport = useCallback(async () => {
    if (isProcessing.current) {
      return;
    }

    const pendingImport = getPendingSharedImport();

    if (!pendingImport) {
      return;
    }

    isProcessing.current = true;
    setIsImporting(true);
    clearPendingSharedImport();

    const isPendingImportUrl = isHttpUrl(pendingImport);

    try {
      const importMode = isPendingImportUrl ? 'shared-url' : 'paste';
      console.log(`[CookedShare] formatting pending import with mode: ${importMode}`);

      const formattedRecipe = await formatRecipeInput(pendingImport, importMode);

      console.log('[CookedShare] saving pending import recipe');
      const savedRecipe = await addRecipe(formattedRecipe);

      if (!savedRecipe) {
        throw new Error('Could not save imported recipe.');
      }

      console.log(`[CookedShare] saved pending import recipe: ${savedRecipe.id}`);
      router.replace({ pathname: '/recipe/[id]', params: { id: savedRecipe.id } });
    } catch (error) {
      const message = error instanceof Error ? error.message : AUTO_IMPORT_FAILED_ERROR;
      console.log(`[CookedShare] pending import failed: ${message}`);
      router.replace({
        pathname: '/add',
        params: {
          sharedText: isPendingImportUrl ? '' : pendingImport,
          importError: AUTO_IMPORT_FAILED_ERROR,
        },
      });
    } finally {
      setIsImporting(false);
      isProcessing.current = false;
    }
  }, [addRecipe]);

  useEffect(() => {
    void processPendingImport();
  }, [processPendingImport]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        void processPendingImport();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [processPendingImport]);

  return (
    <Modal visible={isImporting} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>Importing recipe</Text>
          <Text style={styles.subtitle}>Formatting and saving to Cooked...</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42, 33, 24, 0.34)',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 8,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 20,
    gap: 8,
  },
  title: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});
