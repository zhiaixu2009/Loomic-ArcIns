-- Official gallery library for the architecture add-material modal.
-- Keeps category/subtype/image metadata in local Supabase tables so the
-- client no longer depends on hardcoded gallery constants.

create table public.official_gallery_categories (
  id text primary key,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.official_gallery_subtypes (
  id text primary key,
  category_id text not null references public.official_gallery_categories(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.official_gallery_assets (
  id text primary key,
  category_id text not null references public.official_gallery_categories(id) on delete cascade,
  subtype_id text not null references public.official_gallery_subtypes(id) on delete cascade,
  title text not null,
  asset_url text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index official_gallery_categories_sort_order_key
  on public.official_gallery_categories(sort_order);

create unique index official_gallery_subtypes_category_sort_order_key
  on public.official_gallery_subtypes(category_id, sort_order);

create unique index official_gallery_assets_subtype_sort_order_key
  on public.official_gallery_assets(subtype_id, sort_order);

create index official_gallery_assets_active_lookup_idx
  on public.official_gallery_assets(category_id, subtype_id, is_active, sort_order);

create trigger official_gallery_categories_updated_at
  before update on public.official_gallery_categories
  for each row execute function public.set_updated_at();

create trigger official_gallery_subtypes_updated_at
  before update on public.official_gallery_subtypes
  for each row execute function public.set_updated_at();

create trigger official_gallery_assets_updated_at
  before update on public.official_gallery_assets
  for each row execute function public.set_updated_at();

alter table public.official_gallery_categories enable row level security;
alter table public.official_gallery_subtypes enable row level security;
alter table public.official_gallery_assets enable row level security;

create policy official_gallery_categories_select_authenticated
  on public.official_gallery_categories
  for select
  to authenticated
  using (is_active = true);

create policy official_gallery_subtypes_select_authenticated
  on public.official_gallery_subtypes
  for select
  to authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.official_gallery_categories
      where id = category_id
        and is_active = true
    )
  );

create policy official_gallery_assets_select_authenticated
  on public.official_gallery_assets
  for select
  to authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.official_gallery_categories
      where id = category_id
        and is_active = true
    )
    and exists (
      select 1
      from public.official_gallery_subtypes
      where id = subtype_id
        and is_active = true
    )
  );

insert into public.official_gallery_categories (id, label, sort_order)
values
  ('architecture-render', '建筑效果图', 0),
  ('interior-render', '室内效果图', 1),
  ('landscape-render', '景观效果图', 2),
  ('urban-render', '城市效果图', 3),
  ('color-plan', '彩平参考图', 4),
  ('collage-render', '拼贴效果图', 5),
  ('illustration-render', '插画效果图', 6),
  ('competition-render', '竞赛效果图', 7),
  ('night-render', '夜景效果图', 8),
  ('plan-section-reference', '平立剖参考', 9),
  ('interior-plan', '室内平面图', 10);

insert into public.official_gallery_subtypes (id, category_id, label, sort_order)
values
  ('default', 'architecture-render', '默认', 0),
  ('villa', 'architecture-render', '别墅', 1),
  ('office-building', 'architecture-render', '办公楼', 2),
  ('school', 'architecture-render', '学校', 3),
  ('hospital', 'architecture-render', '医院', 4),
  ('interior-default', 'interior-render', '默认', 0),
  ('landscape-default', 'landscape-render', '默认', 0),
  ('urban-default', 'urban-render', '默认', 0),
  ('color-plan-default', 'color-plan', '默认', 0),
  ('collage-default', 'collage-render', '默认', 0),
  ('illustration-default', 'illustration-render', '默认', 0),
  ('competition-default', 'competition-render', '默认', 0),
  ('night-default', 'night-render', '默认', 0),
  ('plan-section-default', 'plan-section-reference', '默认', 0),
  ('interior-plan-default', 'interior-plan', '默认', 0);

