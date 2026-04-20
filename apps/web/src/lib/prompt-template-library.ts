"use client";

import type { Database } from "@loomic/shared";

import type { ArchitecturePromptTemplateSuggestion } from "./architecture-prompt-templates";
import { TEMPLATE_RECOMMENDED_IMAGE_MODEL_ID } from "./image-model-utils";
import { getSupabaseBrowserClient } from "./supabase-browser";

type PromptTemplateCategoryRow =
  Database["public"]["Tables"]["prompt_template_categories"]["Row"];
type PromptTemplateRow = Database["public"]["Tables"]["prompt_templates"]["Row"];

export type OfficialPromptTemplateLeafCategory = {
  key: string;
  name: string;
  sortOrder: number;
  templateCount: number;
};

export type OfficialPromptTemplateTopCategory = {
  key: string;
  name: string;
  sortOrder: number;
  templateCount: number;
  children: OfficialPromptTemplateLeafCategory[];
};

export type OfficialPromptTemplate = {
  id: string;
  title: string;
  promptText: string;
  coverImageUrl: string;
  outputImageUrl: string | null;
  previewImageUrls: string[];
  referenceImageUrls: string[];
  topCategoryKey: string;
  topCategoryName: string;
  leafCategoryKey: string;
  leafCategoryName: string;
  sortOrder: number;
  useCount: number;
  viewCount: number;
  collectCount: number;
};

export type OfficialPromptTemplateLibrary = {
  topCategories: OfficialPromptTemplateTopCategory[];
  templates: OfficialPromptTemplate[];
};

function compareNumbers(left: number, right: number) {
  return left - right;
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right, "zh-Hans-CN");
}

