declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type FormattedRecipe = {
  title: string;
  ingredients: string[];
  steps: string[];
  cookTime: string;
  servings: string;
  source: string;
  sourceText: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function cleanIngredientText(ingredient: string) {
  return ingredient
    .replace(/\uFFFD/g, '')
    .replace(/^[-*•]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim();
}

function getIngredientSection(ingredient: string) {
  const labelMatch = ingredient.match(/^([^:]{2,45}):\s*(.+)$/);

  if (!labelMatch) {
    return null;
  }

  const label = cleanIngredientText(labelMatch[1]);
  const ingredientText = labelMatch[2];

  if (/\d/.test(label)) {
    return null;
  }

  return {
    label: `${label}:`,
    ingredientText: ingredientText.trim(),
  };
}

function startsNewIngredient(segment: string) {
  return (
    /^(\d+\/\d+|\d+(\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(segment) ||
    /^(juice|zest)\s+of\b/i.test(segment) ||
    /^(salt|pepper|salt and pepper|splash|water)\b/i.test(segment) ||
    /^[A-Z][a-z]/.test(segment)
  );
}

function splitIngredientGroup(ingredient: string) {
  const cleanedIngredient = cleanIngredientText(ingredient).replace(/;/g, ',');
  const parts = cleanedIngredient
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return cleanedIngredient ? [cleanedIngredient] : [];
  }

  const ingredients: string[] = [];
  let currentIngredient = parts[0];

  for (const part of parts.slice(1)) {
    if (startsNewIngredient(part)) {
      ingredients.push(currentIngredient);
      currentIngredient = part;
    } else {
      currentIngredient = `${currentIngredient}, ${part}`;
    }
  }

  ingredients.push(currentIngredient);

  return ingredients;
}

function normalizeIngredients(ingredients: string[]) {
  return ingredients.flatMap((ingredient) => {
    const cleanedIngredient = cleanIngredientText(ingredient);

    if (!cleanedIngredient) {
      return [];
    }

    const section = getIngredientSection(cleanedIngredient);

    if (!section) {
      return splitIngredientGroup(cleanedIngredient);
    }

    return [section.label, ...splitIngredientGroup(section.ingredientText)];
  }).map(cleanIngredientText).filter(Boolean);
}

function validateRecipe(value: unknown, sourceText: string): FormattedRecipe | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const recipe = value as Record<string, unknown>;

  if (
    typeof recipe.title !== 'string' ||
    typeof recipe.cookTime !== 'string' ||
    typeof recipe.servings !== 'string' ||
    typeof recipe.source !== 'string' ||
    !isStringArray(recipe.ingredients) ||
    !isStringArray(recipe.steps)
  ) {
    return null;
  }

  return {
    title: recipe.title,
    ingredients: normalizeIngredients(recipe.ingredients),
    steps: recipe.steps,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    source: recipe.source,
    sourceText,
  };
}

function getGeminiText(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const response = value as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: unknown;
        }>;
      };
    }>;
  };
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

  return typeof text === 'string' && text.trim() ? text : null;
}

function getPrompt(text: string) {
  return [
    'Format the pasted recipe text into strict JSON only.',
    'Return exactly these fields: title, ingredients, steps, cookTime, servings, source.',
    'Use arrays of strings for ingredients and steps.',
    'Return each ingredient as its own array item.',
    'Never combine multiple ingredients into one string.',
    'When the original recipe has clear ingredient sections, preserve each section as a heading string ending in a colon.',
    'Put each heading in its own ingredients array item, followed by that section’s individual ingredient items.',
    'Use headings only when the source has real sections like Steak, Pico de gallo, Crema, Sauce, Marinade, Toppings, or Extras.',
    'Do not create section headings for simple recipes that do not already have ingredient sections.',
    'Never combine a heading and ingredients in the same string.',
    'Wrong section example: "Steak: 2 lbs flank steak, 1/4 cup orange juice, juice of 2 limes".',
    'Correct section example: "Steak:", "2 lbs flank steak", "1/4 cup orange juice", "Juice of 2 limes".',
    'The ingredients array should usually have 8-30 items depending on recipe complexity.',
    'Do not return ingredient paragraphs, comma-separated ingredient groups, or section summaries.',
    'Correct ingredient examples: "2 lbs flank steak, diced into small chunks", "1/4 cup orange juice", "Juice of 2 limes".',
    'If a line contains multiple ingredients, split it into separate ingredient strings.',
    'Use concise strings for title, cookTime, servings, and source.',
    'Steps should stay as clear numbered cooking instructions, with one cooking action per step when possible.',
    'Infer source as TikTok, Instagram, or Pasted text when possible.',
    'Do not include markdown, comments, or any text outside the JSON object.',
    '',
    'Pasted recipe text:',
    text,
  ].join('\n');
}

function getGeminiErrorMessage(responseText: string) {
  try {
    const body = JSON.parse(responseText) as {
      error?: {
        message?: unknown;
      };
    };

    if (typeof body.error?.message === 'string') {
      return body.error.message;
    }
  } catch {
    // Ignore invalid Gemini error JSON and use the status-only message.
  }

  const trimmedResponse = responseText.trim();

  if (trimmedResponse) {
    return trimmedResponse.slice(0, 300);
  }

  return null;
}

async function formatWithGemini(text: string) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: getPrompt(text),
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            ingredients: {
              type: 'array',
              items: { type: 'string' },
            },
            steps: {
              type: 'array',
              items: { type: 'string' },
            },
            cookTime: { type: 'string' },
            servings: { type: 'string' },
            source: { type: 'string' },
          },
          required: ['title', 'ingredients', 'steps', 'cookTime', 'servings', 'source'],
        },
      },
    }),
  });
  const responseText = await response.text();

  if (!response.ok) {
    const geminiMessage = getGeminiErrorMessage(responseText);
    const detail = geminiMessage ? `: ${geminiMessage}` : '';

    throw new Error(`Gemini request failed with status ${response.status}${detail}`);
  }

  let geminiResponse: unknown;

  try {
    geminiResponse = JSON.parse(responseText);
  } catch {
    throw new Error('Gemini returned an invalid response.');
  }

  const recipeJson = getGeminiText(geminiResponse);

  if (!recipeJson) {
    throw new Error('Gemini did not return recipe JSON.');
  }

  let recipe: unknown;

  try {
    recipe = JSON.parse(recipeJson);
  } catch {
    throw new Error('Gemini returned bad recipe JSON.');
  }

  const formattedRecipe = validateRecipe(recipe, text);

  if (!formattedRecipe) {
    throw new Error('Gemini returned an invalid recipe.');
  }

  return formattedRecipe;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Only POST requests are supported.' }, 405);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
  }

  const text = body && typeof body === 'object' && 'text' in body ? (body as { text: unknown }).text : null;

  if (typeof text !== 'string' || !text.trim()) {
    return jsonResponse({ error: 'Recipe text is required.' }, 400);
  }

  try {
    const recipe = await formatWithGemini(text.trim());

    return jsonResponse({ recipe });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not format recipe with Gemini.';
    return jsonResponse({ error: message }, 500);
  }
});
