import { formatQuantity } from 'format-quantity';
import { numericQuantity } from 'numeric-quantity';
import { parseIngredient, unitsOfMeasure } from 'parse-ingredient';

const VULGAR_FRACTIONS = '¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞';
const QUANTITY_PATTERN = new RegExp(
  `\\d+[${VULGAR_FRACTIONS}]|[${VULGAR_FRACTIONS}]|\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?`,
  'g',
);

type QuantityMatch = {
  index: number;
  text: string;
};

type TextReplacement = {
  index: number;
  originalText: string;
  replacementText: string;
};

function getQuantityMatches(value: string) {
  return [...value.matchAll(QUANTITY_PATTERN)].map<QuantityMatch>((match) => ({
    index: match.index,
    text: match[0],
  }));
}

function matchesQuantity(value: string, expected: number) {
  const parsedValue = numericQuantity(value);
  return typeof parsedValue === 'number' && Math.abs(parsedValue - expected) < 0.01;
}

function getScaledQuantity(quantity: number, multiplier: number) {
  return formatQuantity(quantity * multiplier) ?? String(quantity * multiplier);
}

function getScaledUnit(
  unitId: string | null,
  originalUnit: string | null,
  scaledQuantity: number,
) {
  if (!unitId || !originalUnit) {
    return originalUnit;
  }

  const unit = unitsOfMeasure[unitId];

  if (!unit) {
    return originalUnit;
  }

  const normalizedOriginalUnit = originalUnit.toLowerCase();
  const usesFullUnitName = normalizedOriginalUnit === unitId.toLowerCase() || normalizedOriginalUnit === unit.plural.toLowerCase();

  if (!usesFullUnitName) {
    return originalUnit;
  }

  return scaledQuantity === 1 ? unitId : unit.plural;
}

export function getServingCount(value?: string | null) {
  const quantity = getQuantityMatches(value?.trim() ?? '')[0];

  if (!quantity) {
    return null;
  }

  const parsedValue = numericQuantity(quantity.text);

  if (typeof parsedValue !== 'number' || !Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return Math.round(parsedValue);
}

export function getScaledServingLabel(originalLabel: string, servingCount: number) {
  const quantity = getQuantityMatches(originalLabel)[0];

  if (!quantity) {
    return servingCount === 1 ? '1 serving' : `${servingCount} servings`;
  }

  const beforeQuantity = originalLabel.slice(0, quantity.index);
  const afterQuantity = originalLabel.slice(quantity.index + quantity.text.length);
  const scaledLabel = `${beforeQuantity}${servingCount}${afterQuantity}`;

  if (servingCount === 1) {
    return scaledLabel.replace(/\bservings\b/i, 'serving');
  }

  return scaledLabel.replace(/\bserving\b/i, 'servings');
}

export function scaleIngredient(ingredient: string, multiplier: number) {
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier === 1) {
    return ingredient;
  }

  const parsedIngredient = parseIngredient(ingredient)[0];

  if (!parsedIngredient || parsedIngredient.isGroupHeader || parsedIngredient.quantity === null) {
    return ingredient;
  }

  const matches = getQuantityMatches(ingredient);
  const firstQuantityIndex = matches.findIndex((match) => matchesQuantity(match.text, parsedIngredient.quantity!));

  if (firstQuantityIndex === -1) {
    return ingredient;
  }

  const quantityReplacements: TextReplacement[] = [
    {
      index: matches[firstQuantityIndex].index,
      originalText: matches[firstQuantityIndex].text,
      replacementText: getScaledQuantity(parsedIngredient.quantity, multiplier),
    },
  ];

  if (parsedIngredient.quantity2 !== null) {
    const secondQuantity = matches
      .slice(firstQuantityIndex + 1)
      .find((match) => matchesQuantity(match.text, parsedIngredient.quantity2!));

    if (secondQuantity) {
      quantityReplacements.push({
        index: secondQuantity.index,
        originalText: secondQuantity.text,
        replacementText: getScaledQuantity(parsedIngredient.quantity2, multiplier),
      });
    }
  }

  const replacements = [...quantityReplacements];
  const scaledUnitQuantity = (parsedIngredient.quantity2 ?? parsedIngredient.quantity) * multiplier;
  const scaledUnit = getScaledUnit(
    parsedIngredient.unitOfMeasureID,
    parsedIngredient.unitOfMeasure,
    scaledUnitQuantity,
  );

  if (parsedIngredient.unitOfMeasure && scaledUnit && scaledUnit !== parsedIngredient.unitOfMeasure) {
    const unitIndex = ingredient.indexOf(parsedIngredient.unitOfMeasure, matches[firstQuantityIndex].index);

    if (unitIndex >= 0) {
      replacements.push({
        index: unitIndex,
        originalText: parsedIngredient.unitOfMeasure,
        replacementText: scaledUnit,
      });
    }
  }

  return replacements
    .sort((first, second) => second.index - first.index)
    .reduce((scaledIngredient, replacement) => {
      const beforeText = scaledIngredient.slice(0, replacement.index);
      const afterText = scaledIngredient.slice(replacement.index + replacement.originalText.length);
      return `${beforeText}${replacement.replacementText}${afterText}`;
    }, ingredient);
}

export function scaleIngredients(ingredients: string[], originalServings: number, selectedServings: number) {
  if (originalServings <= 0 || selectedServings <= 0) {
    return ingredients;
  }

  const multiplier = selectedServings / originalServings;
  return ingredients.map((ingredient) => scaleIngredient(ingredient, multiplier));
}
