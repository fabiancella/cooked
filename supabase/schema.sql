create extension if not exists pgcrypto;

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  cook_time text not null,
  servings text not null,
  source text not null,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  source_text text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipes enable row level security;

drop policy if exists "Users can select own recipes" on public.recipes;
create policy "Users can select own recipes"
on public.recipes for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own recipes" on public.recipes;
create policy "Users can insert own recipes"
on public.recipes for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own recipes" on public.recipes;
create policy "Users can update own recipes"
on public.recipes for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own recipes" on public.recipes;
create policy "Users can delete own recipes"
on public.recipes for delete
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at
before update on public.recipes
for each row
execute function public.set_updated_at();
