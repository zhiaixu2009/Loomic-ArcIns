import { describe, expect, it, vi } from "vitest";

import { createOfficialGalleryService } from "./official-gallery-service.js";

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

describe("createOfficialGalleryService", () => {
  it("returns thumbnailUrl for lightweight editor-gallery browsing while preserving the original asset url", async () => {
    const thumbnailUrl =
      "http://gd-hbimg-edge.huaban.com/0060a39bfab362cb0e8c5553041958af808fcc794642f-qxGkC8_fw658";
    const originalUrl =
      "http://127.0.0.1:54321/storage/v1/object/public/official-gallery-assets/plants/trees/demo.png";
    const { client, select } = createSubtypeItemsClientMock([
      {
        asset_url: originalUrl,
        height: 960,
        id: "asset-1",
        source_thumb_url: thumbnailUrl,
        title: "前景树 1",
        width: 1440,
      },
    ]);
    const service = createOfficialGalleryService({
      getAdminClient: () => client as any,
    });

    await expect(
      service.listSubtypeItems({
        limit: 15,
        offset: 0,
        subtypeId: "trees",
      }),
    ).resolves.toEqual({
      subtypeId: "trees",
      items: [
        {
          height: 960,
          id: "asset-1",
          label: "前景树 1",
          thumbnailUrl,
          url: originalUrl,
          width: 1440,
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
