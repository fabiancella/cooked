const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const BUCKET_NAME = 'recipe-images';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const PAGE_SIZE = 100;

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

function isFragileImageUrl(imageUrl) {
  try {
    const host = new URL(imageUrl).hostname.toLowerCase();

    return (
      host.includes('tiktokcdn') ||
      host.includes('cdninstagram') ||
      host.includes('fbcdn') ||
      host.startsWith('scontent.')
    );
  } catch {
    return false;
  }
}

function getImageExtension(contentType) {
  const cleanContentType = contentType.split(';')[0].trim().toLowerCase();

  if (cleanContentType === 'image/jpeg' || cleanContentType === 'image/jpg') {
    return 'jpg';
  }

  if (cleanContentType === 'image/png') {
    return 'png';
  }

  if (cleanContentType === 'image/webp') {
    return 'webp';
  }

  if (cleanContentType === 'image/gif') {
    return 'gif';
  }

  return null;
}

async function cacheImage(imageUrl) {
  const imageResponse = await fetch(imageUrl, {
    headers: {
      Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; CookedRecipeImporter/1.0)',
    },
  });

  if (!imageResponse.ok) {
    throw new Error(`image request failed with status ${imageResponse.status}`);
  }

  const contentType = imageResponse.headers.get('content-type') ?? '';
  const extension = getImageExtension(contentType);

  if (!extension) {
    throw new Error(`unsupported content type: ${contentType}`);
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  if (imageBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`image is too large: ${imageBuffer.byteLength} bytes`);
  }

  const filePath = `imports/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, imageBuffer, {
    cacheControl: '31536000',
    contentType,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
}

async function getRecipesPage(page) {
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from('recipes')
    .select('id, image_url')
    .not('image_url', 'is', null)
    .order('id')
    .range(start, end);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function backfillRecipe(recipe) {
  if (!recipe.image_url || !isFragileImageUrl(recipe.image_url)) {
    return 'skipped';
  }

  const cachedImageUrl = await cacheImage(recipe.image_url);
  const { error } = await supabase
    .from('recipes')
    .update({ image_url: cachedImageUrl })
    .eq('id', recipe.id);

  if (error) {
    throw error;
  }

  return 'updated';
}

async function main() {
  let page = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  while (true) {
    const recipes = await getRecipesPage(page);

    if (recipes.length === 0) {
      break;
    }

    for (const recipe of recipes) {
      try {
        const result = await backfillRecipe(recipe);

        if (result === 'updated') {
          updatedCount += 1;
          console.log(`Updated ${recipe.id}`);
        } else {
          skippedCount += 1;
        }
      } catch (error) {
        failedCount += 1;
        console.warn(`Failed ${recipe.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    page += 1;
  }

  console.log(`Done. Updated: ${updatedCount}. Skipped: ${skippedCount}. Failed: ${failedCount}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
