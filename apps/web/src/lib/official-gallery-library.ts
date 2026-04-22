import type { Database } from "@loomic/shared";

import { getSupabaseBrowserClient } from "./supabase-browser";
import {
  officialGallerySeedLibrary,
  type OfficialGalleryCategory,
  type OfficialGalleryItem,
  type OfficialGallerySubtype,
} from "./official-gallery-seeds";

export { officialGallerySeedLibrary } from "./official-gallery-seeds";

type OfficialGalleryCategoryRow =
  Database["public"]["Tables"]["official_gallery_categories"]["Row"];
type OfficialGallerySubtypeRow =
  Database["public"]["Tables"]["official_gallery_subtypes"]["Row"];
type OfficialGalleryAssetRow =
  Database["public"]["Tables"]["official_gallery_assets"]["Row"];

function mapOfficialGalleryAssetRow(asset: OfficialGalleryAssetRow): OfficialGalleryItem {
  return {
    id: asset.id,
    label: asset.title,
    url: asset.asset_url,
    width: asset.width,
    height: asset.height,
  };
}

export function mapOfficialGalleryRows(
  categories: OfficialGalleryCategoryRow[],
  subtypes: OfficialGallerySubtypeRow[],
  assets: OfficialGalleryAssetRow[],
): OfficialGalleryCategory[] {
  if (categories.length === 0) {
    return officialGallerySeedLibrary;
  }

  const assetsBySubtype = new Map<string, OfficialGalleryAssetRow[]>();
  for (const asset of assets) {
    const group = assetsBySubtype.get(asset.subtype_id) ?? [];
    group.push(asset);
    assetsBySubtype.set(asset.subtype_id, group);
  }

  const subtypesByCategory = new Map<string, OfficialGallerySubtypeRow[]>();
  for (const subtype of subtypes) {
    const group = subtypesByCategory.get(subtype.category_id) ?? [];
    group.push(subtype);
    subtypesByCategory.set(subtype.category_id, group);
  }

  return [...categories]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((category) => ({
      id: category.id,
      label: category.label,
      subtypes: [...(subtypesByCategory.get(category.id) ?? [])]
        .sort((left, right) => left.sort_order - right.sort_order)
        .map<OfficialGallerySubtype>((subtype) => ({
          id: subtype.id,
          label: subtype.label,
          items: [...(assetsBySubtype.get(subtype.id) ?? [])]
            .sort((left, right) => left.sort_order - right.sort_order)
            .map(mapOfficialGalleryAssetRow),
        })),
    }));
}

export async function loadOfficialGalleryLibrary(): Promise<OfficialGalleryCategory[]> {
  const supabase = getSupabaseBrowserClient();

  const [categoriesResult, subtypesResult, assetsResult] = await Promise.all([
    supabase
      .from("official_gallery_categories")
      .select("id, label, sort_order, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("official_gallery_subtypes")
      .select("id, category_id, label, sort_order, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("official_gallery_assets")
      .select(
        "id, category_id, subtype_id, title, asset_url, width, height, sort_order, is_active, created_at, updated_at",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (categoriesResult.error || subtypesResult.error || assetsResult.error) {
    console.warn("[official-gallery] failed to load official gallery library; using seeds", {
      assetsError: assetsResult.error,
      categoriesError: categoriesResult.error,
      subtypesError: subtypesResult.error,
    });
    return officialGallerySeedLibrary;
  }

  const mapped = mapOfficialGalleryRows(
    categoriesResult.data ?? [],
    subtypesResult.data ?? [],
    assetsResult.data ?? [],
  );

  return mapped.length > 0 ? mapped : officialGallerySeedLibrary;
}
