import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = process.cwd();
const DATA_FILE = path.join(REPO_ROOT, "data", "jzxz-template-library.json");
const OUTPUT_FILE = path.join(
  REPO_ROOT,
  "supabase",
  "migrations",
  "20260419143000_prompt_template_library.sql",
);

function parseArgs(argv) {
  let inputFile = DATA_FILE;
  let outputFile = OUTPUT_FILE;

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;

    if (token.startsWith("--input-file=")) {
      inputFile = path.resolve(token.slice("--input-file=".length));
      continue;
    }

    if (token === "--input-file") {
      inputFile = path.resolve(argv[index + 1] ?? inputFile);
      index += 1;
      continue;
    }

    if (token.startsWith("--output-file=")) {
      outputFile = path.resolve(token.slice("--output-file=".length));
      continue;
    }

    if (token === "--output-file") {
      outputFile = path.resolve(argv[index + 1] ?? outputFile);
      index += 1;
    }
  }

  return { inputFile, outputFile };
}

function pickDollarTag(content, baseTag) {
  let candidate = baseTag;
  while (content.includes(`$${candidate}$`)) {
    candidate = `${candidate}_x`;
  }
  return candidate;
}

async function main() {
  const { inputFile, outputFile } = parseArgs(process.argv);
  const payload = JSON.parse(await readFile(inputFile, "utf8"));
  const payloadText = JSON.stringify(payload);
  const payloadTag = pickDollarTag(payloadText, "jzxz_payload");
  const payloadLiteral =
    "$" + payloadTag + "$" + payloadText + "$" + payloadTag + "$";

  const sql = `-- Official 建筑学长 prompt template library.
-- Generated from data/jzxz-template-library.json.

create table public.prompt_template_categories (
  key text primary key,
  source_catalog_id text not null unique,
  parent_key text references public.prompt_template_categories(key) on delete cascade,
  name text not null,
  depth smallint not null check (depth in (1, 2)),
  sort_order integer not null default 0,
  template_count integer not null default 0 check (template_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.prompt_templates (
  id text primary key,
  source_template_id text not null unique,
  top_category_key text not null references public.prompt_template_categories(key) on delete restrict,
  leaf_category_key text not null references public.prompt_template_categories(key) on delete restrict,
  title text not null,
  prompt_text text not null,
  cover_image_url text not null,
  output_image_url text,
  preview_image_urls text[] not null default '{}'::text[],
  reference_image_urls text[] not null default '{}'::text[],
  sort_order integer not null default 0,
  width integer,
  height integer,
  use_count integer not null default 0 check (use_count >= 0),
  view_count integer not null default 0 check (view_count >= 0),
  collect_count integer not null default 0 check (collect_count >= 0),
  version_type text,
  resolution text,
  aspect_ratio text,
  source_catalog_paths jsonb not null default '[]'::jsonb,
  source_created_at_ms bigint,
  source_updated_at_ms bigint,
  source_last_modified_at_ms bigint,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.prompt_template_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id text not null references public.prompt_templates(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, template_id)
);

create index prompt_template_categories_parent_active_sort_idx
  on public.prompt_template_categories(parent_key, is_active, sort_order);

create index prompt_templates_leaf_active_sort_idx
  on public.prompt_templates(leaf_category_key, is_active, sort_order);

create index prompt_templates_top_active_sort_idx
  on public.prompt_templates(top_category_key, is_active, sort_order);

create index prompt_template_favorites_user_created_idx
  on public.prompt_template_favorites(user_id, created_at desc);

create trigger prompt_template_categories_updated_at
  before update on public.prompt_template_categories
  for each row execute function public.set_updated_at();

create trigger prompt_templates_updated_at
  before update on public.prompt_templates
  for each row execute function public.set_updated_at();

alter table public.prompt_template_categories enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.prompt_template_favorites enable row level security;

create policy prompt_template_categories_select_authenticated
  on public.prompt_template_categories
  for select
  to authenticated
  using (is_active = true);

create policy prompt_templates_select_authenticated
  on public.prompt_templates
  for select
  to authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.prompt_template_categories as leaf_category
      where leaf_category.key = leaf_category_key
        and leaf_category.is_active = true
    )
    and exists (
      select 1
      from public.prompt_template_categories as top_category
      where top_category.key = top_category_key
        and top_category.is_active = true
    )
  );

create policy prompt_template_favorites_select_own
  on public.prompt_template_favorites
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy prompt_template_favorites_insert_own
  on public.prompt_template_favorites
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy prompt_template_favorites_delete_own
  on public.prompt_template_favorites
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy prompt_template_favorites_update_own
  on public.prompt_template_favorites
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $seed$
declare
  payload jsonb := ${payloadLiteral}::jsonb;
begin
  insert into public.prompt_template_categories (
    key,
    source_catalog_id,
    parent_key,
    name,
    depth,
    sort_order,
    template_count,
    is_active
  )
  select
    category ->> 'key',
    category ->> 'sourceCatalogId',
    case
      when category ? 'parentKey' and jsonb_typeof(category -> 'parentKey') = 'string'
        then category ->> 'parentKey'
      else null
    end,
    category ->> 'name',
    coalesce((category ->> 'depth')::smallint, 1),
    coalesce((category ->> 'sortOrder')::integer, 0),
    coalesce((category ->> 'templateCount')::integer, 0),
    true
  from jsonb_array_elements(payload -> 'categories') as category
  on conflict (key) do update
  set
    source_catalog_id = excluded.source_catalog_id,
    parent_key = excluded.parent_key,
    name = excluded.name,
    depth = excluded.depth,
    sort_order = excluded.sort_order,
    template_count = excluded.template_count,
    is_active = excluded.is_active;

  insert into public.prompt_templates (
    id,
    source_template_id,
    top_category_key,
    leaf_category_key,
    title,
    prompt_text,
    cover_image_url,
    output_image_url,
    preview_image_urls,
    reference_image_urls,
    sort_order,
    width,
    height,
    use_count,
    view_count,
    collect_count,
    version_type,
    resolution,
    aspect_ratio,
    source_catalog_paths,
    source_created_at_ms,
    source_updated_at_ms,
    source_last_modified_at_ms,
    is_active
  )
  select
    template ->> 'id',
    template ->> 'sourceTemplateId',
    template ->> 'topCategoryKey',
    template ->> 'leafCategoryKey',
    template ->> 'title',
    template ->> 'promptText',
    template ->> 'coverImageUrl',
    nullif(template ->> 'outputImageUrl', ''),
    coalesce(
      array(
        select jsonb_array_elements_text(
          case
            when jsonb_typeof(template -> 'previewImageUrls') = 'array'
              then template -> 'previewImageUrls'
            else '[]'::jsonb
          end
        )
      ),
      '{}'::text[]
    ),
    coalesce(
      array(
        select jsonb_array_elements_text(
          case
            when jsonb_typeof(template -> 'referenceImageUrls') = 'array'
              then template -> 'referenceImageUrls'
            else '[]'::jsonb
          end
        )
      ),
      '{}'::text[]
    ),
    coalesce((template ->> 'sortOrder')::integer, 0),
    nullif(template ->> 'width', '')::integer,
    nullif(template ->> 'height', '')::integer,
    coalesce((template ->> 'useCount')::integer, 0),
    coalesce((template ->> 'viewCount')::integer, 0),
    coalesce((template ->> 'collectCount')::integer, 0),
    nullif(template ->> 'versionType', ''),
    nullif(template ->> 'resolution', ''),
    nullif(template ->> 'aspectRatio', ''),
    case
      when jsonb_typeof(template -> 'sourceCatalogPaths') = 'array'
        then template -> 'sourceCatalogPaths'
      else '[]'::jsonb
    end,
    nullif(template ->> 'sourceCreatedAtMs', '')::bigint,
    nullif(template ->> 'sourceUpdatedAtMs', '')::bigint,
    nullif(template ->> 'sourceLastModifiedAtMs', '')::bigint,
    true
  from jsonb_array_elements(payload -> 'templates') as template
  on conflict (id) do update
  set
    source_template_id = excluded.source_template_id,
    top_category_key = excluded.top_category_key,
    leaf_category_key = excluded.leaf_category_key,
    title = excluded.title,
    prompt_text = excluded.prompt_text,
    cover_image_url = excluded.cover_image_url,
    output_image_url = excluded.output_image_url,
    preview_image_urls = excluded.preview_image_urls,
    reference_image_urls = excluded.reference_image_urls,
    sort_order = excluded.sort_order,
    width = excluded.width,
    height = excluded.height,
    use_count = excluded.use_count,
    view_count = excluded.view_count,
    collect_count = excluded.collect_count,
    version_type = excluded.version_type,
    resolution = excluded.resolution,
    aspect_ratio = excluded.aspect_ratio,
    source_catalog_paths = excluded.source_catalog_paths,
    source_created_at_ms = excluded.source_created_at_ms,
    source_updated_at_ms = excluded.source_updated_at_ms,
    source_last_modified_at_ms = excluded.source_last_modified_at_ms,
    is_active = excluded.is_active;
end;
$seed$;
`;

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, sql, "utf8");

  console.log(`Wrote prompt template migration to ${outputFile}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
