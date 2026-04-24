-- Upgrade the official gallery from placeholder demo rows to a real,
-- sync-friendly library backed by Supabase Storage metadata.
-- Real category / subtype / asset records will be populated by the
-- sync-jzxz-official-gallery script after this migration is applied.

drop index if exists public.official_gallery_categories_sort_order_key;
drop index if exists public.official_gallery_subtypes_category_sort_order_key;
drop index if exists public.official_gallery_assets_subtype_sort_order_key;

create index if not exists official_gallery_categories_active_sort_idx
  on public.official_gallery_categories(is_active, sort_order);

create index if not exists official_gallery_subtypes_category_active_sort_idx
  on public.official_gallery_subtypes(category_id, is_active, sort_order);

alter table public.official_gallery_categories
  add column if not exists source_meta jsonb not null default '{}'::jsonb;

alter table public.official_gallery_subtypes
  add column if not exists source_tag text,
  add column if not exists source_type text,
  add column if not exists source_meta jsonb not null default '{}'::jsonb;

alter table public.official_gallery_assets
  add column if not exists source_asset_id text,
  add column if not exists source_asset_url text,
  add column if not exists source_thumb_url text,
  add column if not exists source_tag text,
  add column if not exists source_type text,
  add column if not exists source_meta jsonb not null default '{}'::jsonb,
  add column if not exists storage_bucket text not null default 'official-gallery-assets',
  add column if not exists storage_object_path text,
  add column if not exists mime_type text,
  add column if not exists byte_size bigint;

create index if not exists official_gallery_assets_storage_lookup_idx
  on public.official_gallery_assets(storage_bucket, storage_object_path);

create index if not exists official_gallery_assets_source_lookup_idx
  on public.official_gallery_assets(subtype_id, source_type, source_asset_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'official-gallery-assets',
  'official-gallery-assets',
  true,
  20971520, -- 20 MB
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "official_gallery_assets_select_public" on storage.objects;
create policy "official_gallery_assets_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'official-gallery-assets');