function dedupeText(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export function mapPromptTemplateRows(
  categories: PromptTemplateCategoryRow[],
  templates: PromptTemplateRow[],
): OfficialPromptTemplateLibrary {
  const topCategoryRows = [...categories]
    .filter((category) => category.depth === 1)
    .sort((left, right) => compareNumbers(left.sort_order, right.sort_order));

  const leafRowsByTopKey = new Map<string, PromptTemplateCategoryRow[]>();
  for (const category of categories) {
    if (category.depth !== 2 || !category.parent_key) {
      continue;
    }

    const group = leafRowsByTopKey.get(category.parent_key) ?? [];
    group.push(category);
    leafRowsByTopKey.set(category.parent_key, group);
  }

  const topSortOrderByKey = new Map(
    topCategoryRows.map((category) => [category.key, category.sort_order] as const),
  );
  const leafSortOrderByKey = new Map(
    categories
      .filter((category) => category.depth === 2)
      .map((category) => [category.key, category.sort_order] as const),
  );

  const mappedTemplates = [...templates]
    .map<OfficialPromptTemplate>((template) => ({
      id: template.id,
      title: template.title,
      promptText: template.prompt_text,
      coverImageUrl: template.cover_image_url,
      outputImageUrl: template.output_image_url,
      previewImageUrls: dedupeText([
        template.cover_image_url,
        template.output_image_url,
        ...(template.preview_image_urls ?? []),
      ]),
      referenceImageUrls: dedupeText(template.reference_image_urls ?? []),
      topCategoryKey: template.top_category_key,
      topCategoryName:
        topCategoryRows.find((category) => category.key === template.top_category_key)?.name ??
        "",
      leafCategoryKey: template.leaf_category_key,
      leafCategoryName:
        categories.find((category) => category.key === template.leaf_category_key)?.name ?? "",
      sortOrder: template.sort_order,
      useCount: template.use_count,
      viewCount: template.view_count,
      collectCount: template.collect_count,
    }))
    .sort((left, right) => {
      const topSortDelta = compareNumbers(
        topSortOrderByKey.get(left.topCategoryKey) ?? 0,
        topSortOrderByKey.get(right.topCategoryKey) ?? 0,
      );
      if (topSortDelta !== 0) {
        return topSortDelta;
      }

      const leafSortDelta = compareNumbers(
        leafSortOrderByKey.get(left.leafCategoryKey) ??
          topSortOrderByKey.get(left.topCategoryKey) ??
          0,
        leafSortOrderByKey.get(right.leafCategoryKey) ??
          topSortOrderByKey.get(right.topCategoryKey) ??
          0,
      );
      if (leafSortDelta !== 0) {
        return leafSortDelta;
      }

      const templateSortDelta = compareNumbers(left.sortOrder, right.sortOrder);
      if (templateSortDelta !== 0) {
        return templateSortDelta;
      }

      return compareStrings(left.title, right.title);
    });

  return {
    topCategories: topCategoryRows.map((category) => ({
      key: category.key,
      name: category.name,
      sortOrder: category.sort_order,
      templateCount: category.template_count,
      children: [...(leafRowsByTopKey.get(category.key) ?? [])]
        .sort((left, right) => compareNumbers(left.sort_order, right.sort_order))
        .map((leaf) => ({
          key: leaf.key,
          name: leaf.name,
          sortOrder: leaf.sort_order,
          templateCount: leaf.template_count,
        })),
    })),
    templates: mappedTemplates,
  };
}

let cachedLibrary: OfficialPromptTemplateLibrary | null = null;
let cachedLibraryPromise: Promise<OfficialPromptTemplateLibrary> | null = null;

export async function loadOfficialPromptTemplateLibrary(): Promise<OfficialPromptTemplateLibrary> {
  if (cachedLibrary) {
    return cachedLibrary;
  }

  if (cachedLibraryPromise) {
    return cachedLibraryPromise;
  }

  cachedLibraryPromise = (async () => {
    const supabase = getSupabaseBrowserClient();
    const [categoriesResult, templatesResult] = await Promise.all([
      supabase
        .from("prompt_template_categories")
        .select(
          "key, source_catalog_id, parent_key, name, depth, sort_order, template_count, is_active, created_at, updated_at",
        )
        .eq("is_active", true)
        .order("depth", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("prompt_templates")
        .select(
          "id, source_template_id, top_category_key, leaf_category_key, title, prompt_text, cover_image_url, output_image_url, preview_image_urls, reference_image_urls, sort_order, width, height, use_count, view_count, collect_count, version_type, resolution, aspect_ratio, source_catalog_paths, source_created_at_ms, source_updated_at_ms, source_last_modified_at_ms, is_active, created_at, updated_at",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (categoriesResult.error) {
      throw categoriesResult.error;
    }

    if (templatesResult.error) {
      throw templatesResult.error;
    }

    const mapped = mapPromptTemplateRows(
      categoriesResult.data ?? [],
      templatesResult.data ?? [],
    );

    cachedLibrary = mapped;
    return mapped;
  })();

  try {
    return await cachedLibraryPromise;
  } finally {
    cachedLibraryPromise = null;
  }
}

export async function loadPromptTemplateFavoriteIds(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const result = await supabase
    .from("prompt_template_favorites")
    .select("template_id")
    .eq("user_id", userId);

  if (result.error) {
    throw result.error;
  }

  return new Set((result.data ?? []).map((item) => item.template_id));
}

export async function addPromptTemplateFavorite(userId: string, templateId: string) {
  const supabase = getSupabaseBrowserClient();
  const result = await supabase
    .from("prompt_template_favorites")
    .insert({ user_id: userId, template_id: templateId });

  if (result.error) {
    throw result.error;
  }
}

export async function removePromptTemplateFavorite(
  userId: string,
  templateId: string,
) {
  const supabase = getSupabaseBrowserClient();
  const result = await supabase
    .from("prompt_template_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("template_id", templateId);

  if (result.error) {
    throw result.error;
  }
}

export function buildOfficialPromptTemplateSuggestion(
  template: OfficialPromptTemplate,
): ArchitecturePromptTemplateSuggestion {
  return {
    id: template.id,
    label: template.title,
    prompt: template.promptText,
    recommendedImageModelId: TEMPLATE_RECOMMENDED_IMAGE_MODEL_ID,
    categoryId: template.leafCategoryKey,
    categoryLabel: template.leafCategoryName,
    coverImageUrl: template.coverImageUrl,
    outputImageUrl: template.outputImageUrl,
    previewImageUrls: template.previewImageUrls,
    referenceImageUrls: template.referenceImageUrls,
    topCategoryKey: template.topCategoryKey,
    topCategoryLabel: template.topCategoryName,
    leafCategoryKey: template.leafCategoryKey,
    leafCategoryLabel: template.leafCategoryName,
  };
}

export function clearOfficialPromptTemplateLibraryCache() {
  cachedLibrary = null;
  cachedLibraryPromise = null;
}
