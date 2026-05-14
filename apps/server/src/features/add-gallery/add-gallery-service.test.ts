import { describe, expect, it, vi } from "vitest";

import { createAddGalleryService } from "./add-gallery-service.js";

function createSubtypeItemsClientMock(rows: unknown[]) {
  const range = vi.fn().mockResolvedValue({
    count: rows.length,
    data: rows,
    error: null,
  });
  const order = vi.fn(() => ({ range }));
  const eqSubtype = vi.fn(() => ({ order }));
  const eqActive = vi.fn(() => ({ eq: eqSubtype }));
  const select = vi.fn(() => ({ eq: eqActive }));
  const from = vi.fn(() => ({ select }));

  return {
    client: { from },
    from,
    range,
    select,
  };
}

describe("createAddGalleryService", () => {
  it("returns a lightweight thumbnailUrl while preserving the original asset url for canvas insertion", async () => {
    const thumbnailUrl =
      "http://image-assets.soutushenqi.com/jzxz_photo/top_tier_architectural_rendering/demo.png?x-tos-process=image/resize,w_480";
    const originalUrl =
      "http://127.0.0.1:54321/storage/v1/object/public/add-gallery-assets/architecture/default/demo.png";
    const { client, select } = createSubtypeItemsClientMock([
      {
        asset_url: originalUrl,
        height: 1800,
        id: "asset-1",
        source_thumb_url: thumbnailUrl,
        title: "建筑效果图 默认 1",
        width: 2400,
      },
    ]);
    const service = createAddGalleryService({
      getAdminClient: () => client as any,
    });

    await expect(
      service.listSubtypeItems({
        limit: 30,
        offset: 0,
        subtypeId: "default",
      }),
    ).resolves.toEqual({
      subtypeId: "default",
      items: [
        {
          height: 1800,
          id: "asset-1",
          label: "建筑效果图 默认 1",
          thumbnailUrl,
          url: originalUrl,
          width: 2400,
        },
      ],
      nextOffset: null,
      totalCount: 1,
    });

    expect(select).toHaveBeenCalledWith(
      expect.stringContaining("source_thumb_url"),
      expect.any(Object),
    );
  });
});
