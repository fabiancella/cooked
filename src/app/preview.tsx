import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton, BackButton, EditableField, Header, KeyboardDoneAccessory, palette, PlaceholderImage, Screen } from '@/components/recipe-ui';
import { useRecipes } from '@/context/recipe-store';
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
const MIN_STEP_INPUT_HEIGHT = 28;

function getCleanItems(values: string[]) {
  return values
    .map((item) => item.trim())
    .filter(Boolean);
}

function isIngredientHeading(ingredient: string) {
  return /^[^:]{2,45}:$/.test(ingredient.trim());
}

function isSubIngredient(ingredients: string[], index: number) {
  for (let currentIndex = index - 1; currentIndex >= 0; currentIndex -= 1) {
    if (isIngredientHeading(ingredients[currentIndex])) {
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

export default function PreviewRecipeScreen() {
  const { id, recipe } = useLocalSearchParams<{ id?: string; recipe?: string }>();
  const { addRecipe, error, getRecipe, loading, updateRecipe } = useRecipes();
  const existingRecipe = id ? getRecipe(id) : undefined;
  const formattedRecipe = useMemo(() => parseRecipeParam(recipe), [recipe]);
  const initialRecipe = existingRecipe ?? formattedRecipe;
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(initialRecipe?.title ?? '');
  const [cookTime, setCookTime] = useState(initialRecipe?.cookTime ?? '');
  const [servings, setServings] = useState(() => getServingLabel(initialRecipe?.servings));
  const [ingredientRows, setIngredientRows] = useState(initialRecipe?.ingredients ?? []);
  const [stepRows, setStepRows] = useState(initialRecipe?.steps ?? []);
  const [stepInputHeights, setStepInputHeights] = useState<number[]>([]);

  useEffect(() => {
    if (!initialRecipe) {
      return;
    }

    setTitle(initialRecipe.title);
    setCookTime(initialRecipe.cookTime);
    setServings(getServingLabel(initialRecipe.servings));
    setIngredientRows(initialRecipe.ingredients);
    setStepRows(initialRecipe.steps);
    setStepInputHeights([]);
  }, [initialRecipe]);

  const ingredients = useMemo(() => getCleanItems(ingredientRows), [ingredientRows]);
  const steps = useMemo(() => getCleanItems(stepRows), [stepRows]);
  const validationError = useMemo(() => getValidationError(title, ingredients, steps), [ingredients, steps, title]);
  const isSaveDisabled = isSaving || Boolean(validationError);

  const addIngredientRow = () => {
    setIngredientRows((currentRows) => [...currentRows, '']);
  };

  const addIngredientSection = () => {
    setIngredientRows((currentRows) => [...currentRows, 'New section:']);
  };

  const updateIngredientRow = (index: number, value: string) => {
    setIngredientRows((currentRows) =>
      currentRows.map((ingredient, ingredientIndex) => ingredientIndex === index ? value : ingredient),
    );
  };

  const removeIngredientRow = (index: number) => {
    setIngredientRows((currentRows) => currentRows.filter((_, ingredientIndex) => ingredientIndex !== index));
  };

  const addStepRow = () => {
    setStepRows((currentRows) => [...currentRows, '']);
  };

  const updateStepRow = (index: number, value: string) => {
    setStepRows((currentRows) => currentRows.map((step, stepIndex) => stepIndex === index ? value : step));
  };

  const removeStepRow = (index: number) => {
    setStepRows((currentRows) => currentRows.filter((_, stepIndex) => stepIndex !== index));
    setStepInputHeights((currentHeights) => currentHeights.filter((_, stepIndex) => stepIndex !== index));
  };

  const updateStepInputHeight = (index: number, height: number) => {
    setStepInputHeights((currentHeights) => {
      const nextHeight = Math.max(MIN_STEP_INPUT_HEIGHT, Math.ceil(height));

      if (currentHeights[index] === nextHeight) {
        return currentHeights;
      }

      const nextHeights = [...currentHeights];
      nextHeights[index] = nextHeight;
      return nextHeights;
    });
  };

  const goBackFromPreview = () => {
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
      ingredients,
      steps,
    }) : null,
    [cookTime, ingredients, initialRecipe, servings, steps, title],
  );

  const saveRecipe = async () => {
    if (!editedRecipe || validationError) {
      return;
    }

    setIsSaving(true);
    const savedRecipe = id ? await updateRecipe(id, editedRecipe) : await addRecipe(editedRecipe);
    setIsSaving(false);

    if (!savedRecipe) {
      return;
    }

    router.replace({ pathname: '/recipe/[id]', params: { id: savedRecipe.id } });
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
    <>
      <Screen>
        <BackButton onPress={goBackFromPreview} />
        <Header
          eyebrow={id ? 'Edit recipe' : 'Preview'}
          title={id ? 'Update recipe' : 'Formatted recipe'}
          subtitle="Review the formatted fields before saving."
        />
        <PlaceholderImage color={initialRecipe.color} />

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
              const isHeading = isIngredientHeading(ingredient);
              const isNested = !isHeading && isSubIngredient(ingredientRows, index);

              return (
                <View
                  key={`ingredient-${index}`}
                  style={[
                    styles.ingredientRow,
                    isHeading && styles.ingredientHeadingRow,
                    isNested && styles.subIngredientRow,
                  ]}>
                  {isHeading ? (
                    <View style={styles.headingMarker}>
                      <SymbolView name={{ ios: 'list.bullet.indent', android: 'format_indent_increase', web: 'format_indent_increase' }} size={18} tintColor={palette.herb} />
                    </View>
                  ) : (
                    <View style={styles.checkButton} />
                  )}
                  <TextInput
                    value={ingredient}
                    onChangeText={(value) => updateIngredientRow(index, value)}
                    placeholder={isHeading ? 'Section name:' : 'Ingredient'}
                    placeholderTextColor={palette.muted}
                    style={[
                      styles.input,
                      styles.rowInput,
                      isHeading && styles.ingredientHeadingInput,
                      isNested && styles.subIngredientInput,
                    ]}
                  />
                  <Pressable
                    accessibilityLabel="Remove ingredient"
                    onPress={() => removeIngredientRow(index)}
                    style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
                    <SymbolView name={{ ios: 'minus.circle', android: 'remove_circle_outline', web: 'remove_circle_outline' }} size={22} tintColor={palette.tomato} />
                  </Pressable>
                </View>
              );
            })}
            <Pressable onPress={addIngredientRow} style={({ pressed }) => [styles.addRowButton, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }} size={20} tintColor={palette.herb} />
              <Text style={styles.addRowText}>Add ingredient</Text>
            </Pressable>
            <Pressable onPress={addIngredientSection} style={({ pressed }) => [styles.addRowButton, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'folder.badge.plus', android: 'create_new_folder', web: 'create_new_folder' }} size={20} tintColor={palette.herb} />
              <Text style={styles.addRowText}>Add section</Text>
            </Pressable>
          </View>
        </EditableField>
        <EditableField label="Steps">
          <View style={styles.editorList}>
            {stepRows.map((step, index) => (
              <View key={`step-${index}`} style={styles.stepEditorRow}>
                <Text style={styles.stepEditorNumber}>{index + 1}</Text>
                <TextInput
                  value={step}
                  onChangeText={(value) => updateStepRow(index, value)}
                  onContentSizeChange={(event) => updateStepInputHeight(index, event.nativeEvent.contentSize.height)}
                  multiline
                  textAlignVertical="top"
                  placeholder="Recipe step"
                  placeholderTextColor={palette.muted}
                  style={[
                    styles.input,
                    styles.stepInput,
                    { height: stepInputHeights[index] ?? MIN_STEP_INPUT_HEIGHT },
                  ]}
                />
                <Pressable
                  accessibilityLabel="Remove step"
                  onPress={() => removeStepRow(index)}
                  style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
                  <SymbolView name={{ ios: 'minus.circle', android: 'remove_circle_outline', web: 'remove_circle_outline' }} size={22} tintColor={palette.tomato} />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={addStepRow} style={({ pressed }) => [styles.addRowButton, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }} size={20} tintColor={palette.herb} />
              <Text style={styles.addRowText}>Add step</Text>
            </Pressable>
          </View>
        </EditableField>

        <View style={styles.actions}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
          <AppButton
            disabled={isSaveDisabled}
            onPress={saveRecipe}
            icon={{ ios: 'checkmark', android: 'check', web: 'check' }}>
            {isSaving ? (id ? 'Updating...' : 'Saving...') : id ? 'Update Recipe' : 'Save Recipe'}
          </AppButton>
          <AppButton variant="danger" onPress={goBackFromPreview}>
            Cancel
          </AppButton>
        </View>
      </Screen>
      <KeyboardDoneAccessory />
    </>
  );
}

const styles = StyleSheet.create({
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
  editorList: {
    gap: 12,
  },
  ingredientRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ingredientHeadingRow: {
    marginTop: 4,
  },
  subIngredientRow: {
    paddingLeft: 28,
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
    backgroundColor: 'rgba(42, 33, 24, 0.38)',
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
