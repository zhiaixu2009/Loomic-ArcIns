import type {
  OfficialGalleryCategory,
  OfficialGalleryItem,
  OfficialGalleryItemsPageResponse,
  OfficialGallerySubtype,
} from "@loomic/shared";

import type { AdminSupabaseClient } from "../../supabase/admin.js";

type AddGalleryCategoryRow = {
  created_at: string;
  id: string;
  is_active: boolean;
  label: string;
  sort_order: number;
  updated_at: string;
};

type AddGallerySubtypeRow = {
  category_id: string;
  created_at: string;
  id: string;
  is_active: boolean;
  label: string;
  sort_order: number;
  updated_at: string;
};

type AddGalleryAssetRow = {
  asset_url: string;
  height: number;
  id: string;
  title: string;
  width: number;
};

const ADD_GALLERY_QUERY_FAILED_MESSAGE = "Unable to load add gallery.";

export type AddGalleryService = {
  listLibrary(): Promise<OfficialGalleryCategory[]>;
  listSubtypeItems(args: {
    limit: number;
    offset: number;
    subtypeId: string;
  }): Promise<OfficialGalleryItemsPageResponse>;
};

export class AddGalleryServiceError extends Error {
  readonly statusCode: number;
  readonly code: "add_gallery_query_failed";

  constructor(
    code: "add_gallery_query_failed",
    message: string,
    statusCode: number,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

function mapAddGalleryAssetRow(asset: AddGalleryAssetRow): OfficialGalleryItem {
  return {
    id: asset.id,
    label: asset.title,
    url: asset.asset_url,
    width: asset.width,
    height: asset.height,
  };
}

function mapAddGalleryRows(options: {
  assetCountBySubtype: Map<string, number>;
  categories: AddGalleryCategoryRow[];
  subtypes: AddGallerySubtypeRow[];
}): OfficialGalleryCategory[] {
  const subtypesByCategory = new Map<string, AddGallerySubtypeRow[]>();
  for (const subtype of options.subtypes) {
    const grouped = subtypesByCategory.get(subtype.category_id) ?? [];
    grouped.push(subtype);
    subtypesByCategory.set(subtype.category_id, grouped);
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

export function createAddGalleryService(options: {
  getAdminClient: () => AdminSupabaseClient;
}): AddGalleryService {
  return {
    async listLibrary() {
      const client = options.getAdminClient() as any;

      const [categoriesResult, subtypesResult, assetSubtypeIdsResult] = await Promise.all([
        client
          .from("add_gallery_categories")
          .select("id, label, sort_order, is_active, created_at, updated_at")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        client
          .from("add_gallery_subtypes")
          .select("id, category_id, label, sort_order, is_active, created_at, updated_at")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        client
          .from("add_gallery_assets")
          .select("subtype_id")
          .eq("is_active", true),
      ]);

      if (categoriesResult.error || subtypesResult.error || assetSubtypeIdsResult.error) {
        console.error("[add-gallery] failed to query persisted add gallery library", {
          assetsError: assetSubtypeIdsResult.error,
          categoriesError: categoriesResult.error,
          subtypesError: subtypesResult.error,
        });
        throw new AddGalleryServiceError(
          "add_gallery_query_failed",
          ADD_GALLERY_QUERY_FAILED_MESSAGE,
          500,
        );
      }

      const assetCountBySubtype = new Map<string, number>();
      for (const row of assetSubtypeIdsResult.data ?? []) {
        const subtypeId = String(row.subtype_id);
        assetCountBySubtype.set(subtypeId, (assetCountBySubtype.get(subtypeId) ?? 0) + 1);
      }

      const categories = mapAddGalleryRows({
        assetCountBySubtype,
        categories: (categoriesResult.data ?? []) as AddGalleryCategoryRow[],
        subtypes: (subtypesResult.data ?? []) as AddGallerySubtypeRow[],
      });

      console.info("[add-gallery] loaded persisted add gallery library", {
        assetCount: assetSubtypeIdsResult.data?.length ?? 0,
        categoryCount: categories.length,
        subtypeCount: subtypesResult.data?.length ?? 0,
      });

      return categories;
    },

    async listSubtypeItems(args) {
      const client = options.getAdminClient() as any;
      const rangeEnd = args.offset + args.limit - 1;
      const assetsResult = await client
        .from("add_gallery_assets")
        .select(
          "id, category_id, subtype_id, title, asset_url, width, height, sort_order, is_active, created_at, updated_at",
          {
            count: "exact",
          },
        )
        .eq("is_active", true)
        .eq("subtype_id", args.subtypeId)
        .order("sort_order", { ascending: true })
        .range(args.offset, rangeEnd);

      if (assetsResult.error) {
        console.error("[add-gallery] failed to query persisted add gallery subtype items", {
          error: assetsResult.error,
          limit: args.limit,
          offset: args.offset,
          subtypeId: args.subtypeId,
        });
        throw new AddGalleryServiceError(
          "add_gallery_query_failed",
          ADD_GALLERY_QUERY_FAILED_MESSAGE,
          500,
        );
      }

      const totalCount = assetsResult.count ?? 0;
      const items = (assetsResult.data ?? []).map((asset: AddGalleryAssetRow) =>
        mapAddGalleryAssetRow(asset),
      );
      const nextOffset =
        args.offset + items.length < totalCount ? args.offset + items.length : null;

      console.info("[add-gallery] loaded persisted add gallery subtype items", {
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