insert into public.official_gallery_assets (
  id,
  category_id,
  subtype_id,
  title,
  asset_url,
  width,
  height,
  sort_order
)
values
  ('architecture-default-1', 'architecture-render', 'default', '建筑效果图 默认 1', '/official-gallery/architecture-default-1.png', 1600, 900, 0),
  ('architecture-default-2', 'architecture-render', 'default', '建筑效果图 默认 2', '/official-gallery/architecture-default-2.png', 1600, 900, 1),
  ('architecture-default-3', 'architecture-render', 'default', '建筑效果图 默认 3', '/official-gallery/architecture-default-3.png', 1600, 900, 2),
  ('architecture-default-4', 'architecture-render', 'default', '建筑效果图 默认 4', '/official-gallery/architecture-default-4.png', 1600, 900, 3),
  ('architecture-villa-1', 'architecture-render', 'villa', '建筑效果图 别墅 1', '/official-gallery/architecture-villa-1.png', 1600, 900, 0),
  ('architecture-villa-2', 'architecture-render', 'villa', '建筑效果图 别墅 2', '/official-gallery/architecture-villa-2.png', 1600, 900, 1),
  ('architecture-office-building-1', 'architecture-render', 'office-building', '建筑效果图 办公楼 1', '/official-gallery/architecture-default-2.png', 1600, 900, 0),
  ('architecture-office-building-2', 'architecture-render', 'office-building', '建筑效果图 办公楼 2', '/official-gallery/architecture-default-4.png', 1600, 900, 1),
  ('architecture-school-1', 'architecture-render', 'school', '建筑效果图 学校 1', '/official-gallery/architecture-default-1.png', 1600, 900, 0),
  ('architecture-school-2', 'architecture-render', 'school', '建筑效果图 学校 2', '/official-gallery/architecture-villa-1.png', 1600, 900, 1),
  ('architecture-hospital-1', 'architecture-render', 'hospital', '建筑效果图 医院 1', '/official-gallery/architecture-default-3.png', 1600, 900, 0),
  ('architecture-hospital-2', 'architecture-render', 'hospital', '建筑效果图 医院 2', '/official-gallery/architecture-villa-2.png', 1600, 900, 1),
  ('interior-default-1', 'interior-render', 'interior-default', '室内效果图 默认 1', '/official-gallery/architecture-default-1.png', 1600, 900, 0),
  ('interior-default-2', 'interior-render', 'interior-default', '室内效果图 默认 2', '/official-gallery/architecture-default-2.png', 1600, 900, 1),
  ('landscape-default-1', 'landscape-render', 'landscape-default', '景观效果图 默认 1', '/official-gallery/architecture-default-3.png', 1600, 900, 0),
  ('landscape-default-2', 'landscape-render', 'landscape-default', '景观效果图 默认 2', '/official-gallery/architecture-villa-1.png', 1600, 900, 1),
  ('urban-default-1', 'urban-render', 'urban-default', '城市效果图 默认 1', '/official-gallery/architecture-default-4.png', 1600, 900, 0),
  ('urban-default-2', 'urban-render', 'urban-default', '城市效果图 默认 2', '/official-gallery/architecture-villa-2.png', 1600, 900, 1),
  ('color-plan-default-1', 'color-plan', 'color-plan-default', '彩平参考图 默认 1', '/official-gallery/architecture-default-1.png', 1600, 900, 0),
  ('color-plan-default-2', 'color-plan', 'color-plan-default', '彩平参考图 默认 2', '/official-gallery/architecture-default-3.png', 1600, 900, 1),
  ('collage-default-1', 'collage-render', 'collage-default', '拼贴效果图 默认 1', '/official-gallery/architecture-default-2.png', 1600, 900, 0),
  ('collage-default-2', 'collage-render', 'collage-default', '拼贴效果图 默认 2', '/official-gallery/architecture-villa-1.png', 1600, 900, 1),
  ('illustration-default-1', 'illustration-render', 'illustration-default', '插画效果图 默认 1', '/official-gallery/architecture-default-4.png', 1600, 900, 0),
  ('illustration-default-2', 'illustration-render', 'illustration-default', '插画效果图 默认 2', '/official-gallery/architecture-villa-2.png', 1600, 900, 1),
  ('competition-default-1', 'competition-render', 'competition-default', '竞赛效果图 默认 1', '/official-gallery/architecture-default-1.png', 1600, 900, 0),
  ('competition-default-2', 'competition-render', 'competition-default', '竞赛效果图 默认 2', '/official-gallery/architecture-villa-1.png', 1600, 900, 1),
  ('night-default-1', 'night-render', 'night-default', '夜景效果图 默认 1', '/official-gallery/architecture-default-2.png', 1600, 900, 0),
  ('night-default-2', 'night-render', 'night-default', '夜景效果图 默认 2', '/official-gallery/architecture-villa-2.png', 1600, 900, 1),
  ('plan-section-default-1', 'plan-section-reference', 'plan-section-default', '平立剖参考 默认 1', '/official-gallery/architecture-default-3.png', 1600, 900, 0),
  ('plan-section-default-2', 'plan-section-reference', 'plan-section-default', '平立剖参考 默认 2', '/official-gallery/architecture-default-4.png', 1600, 900, 1),
  ('interior-plan-default-1', 'interior-plan', 'interior-plan-default', '室内平面图 默认 1', '/official-gallery/architecture-default-1.png', 1600, 900, 0),
  ('interior-plan-default-2', 'interior-plan', 'interior-plan-default', '室内平面图 默认 2', '/official-gallery/architecture-default-2.png', 1600, 900, 1);
