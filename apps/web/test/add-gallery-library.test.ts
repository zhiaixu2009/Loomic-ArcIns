import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAddGalleryMock, fetchAddGallerySubtypeItemsMock } = vi.hoisted(
  () => ({
    fetchAddGalleryMock: vi.fn(),
    fetchAddGallerySubtypeItemsMock: vi.fn(),
  }),
);

vi.mock("../src/lib/server-api", () => ({
  fetchAddGallery: fetchAddGalleryMock,
  fetchAddGallerySubtypeItems: fetchAddGallerySubtypeItemsMock,
}));

import {
  loadAddGalleryLibrary,
  loadAddGallerySubtypeItemsPage,
} from "../src/lib/add-gallery-library";

describe("loadAddGalleryLibrary", () => {
  beforeEach(() => {
    fetchAddGalleryMock.mockReset();
    fetchAddGallerySubtypeItemsMock.mockReset();
  });

  it("loads the add-gallery structure from the authenticated server API", async () => {
    fetchAddGalleryMock.mockResolvedValue({
      categories: [
        {
          id: "architecture-render",
          label: "建筑效果图",
          subtypes: [
            {
              id: "default",
              label: "默认",
              assetCount: 240,
              items: [],
            },
          ],
        },
      ],
    });

    await expect(loadAddGalleryLibrary("token-gallery")).resolves.toEqual([
      {
        id: "architecture-render",
        label: "建筑效果图",
        subtypes: [
          {
            id: "default",
            label: "默认",
            assetCount: 240,
            items: [],
          },
        ],
      },
    ]);

    expect(fetchAddGalleryMock).toHaveBeenCalledWith("token-gallery");
  });

  it("surfaces add-gallery server failures instead of silently falling back", async () => {
    fetchAddGalleryMock.mockRejectedValue(new Error("add gallery unavailable"));

    await expect(loadAddGalleryLibrary("token-gallery")).rejects.toThrow(
      "add gallery unavailable",
    );
  });

  it("loads add-gallery subtype item pages from the authenticated server API", async () => {
    fetchAddGallerySubtypeItemsMock.mockResolvedValue({
      subtypeId: "default",
      items: [
        {
          id: "asset-1",
          label: "建筑效果图 默认 1",
          url: "http://127.0.0.1:54321/storage/v1/object/public/add-gallery-assets/architecture-render/default/asset-1.png",
          width: 1600,
          height: 900,
        },
      ],
      nextOffset: 60,
      totalCount: 240,
    });

    await expect(
      loadAddGallerySubtypeItemsPage("token-gallery", "default", {
        limit: 60,
        offset: 0,
      }),
    ).resolves.toEqual({
      subtypeId: "default",
      items: [
        {
          id: "asset-1",
          label: "建筑效果图 默认 1",
          url: "http://127.0.0.1:54321/storage/v1/object/public/add-gallery-assets/architecture-render/default/asset-1.png",
          width: 1600,
          height: 900,
        },
      ],
      nextOffset: 60,
      totalCount: 240,
    });

    expect(fetchAddGallerySubtypeItemsMock).toHaveBeenCalledWith(
      "token-gallery",
      "default",
      {
        limit: 60,
        offset: 0,
      },
    );
  });
});
