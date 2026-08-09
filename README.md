# Cooked

Cooked is an Expo React Native app for saving recipes from messy text, social captions, and notes. The app uses a Supabase Edge Function with Gemini to turn pasted recipe text into clean recipe cards, then saves those recipes to Supabase for the logged-in user.

## Try Cooked

[Join the Cooked iOS TestFlight Beta](https://testflight.apple.com/join/ACZQGBTR)

Requires an iPhone with TestFlight installed. 

## Features

- Supabase Auth sign up, login, logout, and session persistence
- Saved recipes loaded from Supabase Postgres
- User-owned recipe CRUD with Row Level Security
- Searchable recipe list
- Add Recipe flow for pasted recipe text, notes, or captions
- iOS share import beta for public recipe text, captions, and recipe article URLs
- Gemini recipe formatter through a Supabase Edge Function
- Non-recipe input validation with readable errors and retry
- Preview/edit before saving
- Recipe detail page
- Cooking mode with step-by-step instructions
- Cook time and servings picker in Preview
- Basic Settings, Account, Help, and About screens

## Tech Stack

- Expo React Native
- TypeScript
- Expo Router
- Supabase JS client
- Supabase Auth
- Supabase Postgres
- React Native AsyncStorage for Supabase session persistence
- iOS App Groups for share extension handoff

## Project Structure

```txt
src/
  app/
    _layout.tsx          Root app layout, auth gate, route stack
    (tabs)/
      index.tsx          Recipes tab
      add.tsx            Add Recipe tab
      settings.tsx       Settings and logout
      settings/          Account, Help, and About screens
    preview.tsx          Preview/edit recipe before saving
    recipe/[id].tsx      Recipe detail
    cooking/[id].tsx     Cooking mode
  components/
    auth-screen.tsx      Login and sign-up UI
    pending-shared-import-processor.tsx
                         Reads shared imports and auto-saves recipes
    recipe-ui.tsx        Shared UI components
  context/
    auth-store.tsx       Supabase Auth state and actions
    recipe-store.tsx     Recipe state backed by Supabase CRUD
  data/
    mock-formatter.ts    Legacy local formatter kept for reference
    mock-recipes.ts      Recipe type and fallback objects
    storage.ts           Supabase recipe table CRUD helpers
  lib/
    pending-shared-import.ts
                         App Group pending import storage bridge
    recipe-formatting.ts Shared formatter client helpers
    supabase.ts          Supabase client setup
targets/
  cooked-share/          iOS share extension target
supabase/
  functions/
    format-recipe/       Gemini formatter Edge Function
  schema.sql             Recipes table, indexes/triggers, and RLS policies
```

## Environment Variables

Create a local `.env` file in the app root:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Set this secret for the Supabase Edge Function:

```sh
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

The real `.env` file is ignored by git. Do not commit Supabase keys or service role keys.

Use `.env.example` only for placeholders.

## Supabase Setup

Run the SQL in:

```txt
supabase/schema.sql
```

That creates:

- `public.recipes`
- `user_id` ownership linked to `auth.users`
- JSONB `ingredients` and `steps`
- `source_text` and nullable `image_url`
- `created_at` and `updated_at`
- Row Level Security
- Policies for select, insert, update, and delete where `auth.uid() = user_id`

## Getting Started

Install dependencies:

```sh
npm install
```

Start Expo:

```sh
npm run start
```

Restart Expo after changing `.env` values.

## Useful Commands

```sh
npm run start
npm run ios
npm run android
npm run web
npx tsc --noEmit
deno check supabase/functions/format-recipe/index.ts
supabase functions deploy format-recipe
```

## Current Recipe Flow

1. User signs up or logs in with Supabase Auth.
2. User pastes messy recipe text on the Add Recipe screen.
3. The app calls the `format-recipe` Supabase Edge Function.
4. Gemini validates that the pasted text looks like a recipe and returns structured JSON.
5. Preview lets the user edit title, cook time, servings, ingredients, and steps.
6. Save calls `recipe-store`.
7. `recipe-store` calls `src/data/storage.ts`.
8. `storage.ts` inserts or updates rows in Supabase.
9. Home loads recipes from Supabase for the logged-in user.

## iOS Share Import Beta

1. User shares a public URL or text/caption to Cooked from the iOS share sheet.
2. The Cooked share extension saves the shared value to App Group storage.
3. User opens Cooked manually.
4. Cooked reads the pending import, clears it, formats it, saves it for the logged-in user, and opens the saved recipe.

Beta limitations:

- Works best when the shared page or caption contains ingredients and cooking steps.
- Public recipe article URLs can use Gemini URL Context.
- TikTok URLs can include public oEmbed metadata when available.
- Instagram support is best-effort public page/caption extraction only.
- Instagram/Reels or TikTok posts where the recipe only appears in video are not supported yet.
- No transcription, OCR, screenshot upload, private scraping, or Android sharing is included yet.

## Not Built Yet

- Screenshot upload
- Image storage
- Export recipes
- Payments or subscriptions
- Account deletion
- App Store setup

## Security Notes

- `.env` and `.env.*` are gitignored.
- `.env.example` must contain placeholders only.
- Never commit a Supabase service role key to the app. The frontend should only use the anon key.
- Recipe access is protected by RLS policies in `supabase/schema.sql`.
- If a key is accidentally committed, rotate it in Supabase before pushing.
