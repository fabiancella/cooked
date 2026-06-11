import { Recipe } from '@/data/mock-recipes';

const MAIN_INGREDIENTS = [
  { match: /\bchicken\b/i, title: 'Chicken' },
  { match: /\bpasta\b|\brigatoni\b|\bspaghetti\b|\bpenne\b|\blinguine\b|\bfettuccine\b/i, title: 'Pasta' },
  { match: /\bsalmon\b/i, title: 'Salmon' },
  { match: /\bshrimp\b|\bprawn\b/i, title: 'Shrimp' },
  { match: /\bbeef\b|\bsteak\b/i, title: 'Beef' },
  { match: /\bpork\b|\bbacon\b/i, title: 'Pork' },
  { match: /\bturkey\b/i, title: 'Turkey' },
  { match: /\btofu\b/i, title: 'Tofu' },
  { match: /\bchickpea\b|\bchickpeas\b/i, title: 'Chickpea' },
  { match: /\blentil\b|\blentils\b/i, title: 'Lentil' },
  { match: /\brice\b/i, title: 'Rice' },
  { match: /\bnoodle\b|\bnoodles\b/i, title: 'Noodle' },
  { match: /\bpotato\b|\bpotatoes\b/i, title: 'Potato' },
  { match: /\bmushroom\b|\bmushrooms\b/i, title: 'Mushroom' },
  { match: /\btomato\b|\btomatoes\b/i, title: 'Tomato' },
  { match: /\blemon\b/i, title: 'Lemon' },
  { match: /\bspinach\b/i, title: 'Spinach' },
  { match: /\bbroccoli\b/i, title: 'Broccoli' },
  { match: /\begg\b|\beggs\b/i, title: 'Egg' },
];

const INGREDIENT_LINE_PATTERN =
  /^[-*•]\s+|^(\d+\/\d+|\d+(\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\s+|\b(cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|grams?|kg|ml|l|cloves?|cans?|pinch|handful|bunch|slices?)\b/i;

const STEP_VERBS =
  /\b(add|bake|boil|broil|chop|combine|cook|drain|fold|fry|grill|heat|mix|pour|preheat|roast|saute|sauté|season|sear|serve|simmer|stir|toss|whisk)\b/i;

function getSourceLabel(text: string) {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('tiktok.com')) {
    return 'TikTok';
  }

  if (lowerText.includes('instagram.com') || lowerText.includes('instagr.am')) {
    return 'Instagram';
  }

  return 'Pasted text';
}

function getLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function cleanLine(line: string) {
  return line
    .replace(/^[-*•]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim();
}

function isSectionTitle(line: string, section: 'ingredients' | 'steps') {
  if (section === 'ingredients') {
    return /^ingredients?\s*:?\s*$/i.test(line);
  }

  return /^(steps?|instructions?|directions?|method)\s*:?\s*$/i.test(line);
}

function extractSection(lines: string[], section: 'ingredients' | 'steps') {
  const startIndex = lines.findIndex((line) => isSectionTitle(line, section));

  if (startIndex === -1) {
    return [];
  }

  const oppositeSection = section === 'ingredients' ? 'steps' : 'ingredients';
  const sectionLines: string[] = [];

  for (const line of lines.slice(startIndex + 1)) {
    if (isSectionTitle(line, oppositeSection)) {
      break;
    }

    sectionLines.push(cleanLine(line));
  }

  return sectionLines.filter(Boolean);
}

function extractIngredients(text: string, lines: string[]) {
  const sectionIngredients = extractSection(lines, 'ingredients');

  if (sectionIngredients.length > 0) {
    return sectionIngredients;
  }

  const quantityLines = lines
    .map(cleanLine)
    .filter((line) => INGREDIENT_LINE_PATTERN.test(line) && !STEP_VERBS.test(line));

  if (quantityLines.length > 0) {
    return quantityLines;
  }

  return text
    .split(',')
    .map((ingredient) => cleanLine(ingredient))
    .filter((ingredient) => ingredient.length > 2 && !STEP_VERBS.test(ingredient))
    .slice(0, 8);
}

function extractSteps(text: string, lines: string[]) {
  const sectionSteps = extractSection(lines, 'steps');

  if (sectionSteps.length > 0) {
    return sectionSteps;
  }

  const numberedSteps = lines
    .filter((line) => /^\d+[.)]\s+/.test(line))
    .map(cleanLine);

  if (numberedSteps.length > 0) {
    return numberedSteps;
  }

  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => cleanLine(sentence))
    .filter((sentence) => STEP_VERBS.test(sentence))
    .slice(0, 8);
}

function getCookTime(text: string) {
  const explicitTime = text.match(
    /\b(total|cook|cooking|prep)\s*time\s*:?\s*(\d+)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i,
  );

  if (explicitTime) {
    return formatTime(explicitTime[2], explicitTime[3]);
  }

  const inlineTime = text.match(/\b(\d+)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i);

  if (inlineTime) {
    return formatTime(inlineTime[1], inlineTime[2]);
  }

  return 'Time TBD';
}

function formatTime(amount: string, unit: string) {
  const normalizedUnit = unit.toLowerCase();

  if (normalizedUnit.startsWith('h')) {
    return `${amount} hr`;
  }

  return `${amount} min`;
}

function getServings(text: string) {
  const servingMatch = text.match(/\b(serves|servings|yield|makes)\s*:?\s*(\d+)/i);

  if (!servingMatch) {
    return 'Servings TBD';
  }

  const amount = servingMatch[2];
  return amount === '1' ? '1 serving' : `${amount} servings`;
}

function getTitle(text: string, ingredients: string[]) {
  const searchableText = `${ingredients.join(' ')} ${text}`;
  const titleParts = MAIN_INGREDIENTS.filter((ingredient) =>
    ingredient.match.test(searchableText),
  ).map((ingredient) => ingredient.title);
  const uniqueTitleParts = [...new Set(titleParts)].slice(0, 2);

  if (uniqueTitleParts.length > 0) {
    return uniqueTitleParts.join(' ');
  }

  const firstLine = getLines(text)
    .find((line) => !line.includes('http') && !isSectionTitle(line, 'ingredients') && !isSectionTitle(line, 'steps'));

  if (firstLine) {
    return cleanLine(firstLine).replace(/^recipe[:\s-]*/i, '').slice(0, 48);
  }

  return 'Formatted Recipe';
}

export function formatRecipeText(text: string): Recipe {
  const lines = getLines(text);
  const source = getSourceLabel(text);
  const ingredients = extractIngredients(text, lines);
  const steps = extractSteps(text, lines);
  const title = getTitle(text, ingredients);

  // This function is intentionally isolated so it can later be replaced by a real AI API call.
  return {
    id: 'formatted-preview',
    title,
    cookTime: getCookTime(text),
    servings: getServings(text),
    source,
    sourceText: text,
    imageUrl: null,
    color: source === 'TikTok' ? '#F18F7A' : source === 'Instagram' ? '#F6C453' : '#E7A458',
    ingredients: ingredients.length > 0 ? ingredients : ['Ingredients TBD from pasted text'],
    steps: steps.length > 0 ? steps : ['Steps TBD from pasted text'],
  };
}
