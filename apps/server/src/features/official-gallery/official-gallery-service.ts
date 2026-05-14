import type {
  Database,
  OfficialGalleryCategory,
  OfficialGalleryItem,
  OfficialGalleryItemsPageResponse,
  OfficialGallerySubtype,
} from "@loomic/shared";

import type { AdminSupabaseClient } from "../../supabase/admin.js";

type OfficialGalleryCategoryRow =
  Database["public"]["Tables"]["official_gallery_categories"]["Row"];
type OfficialGallerySubtypeRow =
  Database["public"]["Tables"]["official_gallery_subtypes"]["Row"];
type OfficialGalleryAssetRow =
  Database["public"]["Tables"]["official_gallery_assets"]["Row"];
type OfficialGalleryLibraryCategoryRow = Pick<
  OfficialGalleryCategoryRow,
  "created_at" | "id" | "is_active" | "label" | "sort_order" | "updated_at"
>;
type OfficialGalleryLibrarySubtypeRow = Pick<
  OfficialGallerySubtypeRow,
  "category_id" | "created_at" | "id" | "is_active" | "label" | "sort_order" | "updated_at"
>;
type OfficialGalleryListAssetRow = Pick<
  OfficialGalleryAssetRow,
  "asset_url" | "height" | "id" | "source_thumb_url" | "title" | "width"
>;

const OFFICIAL_GALLERY_QUERY_FAILED_MESSAGE = "Unable to load official gallery.";

export type OfficialGalleryService = {
  listLibrary(): Promise<OfficialGalleryCategory[]>;
  listSubtypeItems(args: {
    limit: number;
    offset: number;
    subtypeId: string;
  }): Promise<OfficialGalleryItemsPageResponse>;
};

export class OfficialGalleryServiceError extends Error {
  readonly statusCode: number;
  readonly code: "official_gallery_query_failed";

  constructor(
    code: "official_gallery_query_failed",
    message: string,
    statusCode: number,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

function mapOfficialGalleryAssetRow(asset: OfficialGalleryListAssetRow): OfficialGalleryItem {
  const thumbnailUrl = asset.source_thumb_url?.trim() || undefined;

  return {
    id: asset.id,
    label: asset.title,
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    url: asset.asset_url,
    width: asset.width,
    height: asset.height,
  };
}

export function mapOfficialGalleryRows(options: {
  assetCountBySubtype: Map<string, number>;
  categories: OfficialGalleryLibraryCategoryRow[];
  subtypes: OfficialGalleryLibrarySubtypeRow[];
}): OfficialGalleryCategory[] {
  const subtypesByCategory = new Map<string, OfficialGalleryLibrarySubtypeRow[]>();
  for (const subtype of options.subtypes) {
    const group = subtypesByCategory.get(subtype.category_id) ?? [];
    group.push(subtype);
    subtypesByCategory.set(subtype.category_id, group);
  }

  return [...options.categories]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((category) => ({
      id: category.id,
      label: category.label,
      subtypes: [...(subtypesByCategory.get(category.id) ?? [])]
        .sort((left, right) => left.sort_order - right.sort_order)
        .map<OfficialGallerySubtype>((subtype) => ({
          id: subtype.id,
          label: subtype.label,
          assetCount: options.assetCountBySubtype.get(subtype.id) ?? 0,
          items: [],
        })),
    }));
}

export function createOfficialGalleryService(options: {
  getAdminClient: () => AdminSupabaseClient;
}): OfficialGalleryService {
  return {
    async listLibrary() {
      const client = options.getAdminClient();

      const [categoriesResult, subtypesResult, assetSubtypeIdsResult] = await Promise.all([
        client
          .from("official_gallery_categories")
          .select("id, label, sort_order, is_active, created_at, updated_at")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        client
          .from("official_gallery_subtypes")
          .select("id, category_id, label, sort_order, is_active, created_at, updated_at")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        client
          .from("official_gallery_assets")
          .select("subtype_id")
          .eq("is_active", true)
      ]);

      if (categoriesResult.error || subtypesResult.error || assetSubtypeIdsResult.error) {
        console.error("[official-gallery] failed to query persisted gallery library", {
          assetsError: assetSubtypeIdsResult.error,
          categoriesError: categoriesResult.error,
          subtypesError: subtypesResult.error,
        });
        throw new OfficialGalleryServiceError(
          "official_gallery_query_failed",
          OFFICIAL_GALLERY_QUERY_FAILED_MESSAGE,
          500,
        );
      }

      const assetCountBySubtype = new Map<string, number>();
      for (const row of assetSubtypeIdsResult.data ?? []) {
        const subtypeId = String(row.subtype_id);
        assetCountBySubtype.set(subtypeId, (assetCountBySubtype.get(subtypeId) ?? 0) + 1);
      }

      const categories = mapOfficialGalleryRows({
        assetCountBySubtype,
        categories: categoriesResult.data ?? [],
        subtypes: subtypesResult.data ?? [],
      });

      console.info("[official-gallery] loaded persisted gallery library", {
        assetCount: assetSubtypeIdsResult.data?.length ?? 0,
        categoryCount: categories.length,
        subtypeCount: subtypesResult.data?.length ?? 0,
      });

      return categories;
    },

    async listSubtypeItems(args) {
      const client = options.getAdminClient();
      const rangeEnd = args.offset + args.limit - 1;
      const assetsResult = await client
        .from("official_gallery_assets")
        .select(
          "id, category_id, subtype_id, title, asset_url, source_thumb_url, width, height, sort_order, is_active, created_at, updated_at",
          {
            count: "exact",
          },
        )
        .eq("is_active", true)
        .eq("subtype_id", args.subtypeId)
        .order("sort_order", { ascending: true })
        .range(args.offset, rangeEnd);

      if (assetsResult.error) {
        console.error("[official-gallery] failed to query persisted gallery subtype items", {
          error: assetsResult.error,
          limit: args.limit,
          offset: args.offset,
          subtypeId: args.subtypeId,
        });
        throw new OfficialGalleryServiceError(
          "official_gallery_query_failed",
          OFFICIAL_GALLERY_QUERY_FAILED_MESSAGE,
          500,
        );
      }

      const totalCount = assetsResult.count ?? 0;
      const items = (assetsResult.data ?? []).map(mapOfficialGalleryAssetRow);
      const nextOffset = args.offset + items.length < totalCount ? args.offset + items.length : null;

      console.info("[official-gallery] loaded persisted gallery subtype items", {
        itemCount: items.length,
        limit: args.limit,
        nextOffset,
        offset: args.offset,
        subtypeId: args.subtypeId,
        totalCount,
      });

      return {
        subtypeId: args.subtypeId,
        items,
        totalCount,
        nextOffset,
      };
    },
  };
}
