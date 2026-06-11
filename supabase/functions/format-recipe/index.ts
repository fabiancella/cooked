declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  return jsonResponse({
    recipe: {
      title: 'Mock Formatted Recipe',
      ingredients: ['1 cup mock ingredient', '2 tbsp sample seasoning', '1 pinch salt'],
      steps: ['Prepare the ingredients.', 'Cook everything together until done.', 'Serve warm.'],
      cookTime: '30 min',
      servings: '4 servings',
      source: 'Text',
      sourceText: text,
    },
  });
});
