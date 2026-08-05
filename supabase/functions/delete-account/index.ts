import { createClient, SupabaseClient } from "@supabase/supabase-js";

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const RECIPE_IMAGE_BUCKET = "recipe-images";
const RECIPE_QUERY_PAGE_SIZE = 1000;
const STORAGE_DELETE_BATCH_SIZE = 1000;
const SHARED_IMAGE_QUERY_BATCH_SIZE = 50;
const IMPORTED_IMAGE_PATH =
  /^imports\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getRecipeImagePath(imageUrl: string, supabaseUrl: string) {
  try {
    const image = new URL(imageUrl);
    const project = new URL(supabaseUrl);
    const pathPrefix = `/storage/v1/object/public/${RECIPE_IMAGE_BUCKET}/`;

    if (
      image.origin !== project.origin || !image.pathname.startsWith(pathPrefix)
    ) {
      return null;
    }

    const rawFilePath = image.pathname.slice(pathPrefix.length);
    const filePath = decodeURIComponent(rawFilePath);

    if (
      image.search ||
      image.hash ||
      rawFilePath !== filePath ||
      !IMPORTED_IMAGE_PATH.test(filePath)
    ) {
      return null;
    }

    return filePath;
  } catch {
    return null;
  }
}

async function getUserRecipeImageUrls(
  admin: SupabaseClient,
  userId: string,
) {
  const imageUrls: string[] = [];
  let offset = 0;

  while (true) {
    const { data: recipes, error } = await admin
      .from("recipes")
      .select("id, image_url")
      .eq("user_id", userId)
      .not("image_url", "is", null)
      .order("id")
      .range(offset, offset + RECIPE_QUERY_PAGE_SIZE - 1);

    if (error) {
      throw new Error("Could not load recipe images.");
    }

    for (const recipe of recipes ?? []) {
      if (typeof recipe.image_url === "string") {
        imageUrls.push(recipe.image_url);
      }
    }

    if (!recipes || recipes.length < RECIPE_QUERY_PAGE_SIZE) {
      return imageUrls;
    }

    offset += RECIPE_QUERY_PAGE_SIZE;
  }
}

async function deleteRecipeImages(
  admin: SupabaseClient,
  userId: string,
  supabaseUrl: string,
) {
  const recipeImageUrls = await getUserRecipeImageUrls(admin, userId);
  const imageUrls = [
    ...new Set(
      recipeImageUrls.filter((imageUrl) =>
        Boolean(getRecipeImagePath(imageUrl, supabaseUrl))
      ),
    ),
  ];
  const sharedImageUrls = new Set<string>();

  for (
    let index = 0;
    index < imageUrls.length;
    index += SHARED_IMAGE_QUERY_BATCH_SIZE
  ) {
    const batch = imageUrls.slice(index, index + SHARED_IMAGE_QUERY_BATCH_SIZE);
    const { data: sharedRecipes, error: sharedRecipesError } = await admin
      .from("recipes")
      .select("image_url")
      .neq("user_id", userId)
      .in("image_url", batch);

    if (sharedRecipesError) {
      throw new Error("Could not verify recipe image ownership.");
    }

    for (const recipe of sharedRecipes ?? []) {
      if (typeof recipe.image_url === "string") {
        sharedImageUrls.add(recipe.image_url);
      }
    }
  }

  const imagePaths = [
    ...new Set(
      imageUrls
        .filter((imageUrl) => !sharedImageUrls.has(imageUrl))
        .map((imageUrl) => getRecipeImagePath(imageUrl, supabaseUrl))
        .filter((path): path is string => Boolean(path)),
    ),
  ];

  for (
    let index = 0;
    index < imagePaths.length;
    index += STORAGE_DELETE_BATCH_SIZE
  ) {
    const batch = imagePaths.slice(index, index + STORAGE_DELETE_BATCH_SIZE);
    const { error } = await admin.storage.from(RECIPE_IMAGE_BUCKET).remove(
      batch,
    );

    if (error) {
      throw new Error("Could not delete recipe images.");
    }
  }

  return imagePaths.length;
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({
      error: "Only POST requests are supported.",
      code: "METHOD_NOT_ALLOWED",
    }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error(
      `[delete-account] [${requestId}] Supabase environment is not configured.`,
    );
    return jsonResponse({
      error: "Account deletion is not configured.",
      code: "SERVER_CONFIGURATION",
    }, 500);
  }

  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({
      error: "You must be logged in.",
      code: "UNAUTHORIZED",
    }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({
      error: "Your session is invalid or expired.",
      code: "UNAUTHORIZED",
    }, 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({
      error: "Request body must be valid JSON.",
      code: "INVALID_REQUEST",
    }, 400);
  }

  const password = body && typeof body === "object" && "password" in body
    ? (body as { password: unknown }).password
    : null;

  if (typeof password !== "string" || !password) {
    return jsonResponse({
      error: "Password is required.",
      code: "PASSWORD_REQUIRED",
    }, 400);
  }

  if (!user.email) {
    return jsonResponse({
      error: "This account cannot be confirmed with a password.",
      code: "EMAIL_REQUIRED",
    }, 400);
  }

  const passwordClient = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: passwordData, error: passwordError } = await passwordClient.auth
    .signInWithPassword({
      email: user.email,
      password,
    });

  if (passwordError?.status === 429) {
    return jsonResponse({
      error: "Too many attempts. Wait a moment, then try again.",
      code: "RATE_LIMITED",
    }, 429);
  }

  if (passwordError || passwordData.user?.id !== user.id) {
    return jsonResponse({
      error: "Password is incorrect.",
      code: "PASSWORD_INCORRECT",
    }, 403);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const deletedImageCount = await deleteRecipeImages(
      admin,
      user.id,
      supabaseUrl,
    );
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(
      user.id,
    );

    if (deleteUserError) {
      throw new Error("Could not delete the Auth user.");
    }

    console.log(`[delete-account] [${requestId}] Account deleted.`, {
      userId: user.id,
      deletedImageCount,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error(`[delete-account] [${requestId}] Account deletion failed.`, {
      userId: user.id,
      message: error instanceof Error ? error.message : String(error),
    });

    return jsonResponse({
      error: "Could not delete your account. Please try again.",
      code: "DELETE_FAILED",
    }, 500);
  }
});
