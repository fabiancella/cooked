import { router, useLocalSearchParams } from 'expo-router';
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

import { AppButton, EditableField, Header, palette, PlaceholderImage, Screen } from '@/components/recipe-ui';
import { useRecipes } from '@/context/recipe-store';
import { formattedMockRecipe, Recipe } from '@/data/mock-recipes';

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
  const { addRecipe, error, getRecipe, updateRecipe } = useRecipes();
  const existingRecipe = id ? getRecipe(id) : undefined;
  const formattedRecipe = useMemo(() => parseRecipeParam(recipe), [recipe]);
  const initialRecipe = existingRecipe ?? formattedRecipe ?? formattedMockRecipe;
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(initialRecipe.title);
  const [cookTime, setCookTime] = useState(initialRecipe.cookTime);
  const [servings, setServings] = useState(initialRecipe.servings);
  const [ingredientsText, setIngredientsText] = useState(initialRecipe.ingredients.join('\n'));
  const [stepsText, setStepsText] = useState(initialRecipe.steps.join('\n'));

  const editedRecipe = useMemo(
    () => ({
      ...initialRecipe,
      title: title.trim() || 'Untitled Recipe',
      cookTime: cookTime.trim() || 'Cook time TBD',
      servings: servings.trim() || 'Servings TBD',
      ingredients: ingredientsText
        .split('\n')
        .map((ingredient) => ingredient.trim())
        .filter(Boolean),
      steps: stepsText
        .split('\n')
        .map((step) => step.trim())
        .filter(Boolean),
    }),
    [cookTime, ingredientsText, initialRecipe, servings, stepsText, title],
  );

  const saveRecipe = async () => {
    setIsSaving(true);
    const savedRecipe = id ? await updateRecipe(id, editedRecipe) : await addRecipe(editedRecipe);
    setIsSaving(false);

    if (!savedRecipe) {
      return;
    }

    router.replace({ pathname: '/recipe/[id]', params: { id: savedRecipe.id } });
  };

  return (
    <Screen>
      <Header
        eyebrow={id ? 'Edit recipe' : 'Preview'}
        title={id ? 'Update recipe' : 'Formatted recipe'}
        subtitle="Adjust the mock formatted fields before saving."
      />
      <PlaceholderImage color={initialRecipe.color} />

      <EditableField label="Title">
        <TextInput value={title} onChangeText={setTitle} style={styles.input} />
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
        <TextInput
          value={ingredientsText}
          onChangeText={setIngredientsText}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.multiInput]}
        />
      </EditableField>
      <EditableField label="Steps">
        <TextInput
          value={stepsText}
          onChangeText={setStepsText}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.multiInput]}
        />
      </EditableField>

      <View style={styles.actions}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <AppButton disabled={isSaving} onPress={saveRecipe} icon={{ ios: 'checkmark', android: 'check', web: 'check' }}>
          {isSaving ? (id ? 'Updating...' : 'Saving...') : id ? 'Update Recipe' : 'Save Recipe'}
        </AppButton>
        <AppButton variant="danger" onPress={() => router.back()}>
          Cancel
        </AppButton>
      </View>
    </Screen>
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
  multiInput: {
    minHeight: 120,
  },
  actions: {
    gap: 10,
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    borderRadius: 14,
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
