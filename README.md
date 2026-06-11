# Cooked

Cooked is an Expo React Native app for saving recipes from messy text, social captions, links, and future screenshots. The app currently uses a local mock formatter to turn pasted recipe text into clean recipe cards, then saves those recipes to Supabase for the logged-in user.

No AI provider is connected yet.

## Features

- Supabase Auth sign up, login, logout, and session persistence
- Saved recipes loaded from Supabase Postgres
- User-owned recipe CRUD with Row Level Security
- Searchable recipe list
- Add Recipe flow for pasted recipe text or social captions/links
- Mock recipe formatter
- Preview/edit before saving
- Recipe detail page
- Cooking mode with step-by-step instructions
- Cook time and servings picker in Preview
- Placeholder Settings screen

## Tech Stack

- Expo React Native
- TypeScript
- Expo Router
- Supabase JS client
- Supabase Auth
- Supabase Postgres
- React Native AsyncStorage for Supabase session persistence

## Project Structure

```txt
src/
  app/
    _layout.tsx          Root app layout, auth gate, route stack
    (tabs)/
      index.tsx          Recipes tab
      add.tsx            Add Recipe tab
      settings.tsx       Settings and logout
    preview.tsx          Preview/edit recipe before saving
    recipe/[id].tsx      Recipe detail
    cooking/[id].tsx     Cooking mode
  components/
    auth-screen.tsx      Login and sign-up UI
    recipe-ui.tsx        Shared UI components
  context/
    auth-store.tsx       Supabase Auth state and actions
    recipe-store.tsx     Recipe state backed by Supabase CRUD
  data/
    mock-formatter.ts    Local mock formatter, replaceable by AI later
    mock-recipes.ts      Recipe type and fallback/mock objects
    storage.ts           Supabase recipe table CRUD helpers
  lib/
    supabase.ts          Supabase client setup
supabase/
  schema.sql             Recipes table, indexes/triggers, and RLS policies
```

## Environment Variables

Create a local `.env` file in the app root:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
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
```

## Current Recipe Flow

1. User signs up or logs in with Supabase Auth.
2. User pastes messy recipe text on the Add Recipe screen.
3. `src/data/mock-formatter.ts` converts the text into a `Recipe` object.
4. Preview lets the user edit title, cook time, servings, ingredients, and steps.
5. Save calls `recipe-store`.
6. `recipe-store` calls `src/data/storage.ts`.
7. `storage.ts` inserts or updates rows in Supabase.
8. Home loads recipes from Supabase for the logged-in user.

## Not Built Yet

- Real AI formatting
- Screenshot upload
- Image storage
- Payments or subscriptions
- App Store setup
- Production recipe parsing

## Security Notes

- `.env` and `.env.*` are gitignored.
- `.env.example` must contain placeholders only.
- Never commit a Supabase service role key to the app. The frontend should only use the anon key.
- Recipe access is protected by RLS policies in `supabase/schema.sql`.
- If a key is accidentally committed, rotate it in Supabase before pushing.
