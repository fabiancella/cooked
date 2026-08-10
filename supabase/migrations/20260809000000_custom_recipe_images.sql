alter table public.recipes
add column if not exists custom_image_url text;

drop policy if exists "Users can view own custom recipe images" on storage.objects;
create policy "Users can view own custom recipe images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can upload own custom recipe images" on storage.objects;
create policy "Users can upload own custom recipe images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can delete own custom recipe images" on storage.objects;
create policy "Users can delete own custom recipe images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
