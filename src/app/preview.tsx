import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, BackButton, EditableField, Header, KeyboardDoneAccessory, RecipeImage, Screen } from '@/components/recipe-ui';
import { useAuth } from '@/context/auth-store';
import { useRecipes } from '@/context/recipe-store';
import { AppPalette, useAppTheme, useThemeStyles } from '@/context/theme-store';
import { removeCustomRecipeImage, uploadCustomRecipeImage } from '@/data/storage';
import { Recipe } from '@/data/types';

const COOK_TIME_OPTIONS = [
  'Time TBD',
  '10 min',
  '15 min',
  '20 min',
  '25 min',
  '30 min',
  '35 min',
  '40 min',
  '45 min',
  '50 min',
  '1 hr',
  '1 hr 15 min',
  '1 hr 30 min',
  '2 hr',
];

const SERVING_OPTIONS = [
  'Servings TBD',
  '1 serving',
  '2 servings',
  '3 servings',
  '4 servings',
  '5 servings',
  '6 servings',
  '8 servings',
  '10 servings',
  '12 servings',
];

const WHEEL_ROW_HEIGHT = 48;
const INGREDIENT_DRAG_ROW_HEIGHT = 56;
const STEP_DRAG_ROW_HEIGHT = 64;
const INGREDIENT_SECTION_PREFIX = '__section__:';
const STICKY_ACTION_TOP_PADDING = 12;
const STICKY_ACTION_BUTTON_HEIGHT = 52;
let nextEditorRowId = 0;

function getEditorRowId() {
  nextEditorRowId += 1;
  return `editor-row-${nextEditorRowId}`;
}

function getEditorRowIds(count: number) {
  return Array.from({ length: count }, getEditorRowId);
}

function getCleanItems(values: string[]) {
  return values
    .map((item) => {
      const trimmedItem = item.trim();

      if (!trimmedItem.startsWith(INGREDIENT_SECTION_PREFIX)) {
        return trimmedItem;
      }

      const sectionName = trimmedItem.replace(INGREDIENT_SECTION_PREFIX, '').trim();
      return sectionName ? `${sectionName}:` : '';
    })
    .filter(Boolean);
}

function isIngredientHeading(ingredient: string) {
  return /^[^:]{2,45}:$/.test(ingredient.trim());
}

function isIngredientSection(ingredient: string) {
  return ingredient.trim().startsWith(INGREDIENT_SECTION_PREFIX) || isIngredientHeading(ingredient);
}

function getIngredientInputValue(ingredient: string) {
  if (ingredient.trim().startsWith(INGREDIENT_SECTION_PREFIX)) {
    return ingredient.replace(INGREDIENT_SECTION_PREFIX, '');
  }

  return isIngredientHeading(ingredient) ? ingredient.replace(/:$/, '') : ingredient;
}

function clampIndex(value: number, max: number) {
  return Math.max(0, Math.min(value, max));
}

function moveRow<T>(rows: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) {
    return rows;
  }

  const nextRows = [...rows];
  const [movedRow] = nextRows.splice(fromIndex, 1);
  nextRows.splice(toIndex, 0, movedRow);
  return nextRows;
}

function isSubIngredient(ingredients: string[], index: number) {
  for (let currentIndex = index - 1; currentIndex >= 0; currentIndex -= 1) {
    if (isIngredientSection(ingredients[currentIndex])) {
      return true;
    }
  }

  return false;
}

function getValidationError(title: string, ingredients: string[], steps: string[]) {
  const ingredientCount = ingredients.filter((ingredient) => !isIngredientHeading(ingredient)).length;

  if (!title.trim()) {
    return 'Add a recipe title before saving.';
  }

  if (ingredientCount < 2) {
    return 'Add at least two ingredients before saving.';
  }

  if (steps.length < 2) {
    return 'Add at least two steps before saving.';
  }

  return null;
}

