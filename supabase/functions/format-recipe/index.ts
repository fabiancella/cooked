declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_RETRY_STATUSES = [429, 500, 502, 503, 504];
const GEMINI_RETRY_DELAYS_MS = [500, 1500, 3000];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const NOT_RECIPE_ERROR = 'That does not look like a recipe. Paste ingredients and cooking steps, then try again.';

type FormattedRecipe = {
  title: string;
  ingredients: string[];
  steps: string[];
  cookTime: string;
  servings: string;
  source: string;
  sourceText: string;
};

type RecipeImportMode = 'paste' | 'shared-url';

type TikTokMetadata = {
  authorName?: string;
  providerName?: string;
  title?: string;
};

function logImport(requestId: string, message: string, details?: Record<string, unknown>) {
  const suffix = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[format-recipe] [${requestId}] ${message}${suffix}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class RecipeValidationError extends Error {
  constructor() {
    super(NOT_RECIPE_ERROR);
  }
}

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

function countIngredientItems(ingredients: string[]) {
  return ingredients.filter((ingredient) => !/^[^:]{2,45}:$/.test(ingredient.trim())).length;
}

function hasUsefulRecipeMeta(value: string) {
  const trimmedValue = value.trim();

  return Boolean(trimmedValue) && !/\b(TBD|unknown|not specified|not provided|n\/a)\b/i.test(trimmedValue);
}

function validateRecipe(value: unknown, sourceText: string): FormattedRecipe | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const recipe = value as Record<string, unknown>;

  if (
    typeof recipe.title !== 'string' ||
    !recipe.title.trim() ||
    typeof recipe.cookTime !== 'string' ||
    typeof recipe.servings !== 'string' ||
    typeof recipe.source !== 'string' ||
    !isStringArray(recipe.ingredients) ||
    !isStringArray(recipe.steps)
  ) {
    return null;
  }

  const ingredients = normalizeIngredients(recipe.ingredients);
  const steps = recipe.steps.map((step) => step.trim()).filter(Boolean);

  if (countIngredientItems(ingredients) < 2 || steps.length < 2) {
    return null;
  }

  const cookTime = recipe.cookTime.trim();
  const servings = recipe.servings.trim();

  if (!hasUsefulRecipeMeta(cookTime) || !hasUsefulRecipeMeta(servings)) {
    return null;
  }

  return {
    title: recipe.title,
    ingredients,
    steps,
    cookTime,
    servings,
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

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isTikTokUrl(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'tiktok.com' || host.endsWith('.tiktok.com');
  } catch {
    return false;
  }
}

function getMetadataPrompt(metadata: TikTokMetadata | null) {
  if (!metadata) {
    return '';
  }

  return [
    '',
    'Public social metadata:',
    metadata.providerName ? `Provider: ${metadata.providerName}` : '',
    metadata.authorName ? `Author: ${metadata.authorName}` : '',
    metadata.title ? `Title or caption: ${metadata.title}` : '',
  ].filter(Boolean).join('\n');
}

function getPrompt(text: string, importMode: RecipeImportMode, metadata: TikTokMetadata | null) {
  const sourceLabel = importMode === 'shared-url' ? 'Shared URL or text:' : 'Pasted recipe text:';
  const sharedUrlInstructions =
    importMode === 'shared-url'
      ? [
          'The input may be a URL shared from Safari, TikTok, Instagram, or a recipe website.',
          'If the input is a public URL, use URL context to read the public page or caption.',
          'If public page text, caption, or metadata does not contain enough ingredients and cooking steps, return isRecipe false.',
          'Do not invent ingredients or steps from a video-only post, title, thumbnail, or generic page.',
        ]
      : [];

  return [
    'Format the pasted recipe text into strict JSON only.',
    'First decide if the pasted text is a real recipe.',
    'If the input is not a real recipe or does not contain enough cooking information, return exactly this JSON shape:',
    '{"isRecipe":false,"reason":"This does not look like a recipe."}',
    'Only return isRecipe true when the input contains enough information to create ingredients and steps.',
    'For valid recipes, return exactly this JSON shape:',
    '{"isRecipe":true,"recipe":{"title":"","cookTime":"","servings":"","source":"","ingredients":[],"steps":[]}}',
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
    'For cookTime, preserve an explicit total, cook, or prep time from the source when one exists.',
    'If cookTime is missing, estimate it from the ingredients and steps, including prep, inactive, and cooking time needed to complete the recipe.',
    'For servings, preserve an explicit serving size, yield, or makes amount from the source when one exists.',
    'If servings is missing, estimate it from the ingredient quantities and final dish type.',
    'Only estimate cookTime or servings when that specific field is missing from the source.',
    'Never return blank, TBD, unknown, not specified, not provided, or n/a for cookTime or servings.',
    'Use short user-facing estimates like "35 min", "1 hr 15 min", "4 servings", or "12 cookies".',
    'Steps should stay as clear numbered cooking instructions, with one cooking action per step when possible.',
    'Infer source as TikTok, Instagram, or Pasted text when possible.',
    'Do not include markdown, comments, or any text outside the JSON object.',
    ...sharedUrlInstructions,
    getMetadataPrompt(metadata),
    '',
    sourceLabel,
    text,
  ].join('\n');
}

async function getTikTokMetadata(url: string, requestId: string): Promise<TikTokMetadata | null> {
  logImport(requestId, 'requesting TikTok oEmbed metadata');
  const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);

  logImport(requestId, 'TikTok oEmbed response received', { status: response.status });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as Record<string, unknown>;

  const metadata = {
    authorName: typeof data.author_name === 'string' ? data.author_name : undefined,
    providerName: typeof data.provider_name === 'string' ? data.provider_name : undefined,
    title: typeof data.title === 'string' ? data.title : undefined,
  };

  logImport(requestId, 'TikTok oEmbed metadata parsed', {
    hasTitle: Boolean(metadata.title),
    titleLength: metadata.title?.length ?? 0,
    hasAuthor: Boolean(metadata.authorName),
  });

  return metadata;
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

async function requestGemini(requestBody: Record<string, unknown>, apiKey: string, requestId: string) {
  for (let attemptIndex = 0; attemptIndex <= GEMINI_RETRY_DELAYS_MS.length; attemptIndex += 1) {
    const attempt = attemptIndex + 1;
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });
    const responseText = await response.text();
    const geminiMessage = response.ok ? null : getGeminiErrorMessage(responseText);

    logImport(requestId, 'Gemini response received', { status: response.status, attempt });

    if (response.ok) {
      return responseText;
    }

    const delayMs = GEMINI_RETRY_DELAYS_MS[attemptIndex];

    if (!GEMINI_RETRY_STATUSES.includes(response.status) || delayMs === undefined) {
      const detail = geminiMessage ? `: ${geminiMessage}` : '';

      throw new Error(`Gemini request failed with status ${response.status}${detail}`);
    }

    logImport(requestId, 'Gemini request retrying', {
      attempt,
      status: response.status,
      delayMs,
      message: geminiMessage,
    });

    await sleep(delayMs);
  }

  throw new Error('Gemini request failed.');
}

