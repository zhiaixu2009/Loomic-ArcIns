-- Persist the Jianzhuxuezhang canvas "Add -> Official Gallery" dataset in
-- local Supabase so the architecture add modal no longer depends on bundled
-- constants and can be mirrored from the public upstream source.

create table public.add_gallery_categories (
  id text primary key,
  label text not null,
  sort_order integer not null default 0,
  source_meta jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.add_gallery_subtypes (
  id text primary key,
  category_id text not null references public.add_gallery_categories(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  source_tag text,
  source_type text,
  source_meta jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.add_gallery_assets (
  id text primary key,
  category_id text not null references public.add_gallery_categories(id) on delete cascade,
  subtype_id text not null references public.add_gallery_subtypes(id) on delete cascade,
  title text not null,
  asset_url text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  sort_order integer not null default 0,
  source_asset_id text,
  source_asset_url text,
  source_thumb_url text,
  source_tag text,
  source_type text,
  source_meta jsonb not null default '{}'::jsonb,
  storage_bucket text not null default 'add-gallery-assets',
  storage_object_path text,
  mime_type text,
  byte_size bigint,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index add_gallery_categories_active_sort_idx
  on public.add_gallery_categories(is_active, sort_order);

create index add_gallery_subtypes_category_active_sort_idx
  on public.add_gallery_subtypes(category_id, is_active, sort_order);

create index add_gallery_assets_active_lookup_idx
  on public.add_gallery_assets(category_id, subtype_id, is_active, sort_order);

create index add_gallery_assets_storage_lookup_idx
  on public.add_gallery_assets(storage_bucket, storage_object_path);

create index add_gallery_assets_source_lookup_idx
  on public.add_gallery_assets(subtype_id, source_type, source_asset_id);

create trigger add_gallery_categories_updated_at
  before update on public.add_gallery_categories
  for each row execute function public.set_updated_at();

create trigger add_gallery_subtypes_updated_at
  before update on public.add_gallery_subtypes
  for each row execute function public.set_updated_at();

create trigger add_gallery_assets_updated_at
  before update on public.add_gallery_assets
  for each row execute function public.set_updated_at();

alter table public.add_gallery_categories enable row level security;
alter table public.add_gallery_subtypes enable row level security;
alter table public.add_gallery_assets enable row level security;

create policy add_gallery_categories_select_authenticated
  on public.add_gallery_categories
  for select
  to authenticated
  using (is_active = true);

create policy add_gallery_subtypes_select_authenticated
  on public.add_gallery_subtypes
  for select
  to authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.add_gallery_categories
      where id = category_id
        and is_active = true
    )
  );

create policy add_gallery_assets_select_authenticated
  on public.add_gallery_assets
  for select
  to authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.add_gallery_categories
      where id = category_id
        and is_active = true
    )
    and exists (
      select 1
      from public.add_gallery_subtypes
      where id = subtype_id
        and is_active = true
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'add-gallery-assets',
  'add-gallery-assets',
  true,
  20971520,
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "add_gallery_assets_select_public" on storage.objects;
create policy "add_gallery_assets_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'add-gallery-assets');
