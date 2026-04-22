import { describe, expect, it } from "vitest";

import type { Database } from "@loomic/shared";

import {
  mapOfficialGalleryRows,
  officialGallerySeedLibrary,
} from "@/lib/official-gallery-library";

type OfficialGalleryCategoryRow =
  Database["public"]["Tables"]["official_gallery_categories"]["Row"];
type OfficialGallerySubtypeRow =
  Database["public"]["Tables"]["official_gallery_subtypes"]["Row"];
type OfficialGalleryAssetRow =
  Database["public"]["Tables"]["official_gallery_assets"]["Row"];

describe("mapOfficialGalleryRows", () => {
  it("groups and sorts categories, subtypes, and assets into the gallery browser shape", () => {
    const categories: OfficialGalleryCategoryRow[] = [
      {
        id: "interior-render",
        label: "室内效果图",
        sort_order: 1,
        is_active: true,
        created_at: "2026-04-22T00:00:00.000Z",
        updated_at: "2026-04-22T00:00:00.000Z",
      },
      {
        id: "architecture-render",
        label: "建筑效果图",
        sort_order: 0,
        is_active: true,
        created_at: "2026-04-22T00:00:00.000Z",
        updated_at: "2026-04-22T00:00:00.000Z",
      },
    ];

    const subtypes: OfficialGallerySubtypeRow[] = [
      {
        id: "villa",
        category_id: "architecture-render",
        label: "别墅",
        sort_order: 1,
        is_active: true,
        created_at: "2026-04-22T00:00:00.000Z",
        updated_at: "2026-04-22T00:00:00.000Z",
      },
      {
        id: "default",
        category_id: "architecture-render",
        label: "默认",
        sort_order: 0,
        is_active: true,
        created_at: "2026-04-22T00:00:00.000Z",
        updated_at: "2026-04-22T00:00:00.000Z",
      },
    ];

    const assets: OfficialGalleryAssetRow[] = [
      {
        id: "architecture-default-2",
        asset_url: "/official-gallery/architecture-default-2.png",
        category_id: "architecture-render",
        created_at: "2026-04-22T00:00:00.000Z",
        height: 900,
        is_active: true,
        sort_order: 1,
        subtype_id: "default",
        title: "建筑效果图 默认 2",
        updated_at: "2026-04-22T00:00:00.000Z",
        width: 1600,
      },
      {
        id: "architecture-default-1",
        asset_url: "/official-gallery/architecture-default-1.png",
        category_id: "architecture-render",
        created_at: "2026-04-22T00:00:00.000Z",
        height: 900,
        is_active: true,
        sort_order: 0,
        subtype_id: "default",
        title: "建筑效果图 默认 1",
        updated_at: "2026-04-22T00:00:00.000Z",
        width: 1600,
      },
      {
        id: "architecture-villa-1",
        asset_url: "/official-gallery/architecture-villa-1.png",
        category_id: "architecture-render",
        created_at: "2026-04-22T00:00:00.000Z",
        height: 900,
        is_active: true,
        sort_order: 0,
        subtype_id: "villa",
        title: "建筑效果图 别墅 1",
        updated_at: "2026-04-22T00:00:00.000Z",
        width: 1600,
      },
    ];

    expect(mapOfficialGalleryRows(categories, subtypes, assets)).toEqual([
      {
        id: "architecture-render",
        label: "建筑效果图",
        subtypes: [
          {
            id: "default",
            label: "默认",
            items: [
              {
                id: "architecture-default-1",
                label: "建筑效果图 默认 1",
                url: "/official-gallery/architecture-default-1.png",
                width: 1600,
                height: 900,
              },
              {
                id: "architecture-default-2",
                label: "建筑效果图 默认 2",
                url: "/official-gallery/architecture-default-2.png",
                width: 1600,
                height: 900,
              },
            ],
          },
          {
            id: "villa",
            label: "别墅",
            items: [
              {
                id: "architecture-villa-1",
                label: "建筑效果图 别墅 1",
                url: "/official-gallery/architecture-villa-1.png",
                width: 1600,
                height: 900,
              },
            ],
          },
        ],
      },
      {
        id: "interior-render",
        label: "室内效果图",
        subtypes: [],
      },
    ]);
  });

  it("falls back to the bounded local seed library when the database is empty", () => {
    expect(mapOfficialGalleryRows([], [], [])).toEqual(officialGallerySeedLibrary);
  });
});