function getServingLabel(value?: string | null) {
  const trimmedValue = value?.trim() ?? '';

  if (!trimmedValue) {
    return 'Servings TBD';
  }

  const servingCount =
    trimmedValue.match(/^\d+$/)?.[0] ??
    trimmedValue.match(/^(\d+)\s*(?:servings?|people|persons?)\b/i)?.[1] ??
    trimmedValue.match(/\b(?:serves|servings|serving|yield|makes)\s*:?\s*(\d+)\b/i)?.[1];

  if (servingCount) {
    return servingCount === '1' ? '1 serving' : `${servingCount} servings`;
  }

  return trimmedValue;
}

function parseRecipeParam(recipeParam?: string) {
  if (!recipeParam) {
    return undefined;
  }

  try {
    return JSON.parse(recipeParam) as Recipe;
  } catch (error) {
    console.error('Error reading formatted recipe preview:', error);
    return undefined;
  }
}

function getPickerOptions(options: string[], value: string) {
  if (!value || options.includes(value)) {
    return options;
  }

  return [value, ...options];
}

function WheelPickerField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const styles = useThemeStyles(createStyles);
  const [isOpen, setIsOpen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const pickerOptions = useMemo(() => getPickerOptions(options, value), [options, value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const selectedIndex = Math.max(pickerOptions.indexOf(value), 0);
    const timeout = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: selectedIndex * WHEEL_ROW_HEIGHT,
        animated: false,
      });
    }, 50);

    return () => clearTimeout(timeout);
  }, [isOpen, pickerOptions, value]);

  return (
    <View style={styles.pickerField}>
      <EditableField label={label}>
        <Pressable onPress={() => setIsOpen(true)} style={({ pressed }) => [styles.pickerButton, pressed && styles.pressed]}>
          <Text style={styles.pickerValue}>{value}</Text>
          <Text style={styles.pickerHint}>Tap to choose</Text>
        </Pressable>

        <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>{label}</Text>
                <Pressable onPress={() => setIsOpen(false)} style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </Pressable>
              </View>

              <View style={styles.wheelFrame}>
                <View pointerEvents="none" style={styles.wheelSelection} />
                <ScrollView
                  ref={scrollViewRef}
                  snapToInterval={WHEEL_ROW_HEIGHT}
                  decelerationRate="fast"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.wheelContent}
                  onMomentumScrollEnd={(event) => {
                    const selectedIndex = Math.round(event.nativeEvent.contentOffset.y / WHEEL_ROW_HEIGHT);
                    const selectedValue = pickerOptions[selectedIndex];

                    if (selectedValue) {
                      onChange(selectedValue);
                    }
                  }}>
                  {pickerOptions.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => onChange(option)}
                      style={[styles.wheelRow, option === value && styles.wheelRowSelected]}>
                      <Text style={[styles.wheelText, option === value && styles.wheelTextSelected]}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </Modal>
      </EditableField>
    </View>
  );
}

function DragHandle({
  index,
  onDragEnd,
  onDragMove,
  onDragStart,
  style,
}: {
  index: number;
  onDragEnd: (index: number, y: number) => void;
  onDragMove: (index: number, y: number) => void;
  onDragStart: (index: number) => void;
  style?: View['props']['style'];
}) {
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const indexRef = useRef(index);
  const onDragEndRef = useRef(onDragEnd);
  const onDragMoveRef = useRef(onDragMove);
  const onDragStartRef = useRef(onDragStart);
  indexRef.current = index;
  onDragEndRef.current = onDragEnd;
  onDragMoveRef.current = onDragMove;
  onDragStartRef.current = onDragStart;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => onDragStartRef.current(indexRef.current),
      onPanResponderMove: (_, gestureState) => onDragMoveRef.current(indexRef.current, gestureState.dy),
      onPanResponderRelease: (_, gestureState) => onDragEndRef.current(indexRef.current, gestureState.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => onDragEndRef.current(indexRef.current, 0),
    }),
  ).current;

  return (
    <View style={[styles.dragHandle, style]} {...panResponder.panHandlers}>
      <SymbolView name={{ ios: 'line.3.horizontal', android: 'drag_handle', web: 'drag_handle' }} size={18} tintColor={colors.muted} />
    </View>
  );
}