async function formatWithGemini(text: string, importMode: RecipeImportMode, requestId: string) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const isSharedUrl = importMode === 'shared-url' && isHttpUrl(text);
  const isTikTokImport = isSharedUrl && isTikTokUrl(text);
  const shouldUseUrlContext = isSharedUrl && !isTikTokImport;
  let metadata: TikTokMetadata | null = null;

  logImport(requestId, 'formatting started', {
    importMode,
    inputLength: text.length,
    usesUrlContext: shouldUseUrlContext,
    isTikTok: isTikTokImport,
  });

  if (isTikTokImport) {
    try {
      metadata = await getTikTokMetadata(text, requestId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown TikTok oEmbed error';
      logImport(requestId, 'TikTok oEmbed request failed', { message });
      metadata = null;
    }
  }
  const requestBody: Record<string, unknown> = {
    contents: [
      {
        parts: [
          {
            text: getPrompt(text, importMode, metadata),
          },
        ],
      },
    ],
  };

  if (shouldUseUrlContext) {
    requestBody.tools = [{ url_context: {} }];
  } else {
    requestBody.generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          isRecipe: { type: 'boolean' },
          reason: { type: 'string' },
          recipe: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              cookTime: { type: 'string' },
              servings: { type: 'string' },
              source: { type: 'string' },
              ingredients: {
                type: 'array',
                items: { type: 'string' },
              },
              steps: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['title', 'cookTime', 'servings', 'source', 'ingredients', 'steps'],
          },
        },
        required: ['isRecipe'],
      },
    };
  }

  const responseText = await requestGemini(requestBody, apiKey, requestId);

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

  let formatterResult: unknown;

  try {
    const cleanedRecipeJson = recipeJson
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');

    formatterResult = JSON.parse(cleanedRecipeJson);
  } catch {
    throw new Error('Gemini returned bad recipe JSON.');
  }

  if (!formatterResult || typeof formatterResult !== 'object') {
    throw new RecipeValidationError();
  }

  const result = formatterResult as Record<string, unknown>;

  if (result.isRecipe !== true || !result.recipe) {
    logImport(requestId, 'Gemini rejected input as non-recipe');
    throw new RecipeValidationError();
  }

  const formattedRecipe = validateRecipe(result.recipe, text);

  if (!formattedRecipe) {
    logImport(requestId, 'formatted recipe failed validation');
    throw new RecipeValidationError();
  }

  logImport(requestId, 'recipe formatted successfully', {
    ingredientCount: formattedRecipe.ingredients.length,
    stepCount: formattedRecipe.steps.length,
  });

  return formattedRecipe;
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();

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
  const requestedImportMode =
    body && typeof body === 'object' && 'importMode' in body ? (body as { importMode: unknown }).importMode : null;

  if (typeof text !== 'string' || !text.trim()) {
    return jsonResponse({ error: 'Recipe text is required.' }, 400);
  }

  const importMode: RecipeImportMode = requestedImportMode === 'shared-url' ? 'shared-url' : 'paste';

  logImport(requestId, 'request received', {
    importMode,
    inputLength: text.trim().length,
    isUrl: isHttpUrl(text.trim()),
  });

  try {
    const recipe = await formatWithGemini(text.trim(), importMode, requestId);

    return jsonResponse({ recipe });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not format recipe with Gemini.';
    const status = error instanceof RecipeValidationError ? 400 : 500;

    logImport(requestId, 'request failed', { status, message });

    return jsonResponse({ error: message }, status);
  }
});
