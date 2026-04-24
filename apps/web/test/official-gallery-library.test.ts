import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchOfficialGalleryMock, fetchOfficialGallerySubtypeItemsMock } = vi.hoisted(
  () => ({
    fetchOfficialGalleryMock: vi.fn(),
    fetchOfficialGallerySubtypeItemsMock: vi.fn(),
  }),
);

vi.mock("../src/lib/server-api", () => ({
  fetchOfficialGallery: fetchOfficialGalleryMock,
  fetchOfficialGallerySubtypeItems: fetchOfficialGallerySubtypeItemsMock,
}));

import {
  loadOfficialGalleryLibrary,
  loadOfficialGallerySubtypeItemsPage,
} from "../src/lib/official-gallery-library";

describe("loadOfficialGalleryLibrary", () => {
  beforeEach(() => {
    fetchOfficialGalleryMock.mockReset();
    fetchOfficialGallerySubtypeItemsMock.mockReset();
  });

  it("loads the official gallery structure from the authenticated server API", async () => {
    fetchOfficialGalleryMock.mockResolvedValue({
      categories: [
        {
          id: "plants",
          label: "植物配景",
          subtypes: [
            {
              id: "trees",
              label: "绿树",
              assetCount: 240,
              items: [],
            },
          ],
        },
      ],
    });

    await expect(loadOfficialGalleryLibrary("token-gallery")).resolves.toEqual([
      {
        id: "plants",
        label: "植物配景",
        subtypes: [
          {
            id: "trees",
            label: "绿树",
            assetCount: 240,
            items: [],
          },
        ],
      },
    ]);

    expect(fetchOfficialGalleryMock).toHaveBeenCalledWith("token-gallery");
  });

  it("surfaces server failures instead of silently falling back to bundled seeds", async () => {
    fetchOfficialGalleryMock.mockRejectedValue(new Error("gallery unavailable"));

    await expect(loadOfficialGalleryLibrary("token-gallery")).rejects.toThrow(
      "gallery unavailable",
    );
  });

  it("loads subtype items pages from the authenticated server API", async () => {
    fetchOfficialGallerySubtypeItemsMock.mockResolvedValue({
      subtypeId: "trees",
      items: [
        {
          id: "asset-1",
          label: "前景树 1",
          url: "http://127.0.0.1:54321/storage/v1/object/public/official-gallery-assets/plants/trees/asset-1.png",
          width: 1440,
          height: 960,
        },
      ],
      nextOffset: 60,
      totalCount: 240,
    });

    await expect(
      loadOfficialGallerySubtypeItemsPage("token-gallery", "trees", {
        limit: 60,
        offset: 0,
      }),
    ).resolves.toEqual({
      subtypeId: "trees",
      items: [
        {
          id: "asset-1",
          label: "前景树 1",
          url: "http://127.0.0.1:54321/storage/v1/object/public/official-gallery-assets/plants/trees/asset-1.png",
          width: 1440,
          height: 960,
        },
      ],
      nextOffset: 60,
      totalCount: 240,
    });

    expect(fetchOfficialGallerySubtypeItemsMock).toHaveBeenCalledWith(
      "token-gallery",
      "trees",
      {
        limit: 60,
        offset: 0,
      },
    );
  });
});