export default function PreviewRecipeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { user } = useAuth();
  const { id, recipe } = useLocalSearchParams<{ id?: string; recipe?: string }>();
  const { addRecipe, error, getRecipe, loading, updateRecipe } = useRecipes();
  const existingRecipe = id ? getRecipe(id) : undefined;
  const formattedRecipe = useMemo(() => parseRecipeParam(recipe), [recipe]);
  const initialRecipe = existingRecipe ?? formattedRecipe;
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(initialRecipe?.title ?? '');
  const [customImageUrl, setCustomImageUrl] = useState(initialRecipe?.customImageUrl ?? null);
  const [pendingCustomImage, setPendingCustomImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [cookTime, setCookTime] = useState(initialRecipe?.cookTime ?? '');
  const [servings, setServings] = useState(() => getServingLabel(initialRecipe?.servings));
  const [ingredientRows, setIngredientRows] = useState(initialRecipe?.ingredients ?? []);
  const [ingredientRowIds, setIngredientRowIds] = useState(() => getEditorRowIds(initialRecipe?.ingredients.length ?? 0));
  const [stepRows, setStepRows] = useState(initialRecipe?.steps ?? []);
  const [stepRowIds, setStepRowIds] = useState(() => getEditorRowIds(initialRecipe?.steps.length ?? 0));
  const [dragState, setDragState] = useState<{ type: 'ingredient' | 'step'; startIndex: number; index: number } | null>(null);

  useEffect(() => {
    if (!initialRecipe) {
      return;
    }

    setTitle(initialRecipe.title);
    setCustomImageUrl(initialRecipe.customImageUrl ?? null);
    setPendingCustomImage(null);
    setImageError(null);
    setCookTime(initialRecipe.cookTime);
    setServings(getServingLabel(initialRecipe.servings));
    setIngredientRows(initialRecipe.ingredients);
    setIngredientRowIds(getEditorRowIds(initialRecipe.ingredients.length));
    setStepRows(initialRecipe.steps);
    setStepRowIds(getEditorRowIds(initialRecipe.steps.length));
  }, [initialRecipe]);

  const ingredients = useMemo(() => getCleanItems(ingredientRows), [ingredientRows]);
  const steps = useMemo(() => getCleanItems(stepRows), [stepRows]);
  const validationError = useMemo(() => getValidationError(title, ingredients, steps), [ingredients, steps, title]);
  const isSaveDisabled = isSaving || Boolean(validationError);
  const stickyActionBottomPadding = Math.max(insets.bottom, 12);
  const stickyActionHeight = STICKY_ACTION_TOP_PADDING + STICKY_ACTION_BUTTON_HEIGHT + stickyActionBottomPadding;

  const chooseCustomImage = async () => {
    setImageError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to choose a custom recipe thumbnail.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });

    if (result.canceled) {
      return;
    }

    const selectedImage = result.assets[0];
    setPendingCustomImage(selectedImage);
    setCustomImageUrl(selectedImage.uri);
  };

  const revertToDefaultImage = () => {
    setPendingCustomImage(null);
    setCustomImageUrl(null);
    setImageError(null);
  };

  const confirmRevertToDefaultImage = () => {
    Alert.alert(
      'Revert thumbnail?',
      'This will remove your custom thumbnail and restore the original recipe image when you save.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revert', style: 'destructive', onPress: revertToDefaultImage },
      ],
    );
  };

  const addIngredientRow = () => {
    setIngredientRows((currentRows) => [...currentRows, '']);
    setIngredientRowIds((currentIds) => [...currentIds, getEditorRowId()]);
  };

  const addIngredientSection = () => {
    setIngredientRows((currentRows) => [...currentRows, INGREDIENT_SECTION_PREFIX]);
    setIngredientRowIds((currentIds) => [...currentIds, getEditorRowId()]);
  };

  const updateIngredientRow = (index: number, value: string) => {
    setIngredientRows((currentRows) =>
      currentRows.map((ingredient, ingredientIndex) => {
        if (ingredientIndex !== index) {
          return ingredient;
        }

        if (isIngredientSection(ingredient)) {
          return `${INGREDIENT_SECTION_PREFIX}${value.replace(/:$/, '')}`;
        }

        return value;
      }),
    );
  };

  const removeIngredientRow = (index: number) => {
    setIngredientRows((currentRows) => currentRows.filter((_, ingredientIndex) => ingredientIndex !== index));
    setIngredientRowIds((currentIds) => currentIds.filter((_, ingredientIndex) => ingredientIndex !== index));
  };

  const removeIngredientSection = (index: number) => {
    let deleteUntilIndex = ingredientRows.findIndex(
      (ingredient, ingredientIndex) => ingredientIndex > index && isIngredientSection(ingredient),
    );
    deleteUntilIndex = deleteUntilIndex === -1 ? ingredientRows.length : deleteUntilIndex;

    setIngredientRows((currentRows) => {
      return currentRows.filter((_, ingredientIndex) => ingredientIndex < index || ingredientIndex >= deleteUntilIndex);
    });
    setIngredientRowIds((currentIds) =>
      currentIds.filter((_, ingredientIndex) => ingredientIndex < index || ingredientIndex >= deleteUntilIndex),
    );
  };

  const confirmRemoveIngredientRow = (index: number) => {
    if (!isIngredientSection(ingredientRows[index])) {
      removeIngredientRow(index);
      return;
    }

    if (Platform.OS === 'web') {
      removeIngredientSection(index);
      return;
    }

    Alert.alert(
      'Delete section?',
      'This will delete the entire section and it\'s ingredients.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeIngredientSection(index) },
      ],
    );
  };

  const addStepRow = () => {
    setStepRows((currentRows) => [...currentRows, '']);
    setStepRowIds((currentIds) => [...currentIds, getEditorRowId()]);
  };

  const updateStepRow = (index: number, value: string) => {
    setStepRows((currentRows) => currentRows.map((step, stepIndex) => stepIndex === index ? value : step));
  };

  const removeStepRow = (index: number) => {
    setStepRows((currentRows) => currentRows.filter((_, stepIndex) => stepIndex !== index));
    setStepRowIds((currentIds) => currentIds.filter((_, stepIndex) => stepIndex !== index));
  };

  const startIngredientDrag = (index: number) => {
    setDragState({ type: 'ingredient', startIndex: index, index });
  };

  const moveIngredientDrag = (_index: number, y: number) => {
    setDragState((currentDragState) => {
      if (!currentDragState || currentDragState.type !== 'ingredient') {
        return currentDragState;
      }

      const targetIndex = clampIndex(
        currentDragState.startIndex + Math.round(y / INGREDIENT_DRAG_ROW_HEIGHT),
        ingredientRows.length - 1,
      );

      if (targetIndex === currentDragState.index) {
        return currentDragState;
      }

      setIngredientRows((currentRows) => moveRow(currentRows, currentDragState.index, targetIndex));
      setIngredientRowIds((currentIds) => moveRow(currentIds, currentDragState.index, targetIndex));
      return { ...currentDragState, index: targetIndex };
    });
  };

  const finishIngredientDrag = () => {
    setDragState(null);
  };

  const startStepDrag = (index: number) => {
    setDragState({ type: 'step', startIndex: index, index });
  };

  const moveStepDrag = (_index: number, y: number) => {
    setDragState((currentDragState) => {
      if (!currentDragState || currentDragState.type !== 'step') {
        return currentDragState;
      }

      const targetIndex = clampIndex(
        currentDragState.startIndex + Math.round(y / STEP_DRAG_ROW_HEIGHT),
        stepRows.length - 1,
      );

      if (targetIndex === currentDragState.index) {
        return currentDragState;
      }

      setStepRows((currentRows) => moveRow(currentRows, currentDragState.index, targetIndex));
      setStepRowIds((currentIds) => moveRow(currentIds, currentDragState.index, targetIndex));
      return { ...currentDragState, index: targetIndex };
    });
  };

  const finishStepDrag = () => {
    setDragState(null);
  };

  const goBackFromPreview = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (id) {
      router.dismissTo({ pathname: '/recipe/[id]', params: { id } });
      return;
    }

    router.dismissTo('/add');
  };

  const editedRecipe = useMemo(
    () => initialRecipe ? ({
      ...initialRecipe,
      title: title.trim(),
      cookTime: cookTime.trim() || 'Cook time TBD',
      servings: getServingLabel(servings),
      customImageUrl,
      ingredients,
      steps,
    }) : null,
    [cookTime, customImageUrl, ingredients, initialRecipe, servings, steps, title],
  );

  const saveRecipe = async () => {
    if (!editedRecipe || validationError) {
      return;
    }

    setIsSaving(true);
    setImageError(null);
    let uploadedImageUrl: string | null = null;

    try {
      if (pendingCustomImage) {
        if (!user) {
          setImageError('Log in again before uploading a custom thumbnail.');
          return;
        }

        uploadedImageUrl = await uploadCustomRecipeImage(
          pendingCustomImage.uri,
          pendingCustomImage.mimeType,
          user.id,
        );
      }

      const recipeToSave = {
        ...editedRecipe,
        customImageUrl: uploadedImageUrl ?? customImageUrl,
      };
      const savedRecipe = id ? await updateRecipe(id, recipeToSave) : await addRecipe(recipeToSave);

      if (!savedRecipe) {
        if (uploadedImageUrl && user) {
          await removeCustomRecipeImage(uploadedImageUrl, user.id);
        }
        return;
      }

      const previousCustomImageUrl = initialRecipe?.customImageUrl;

      if (previousCustomImageUrl && previousCustomImageUrl !== savedRecipe.customImageUrl && user) {
        void removeCustomRecipeImage(previousCustomImageUrl, user.id).catch((cleanupError) => {
          console.error('Could not remove the previous custom recipe image:', cleanupError);
        });
      }

      router.replace({ pathname: '/recipe/[id]', params: { id: savedRecipe.id } });
    } catch (uploadError) {
      if (uploadedImageUrl && user) {
        await removeCustomRecipeImage(uploadedImageUrl, user.id).catch(() => undefined);
      }

      console.error('Could not save custom recipe image:', uploadError);
      setImageError('Could not upload the custom thumbnail. Please try another image.');
    } finally {
      setIsSaving(false);
    }
  };

  if (id && loading && !existingRecipe) {
    return (
      <Screen>
        <BackButton onPress={goBackFromPreview} />
        <Header title="Loading recipe" subtitle="Fetching the recipe before editing." />
      </Screen>
    );
  }

  if (!initialRecipe) {
    return (
      <Screen>
        <BackButton onPress={goBackFromPreview} />
        <Header
          eyebrow="Preview"
          title="Preview unavailable"
          subtitle="Format a recipe first, or open an existing saved recipe to edit it."
        />
        <View style={styles.actions}>
          <AppButton onPress={() => router.replace('/add')} icon={{ ios: 'plus', android: 'add', web: 'add' }}>
            Add Recipe
          </AppButton>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.screen}>
      <Screen scrollEnabled={dragState === null} bottomPadding={stickyActionHeight + 32}>
        <BackButton onPress={goBackFromPreview} />
        <Header
          eyebrow={id ? 'Edit recipe' : 'Preview'}
          title={id ? 'Update recipe' : 'Formatted recipe'}
          subtitle="Review the formatted fields before saving."
        />
        <RecipeImage recipe={editedRecipe ?? initialRecipe} />
        <View style={styles.imageActions}>
          <AppButton
            variant="secondary"
            onPress={chooseCustomImage}
            icon={{ ios: 'photo.badge.plus', android: 'add_photo_alternate', web: 'add_photo_alternate' }}>
            {customImageUrl ? 'Change custom thumbnail' : 'Choose custom thumbnail'}
          </AppButton>
          {customImageUrl ? (
            <AppButton
              variant="ghost"
              onPress={confirmRevertToDefaultImage}
              icon={{ ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' }}>
              Revert to default thumbnail
            </AppButton>
          ) : null}
          {imageError ? <Text style={styles.errorText}>{imageError}</Text> : null}
        </View>

        <EditableField compact label="Title">
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={[styles.input, styles.titleInput]}
          />
        </EditableField>
        <View style={styles.twoColumn}>
          <WheelPickerField
            label="Cook time"
            value={cookTime}
            options={COOK_TIME_OPTIONS}
            onChange={setCookTime}
          />
          <WheelPickerField
            label="Servings"
            value={servings}
            options={SERVING_OPTIONS}
            onChange={setServings}
          />
        </View>
        <EditableField label="Ingredients">
          <View style={styles.editorList}>
            {ingredientRows.map((ingredient, index) => {
              const isHeading = isIngredientSection(ingredient);
              const isNested = !isHeading && isSubIngredient(ingredientRows, index);
              const isDragging = dragState?.type === 'ingredient' && dragState.index === index;

              return (
                <View
                  key={ingredientRowIds[index]}
                  style={[
                    styles.ingredientRow,
                    isHeading && styles.ingredientHeadingRow,
                    isNested && styles.subIngredientRow,
                    isDragging && styles.draggingRow,
                  ]}>
                  <DragHandle
                    index={index}
                    onDragEnd={finishIngredientDrag}
                    onDragMove={moveIngredientDrag}
                    onDragStart={startIngredientDrag}
                    style={styles.ingredientDragHandle}
                  />
                  {isHeading ? (
                    <View style={styles.headingMarker}>
                      <SymbolView name={{ ios: 'list.bullet.indent', android: 'format_indent_increase', web: 'format_indent_increase' }} size={18} tintColor={colors.herb} />
                    </View>
                  ) : (
                    <View style={styles.checkButton} />
                  )}
                  <TextInput
                    value={getIngredientInputValue(ingredient)}
                    onChangeText={(value) => updateIngredientRow(index, value)}
                    placeholder={isHeading ? 'Section name' : 'Ingredient'}
                    placeholderTextColor={colors.muted}
                    style={[
                      styles.input,
                      styles.rowInput,
                      isHeading && styles.ingredientHeadingInput,
                      isNested && styles.subIngredientInput,
                    ]}
                  />
                  <Pressable
                    accessibilityLabel="Remove ingredient"
                    onPress={() => confirmRemoveIngredientRow(index)}
                    style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
                    <SymbolView name={{ ios: 'minus.circle', android: 'remove_circle_outline', web: 'remove_circle_outline' }} size={22} tintColor={colors.tomato} />
                  </Pressable>
                </View>
              );
            })}
            <Pressable onPress={addIngredientRow} style={({ pressed }) => [styles.addRowButton, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }} size={20} tintColor={colors.herb} />
              <Text style={styles.addRowText}>Add ingredient</Text>
            </Pressable>
            <Pressable onPress={addIngredientSection} style={({ pressed }) => [styles.addRowButton, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'folder.badge.plus', android: 'create_new_folder', web: 'create_new_folder' }} size={20} tintColor={colors.herb} />
              <Text style={styles.addRowText}>Add Section</Text>
            </Pressable>
          </View>
        </EditableField>
        <EditableField label="Steps">
          <View style={styles.editorList}>
            {stepRows.map((step, index) => {
              const isDragging = dragState?.type === 'step' && dragState.index === index;

              return (
                <View
                  key={stepRowIds[index]}
                  style={[
                    styles.stepEditorRow,
                    isDragging && styles.draggingRow,
                  ]}>
                  <DragHandle
                    index={index}
                    onDragEnd={finishStepDrag}
                    onDragMove={moveStepDrag}
                    onDragStart={startStepDrag}
                  />
                  <Text style={styles.stepEditorNumber}>{index + 1}</Text>
                  <TextInput
                    value={step}
                    onChangeText={(value) => updateStepRow(index, value)}
                    multiline
                    scrollEnabled={false}
                    textAlignVertical="top"
                    placeholder="Recipe step"
                    placeholderTextColor={colors.muted}
                    style={[styles.input, styles.stepInput]}
                  />
                  <Pressable
                    accessibilityLabel="Remove step"
                    onPress={() => removeStepRow(index)}
                    style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
                    <SymbolView name={{ ios: 'minus.circle', android: 'remove_circle_outline', web: 'remove_circle_outline' }} size={22} tintColor={colors.tomato} />
                  </Pressable>
                </View>
              );
            })}
            <Pressable onPress={addStepRow} style={({ pressed }) => [styles.addRowButton, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }} size={20} tintColor={colors.herb} />
              <Text style={styles.addRowText}>Add step</Text>
            </Pressable>
          </View>
        </EditableField>

        <View style={styles.actions}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
          <AppButton variant="danger" onPress={goBackFromPreview}>
            Cancel
          </AppButton>
        </View>
      </Screen>

      <View style={[styles.stickyActionBar, { paddingBottom: stickyActionBottomPadding }]}>
        <View style={styles.stickyActionContent}>
          <AppButton
            disabled={isSaveDisabled}
            onPress={saveRecipe}
            icon={{ ios: 'checkmark', android: 'check', web: 'check' }}>
            {isSaving ? (id ? 'Updating...' : 'Saving...') : id ? 'Update Recipe' : 'Save Recipe'}
          </AppButton>
        </View>
      </View>
      <KeyboardDoneAccessory />
    </View>
  );
}

const createStyles = (palette: AppPalette) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    color: palette.ink,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    padding: 0,
  },
  titleInput: {
    minHeight: 28,
  },
  actions: {
    gap: 10,
  },
  imageActions: {
    gap: 8,
  },
  stickyActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    backgroundColor: palette.cream,
    paddingTop: STICKY_ACTION_TOP_PADDING,
  },
  stickyActionContent: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  editorList: {
    gap: 12,
  },
  ingredientRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  draggingRow: {
    zIndex: 10,
    opacity: 0.88,
  },
  dragHandle: {
    width: 28,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientDragHandle: {
    marginTop: 2,
  },
  ingredientHeadingRow: {
    marginTop: 4,
  },
  subIngredientRow: {
    paddingLeft: 24,
  },
  headingMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInput: {
    flex: 1,
    minHeight: 36,
  },
  ingredientHeadingInput: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  subIngredientInput: {
    color: palette.muted,
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRowButton: {
    minHeight: 40,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addRowText: {
    color: palette.herb,
    fontSize: 15,
    fontWeight: '800',
  },
  stepEditorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepEditorNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: palette.sage,
    color: palette.herb,
    fontSize: 14,
    lineHeight: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  stepInput: {
    flex: 1,
    minHeight: 28,
  },
  errorText: {
    color: palette.tomato,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  pickerField: {
    flex: 1,
  },
  pickerButton: {
    gap: 4,
  },
  pickerValue: {
    color: palette.ink,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '800',
  },
  pickerHint: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: palette.overlay,
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: palette.paper,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  doneButton: {
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: palette.sage,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  doneButtonText: {
    color: palette.herb,
    fontSize: 15,
    fontWeight: '900',
  },
  wheelFrame: {
    height: WHEEL_ROW_HEIGHT * 5,
    overflow: 'hidden',
  },
  wheelSelection: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WHEEL_ROW_HEIGHT * 2,
    height: WHEEL_ROW_HEIGHT,
    borderRadius: 16,
    backgroundColor: palette.sage,
  },
  wheelContent: {
    paddingVertical: WHEEL_ROW_HEIGHT * 2,
  },
  wheelRow: {
    height: WHEEL_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelRowSelected: {
    opacity: 1,
  },
  wheelText: {
    color: palette.muted,
    fontSize: 18,
    fontWeight: '700',
  },
  wheelTextSelected: {
    color: palette.herb,
    fontSize: 22,
    fontWeight: '900',
  },
});
