-- Home discovery library for the workspace home page.
-- Stores the lower "灵感发现" categories and curated case cards.

create table public.home_discovery_categories (
  key text primary key,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.home_discovery_cases (
  id text primary key,
  category_key text not null references public.home_discovery_categories(key) on delete cascade,
  title text not null,
  cover_image_url text not null,
  author_name text not null,
  author_avatar_url text not null,
  view_count integer not null default 0 check (view_count >= 0),
  like_count integer not null default 0 check (like_count >= 0),
  case_url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index home_discovery_categories_sort_order_key
  on public.home_discovery_categories(sort_order);

create unique index home_discovery_cases_category_sort_order_key
  on public.home_discovery_cases(category_key, sort_order);

create index home_discovery_cases_active_category_idx
  on public.home_discovery_cases(category_key, is_active, sort_order);

create trigger home_discovery_categories_updated_at
  before update on public.home_discovery_categories
  for each row execute function public.set_updated_at();

create trigger home_discovery_cases_updated_at
  before update on public.home_discovery_cases
  for each row execute function public.set_updated_at();

alter table public.home_discovery_categories enable row level security;
alter table public.home_discovery_cases enable row level security;

create policy home_discovery_categories_select_authenticated
  on public.home_discovery_categories
  for select
  to authenticated
  using (is_active = true);

create policy home_discovery_cases_select_authenticated
  on public.home_discovery_cases
  for select
  to authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.home_discovery_categories
      where key = category_key
        and is_active = true
    )
  );

insert into public.home_discovery_categories (key, label, sort_order)
values
  ('branding-design', '品牌设计', 0),
  ('poster-and-ads', '海报与广告', 1),
  ('illustration', '插画', 2),
  ('ui-design', 'UI设计', 3),
  ('character-design', '角色设计', 4),
  ('storyboard-video', '影片与分镜', 5),
  ('product-design', '产品设计', 6),
  ('architecture-design', '建筑设计', 7);

insert into public.home_discovery_cases (
  id,
  category_key,
  title,
  cover_image_url,
  author_name,
  author_avatar_url,
  view_count,
  like_count,
  case_url,
  sort_order
)
values
  (
    'ji5ey5l',
    'branding-design',
    'The ART & Cultural Arts Center',
    'https://assets-persist.lovart.ai/agent_images/55fcd1f7-b572-48c9-812c-5be80a2d2f8f.png?x-oss-process=image/resize,w_600,m_lfit/format,webp',
    'Ken Allman',
    'https://lh3.googleusercontent.com/a/ACg8ocJ0nBUJkE5T9tLTwRlVXScB576EqOEeRS-6__BLxjYxrO5Jtxjjig=s96-c',
    549,
    7,
    'https://www.lovart.ai/case/ji5ey5l',
    0
  ),
  (
    'n9d21de',
    'poster-and-ads',
    'Vintage Car Poster',
    'https://models-online-persist.shakker.cloud/agent_images/15df2e11-acaa-4c6b-8911-b86c21559be6.png?x-oss-process=image/resize,w_600,m_lfit/format,webp',
    'DynamicWang',
    'https://models-online-persist.shakker.cloud/img/bb2b0c0b2fe44e8f9d5202df0d95bd5d/b54986892aec2756b1f5b43a99c897d58b6bee3413217b303a7a5c6e00584137.jpg?x-oss-process=image/resize,w_128,m_lfit/format,webp',
    359919,
    286,
    'https://www.lovart.ai/case/n9d21de',
    0
  ),
  (
    'bjde0nh',
    'illustration',
    'Cat Tarot Cards',
    'https://assets-persist.lovart.ai/web/model/a8b5877adfd242b3b0d6b4203125e50c/050db5819beb029f77ca7380a00f49dafcfc368e848e4052adecccf9ab8737f9.png?x-oss-process=image/resize,w_600,m_lfit/format,webp',
    'yongning zhang',
    'https://lh3.googleusercontent.com/a/ACg8ocJmrFqgeeWLGoLgbcmBdRRlSB56aqHJ_2i3-HJ34RGhbC3zyA=s96-c',
    2054,
    116,
    'https://www.lovart.ai/case/bjde0nh',
    0
  ),
  (
    'tl8zzk0',
    'ui-design',
    'Fallout-themed cake shop website.',
    'https://assets-persist.lovart.ai/agent_images/43d0317c-18a3-4d90-bcd3-099c7dc05eae.png?x-oss-process=image/resize,w_600,m_lfit/format,webp',
    'PepeThunter',
    'https://models-online-persist.shakker.cloud/img/9a4fde49d83f43c8a0f93045600e5db0/52bfad25929a7e44f869d318b39a0e7f4c0ff6e897d8fbafc8bd6e68899a8c63.png?x-oss-process=image/resize,w_128,m_lfit/format,webp',
    4338,
    192,
    'https://www.lovart.ai/case/tl8zzk0',
    0
  ),
  (
    'fbn3mss',
    'character-design',
    'My Creepy Clown Avatar in Abandoned Circus Park',
    'https://assets-persist.lovart.ai/agent_images/4dd9198b-475a-4ecf-9ade-d42c0edee086.png?x-oss-process=image/resize,w_600,m_lfit/format,webp',
    'kanako',
    'https://assets-persist.lovart.ai/img/2287b2a1c87242e3ada08b11a389df7f/9380511dee374b4da4f7405c0c8332a758c81312.jpg?x-oss-process=image/resize,w_128,m_lfit/format,webp',
    749,
    12,
    'https://www.lovart.ai/case/fbn3mss',
    0
  ),
  (
    'ikqo02k',
    'storyboard-video',
    'Mixtapes Emotions !',
    'https://assets-persist.lovart.ai/sd-images/de28e4fed419f0e733f8335c4957552da1602913e46f909dcd35406396e1f0e2.png?x-oss-process=image/resize,w_600,m_lfit/format,webp',
    'Sheetal Shinde',
    'https://lh3.googleusercontent.com/a/ACg8ocKvZHFCRHCxEHwy355WY5QXLgLjr9sA9PXArwZ9oKZrPQSf_wl9dA=s96-c',
    3057,
    49,
    'https://www.lovart.ai/case/ikqo02k',
    0
  ),
  (
    'a4ncmvb',
    'product-design',
    'Product Visualization - Robot Hand ',
    'https://assets-persist.lovart.ai/agent_images/f3f3696e-a112-4765-b2bd-bd32c511e36c.png?x-oss-process=image/resize,w_600,m_lfit/format,webp',
    'Product Visualization - Robot Hand',
    'https://assets-temp.lovart.ai/img/0e561df934f54a708780650b7659dc58/da0f1f755ba349c9330095072d41091bb81eff30accd1c73ea75109057641f54.png?x-oss-process=image/resize,w_128,m_lfit/format,webp',
    769,
    27,
    'https://www.lovart.ai/case/a4ncmvb',
    0
  ),
  (
    'ng716s0',
    'architecture-design',
    'Building a new website and learning how to AI',
    'https://assets-persist.lovart.ai/agent_images/d04e7b1a-ff77-498b-8193-2cdf76b0c25d.png?x-oss-process=image/resize,w_600,m_lfit/format,webp',
    'Paul Barnett',
    'https://lh3.googleusercontent.com/a/ACg8ocLwTYoxBL0fMU5W0MF90Yqvf1WS6BguLyiEwLfntALYFu9napkz=s96-c',
    1453,
    24,
    'https://www.lovart.ai/case/ng716s0',
    0
  );
