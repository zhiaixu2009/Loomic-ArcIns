import { describe, expect, it, vi } from "vitest";

import {
  buildJzxzConfigRequest,
  buildOfficialGalleryRemoteDownloadUrlCandidates,
  buildJzxzQueryByTagRequest,
  buildOfficialGalleryStorageObjectPath,
  buildStsqImagesByTextRequest,
  classifyOfficialGalleryBrowserSearchResult,
  collectSuccessfulOfficialGalleryResults,
  createOfficialGalleryAssetId,
  dedupeOfficialGalleryRemoteAssets,
  findOfficialGalleryStaleIds,
  filterOfficialGalleryCategoriesForSync,
  getRetryableOfficialGalleryRemoteErrorMessage,
  limitOfficialGalleryRemoteAssets,
  parseOfficialGalleryConfigValue,
  reusePersistedOfficialGalleryAsset,
  runOfficialGalleryRetryableOperation,
} from "./official-gallery-sync.js";

describe("official-gallery-sync helpers", () => {
  it("builds the captured JZXZ config request without leaking timestamp into the form body", () => {
    const request = buildJzxzConfigRequest({
      configKey: "jzxz_draw_chartlet_category_config",
      nowMs: 1_776_966_786_116,
    });

    expect(request.url).toBe(
      "https://api.jianzhuxuezhang.com/jzxz/v1/config/queryConfig",
    );
    expect(request.headers).toMatchObject({
      "content-type": "application/x-www-form-urlencoded",
      "product-type": "JZXZ",
      lang: "zh-CN",
      timestamp: "1776966786116",
    });
    expect(request.body.toString()).toBe(
      "product_id=51&version_code=21451&config_key=jzxz_draw_chartlet_category_config&sign=2A76B18A519C8E20159F84ADB973C132",
    );
  });

  it("builds the captured JZXZ query-by-tag request with timestamp only in headers", () => {
    const request = buildJzxzQueryByTagRequest({
      nowMs: 1_776_966_702_008,
      page: 0,
      pageSize: 2,
      tag: "写实植物-前景树",
    });

    expect(request.url).toBe(
      "https://api.jianzhuxuezhang.com/jzxz/api/image/queryByTag",
    );
    expect(request.headers).toMatchObject({
      "content-type": "application/x-www-form-urlencoded",
      "product-type": "JZXZ",
      lang: "zh-CN",
      timestamp: "1776966702008",
    });
    expect(request.body.toString()).toBe(
      "product_id=51&version_code=21451&page=0&page_size=2&tags=%E5%86%99%E5%AE%9E%E6%A4%8D%E7%89%A9-%E5%89%8D%E6%99%AF%E6%A0%91&sign=F6082E800C5EFBCFA1F5BD7EB7E6804C",
    );
  });

  it("builds the STSQ images-by-text request with timestamp in the query string", () => {
    const request = buildStsqImagesByTextRequest({
      nowMs: 1_776_966_709_122,
      text: "免抠-绿树.",
    });

    expect(request.url).toContain(
      "https://community-backend.soutushenqi.com/cykj_community/tools/images_by_text?",
    );
    expect(request.url).toContain("product_id=51");
    expect(request.url).toContain("version_code=21451");
    expect(request.url).toContain("ref=inSiteSearchGallery");
    expect(request.url).toContain("productType=JZXZ");
    expect(request.url).toContain("searchProductType=JZXZ");
    expect(request.url).toContain("searchType=ALL");
    expect(request.url).toContain("searchPlatformType=SELF_DEVELOPED");
    expect(request.url).toContain("timestamp=1776966709035");
    expect(request.url).toContain("text=%E5%85%8D%E6%8A%A0-%E7%BB%BF%E6%A0%91.");
    expect(request.url).toMatch(/sign=[A-F0-9]{32}/);
    expect(request.headers).toMatchObject({
      ref: "inSiteSearchGallery",
      productType: "JZXZ",
      timestamp: "1776966709035",
    });
  });

  it("parses the remote config JSON and preserves category ordering", () => {
    const categories = parseOfficialGalleryConfigValue(
      JSON.stringify([
        {
          name: "植物配景",
          children: [
            { name: "绿树", sourceType: "STSQ", tag: "免抠-绿树." },
            { name: "前景树", sourceType: "JZXZ", tag: "写实植物-前景树" },
          ],
        },
      ]),
    );

    expect(categories).toEqual([
      {
        name: "植物配景",
        children: [
          { name: "绿树", sourceType: "STSQ", tag: "免抠-绿树." },
          { name: "前景树", sourceType: "JZXZ", tag: "写实植物-前景树" },
        ],
      },
    ]);
  });

  it("builds stable asset ids and storage paths from source metadata", () => {
    const assetId = createOfficialGalleryAssetId({
      categoryId: "cat-zhihui",
      sourceAssetId: "726108",
      sourceAssetUrl:
        "http://image-assets.soutushenqi.com/jzxz_photo/realistic_foreground_tree/4e9d09c6-fa06-4f48-80ae-f97e2d68d809.png",
      sourceType: "JZXZ",
      subtypeId: "sub-front-tree",
    });

    expect(assetId).toBe("cat-zhihui-sub-front-tree-jzxz-726108");
    expect(
      buildOfficialGalleryStorageObjectPath({
        assetId,
        categoryId: "cat-zhihui",
        contentType: "image/png",
        sourceAssetUrl:
          "http://image-assets.soutushenqi.com/jzxz_photo/realistic_foreground_tree/4e9d09c6-fa06-4f48-80ae-f97e2d68d809.png?x-tos-process=image/resize,w_480",
        subtypeId: "sub-front-tree",
      }),
    ).toBe(
      "cat-zhihui/sub-front-tree/cat-zhihui-sub-front-tree-jzxz-726108.png",
    );
  });

  it("recognizes transient remote download failures that should be retried", () => {
    expect(
      getRetryableOfficialGalleryRemoteErrorMessage(new Error("HTTP 567")),
    ).toBe("HTTP 567");
    expect(
      getRetryableOfficialGalleryRemoteErrorMessage(
        new Error("fetch failed: socket hang up"),
      ),
    ).toBe("fetch failed: socket hang up");
    expect(
      getRetryableOfficialGalleryRemoteErrorMessage(new Error("HTTP 404")),
    ).toBeNull();
  });

  it("retries transient official gallery operations before succeeding", async () => {
    const sleep = vi.fn(async () => {});
    const onRetry = vi.fn();
    let attempt = 0;

    const result = await runOfficialGalleryRetryableOperation({
      baseDelayMs: 100,
      getRetryMessage: getRetryableOfficialGalleryRemoteErrorMessage,
      maxAttempts: 4,
      onRetry,
      operationName: "remote asset download",
      run: async () => {
        attempt += 1;
        if (attempt < 3) {
          throw new Error("HTTP 567");
        }
        return "uploaded";
      },
      sleep,
    });

    expect(result).toBe("uploaded");
    expect(attempt).toBe(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 200);
  });

  it("collects successful subtype assets and skips failed ones without aborting the batch", async () => {
    const skipped = vi.fn();

    const result = await collectSuccessfulOfficialGalleryResults({
      concurrency: 2,
      items: ["asset-1", "asset-2", "asset-3"],
      mapItem: async (item) => {
        if (item === "asset-2") {
          throw new Error("HTTP 567");
        }
        return `${item}-uploaded`;
      },
      onSkip: skipped,
    });

    expect(result.items).toEqual(["asset-1-uploaded", "asset-3-uploaded"]);
    expect(result.skipped).toEqual([
      {
        error: "HTTP 567",
        index: 1,
        item: "asset-2",
      },
    ]);
    expect(skipped).toHaveBeenCalledWith({
      error: "HTTP 567",
      index: 1,
      item: "asset-2",
    });
  });

  it("classifies browser search results so STSQ can fall back from limit to hybrid search", () => {
    expect(
      classifyOfficialGalleryBrowserSearchResult({
        list: [{ id: "asset-1" }],
        type: "done",
      }),
    ).toEqual({
      items: [{ id: "asset-1" }],
      kind: "done",
    });

    expect(
      classifyOfficialGalleryBrowserSearchResult({
        type: "limit",
      }),
    ).toEqual({
      items: [],
      kind: "limit",
    });

    expect(
      classifyOfficialGalleryBrowserSearchResult({
        type: "noMore",
      }),
    ).toEqual({
      items: [],
      kind: "no_more",
    });

    expect(
      classifyOfficialGalleryBrowserSearchResult({
        list: [{ id: "asset-2" }],
        type: "noMore",
      }),
    ).toEqual({
      items: [{ id: "asset-2" }],
      kind: "done",
    });
  });

  it("deduplicates mixed official gallery assets by their source URL", () => {
    expect(
      dedupeOfficialGalleryRemoteAssets([
        { id: "a-1", largeUrl: "https://cdn.example.com/a.png", width: 10, height: 10 },
        { id: "a-2", largeUrl: "https://cdn.example.com/a.png", width: 10, height: 10 },
        { id: "b-1", largeUrl: "https://cdn.example.com/b.png", width: 10, height: 10 },
      ]),
    ).toEqual([
      { id: "a-1", largeUrl: "https://cdn.example.com/a.png", width: 10, height: 10 },
      { id: "b-1", largeUrl: "https://cdn.example.com/b.png", width: 10, height: 10 },
    ]);
  });

  it("builds download URL candidates with the huaban edge fallback domain", () => {
    expect(
      buildOfficialGalleryRemoteDownloadUrlCandidates(
        "http://gd-hbimg-edge.huaban.com/demo-image",
      ),
    ).toEqual([
      "http://gd-hbimg-edge.huaban.com/demo-image",
      "http://gd-hbimg.huaban.com/demo-image",
    ]);
  });

  it("builds download URL candidates with the decoded baidu src fallback", () => {
    expect(
      buildOfficialGalleryRemoteDownloadUrlCandidates(
        "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fexample.com%2Fraw.png&refer=http%3A%2F%2Fexample.com&app=2002",
      ),
    ).toEqual([
      "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fexample.com%2Fraw.png&refer=http%3A%2F%2Fexample.com&app=2002",
      "http://example.com/raw.png",
    ]);
  });

  it("limits remote assets per subtype when a sync cap is configured", () => {
    expect(limitOfficialGalleryRemoteAssets(["a", "b", "c"], null)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(limitOfficialGalleryRemoteAssets(["a", "b", "c"], 2)).toEqual([
      "a",
      "b",
    ]);
    expect(limitOfficialGalleryRemoteAssets(["a", "b", "c"], 1)).toEqual([
      "a",
    ]);
  });

  it("reuses the previously uploaded local asset metadata during a resync", () => {
    const reused = reusePersistedOfficialGalleryAsset({
      existingAsset: {
        asset_url: "http://127.0.0.1:54321/storage/v1/object/public/official-gallery-assets/cat/sub/asset.png",
        byte_size: 12345,
        mime_type: "image/png",
        storage_bucket: "official-gallery-assets",
        storage_object_path: "cat/sub/asset.png",
      },
      nextAsset: {
        asset_url: "https://remote.example.com/original.png",
        byte_size: 1,
        category_id: "og-cat-demo",
        height: 720,
        id: "og-cat-demo-og-sub-demo-jzxz-123",
        is_active: true,
        mime_type: null,
        sort_order: 8,
        source_asset_id: "123",
        source_asset_url: "https://remote.example.com/original.png",
        source_meta: {
          source: "jianzhuxuezhang",
          title: "updated-title",
        },
        source_tag: "免抠-绿树.",
        source_thumb_url: null,
        source_type: "STSQ",
        storage_bucket: "official-gallery-assets",
        storage_object_path: null,
        subtype_id: "og-sub-demo",
        title: "Updated title",
        width: 1280,
      },
    });

    expect(reused).toMatchObject({
      asset_url:
        "http://127.0.0.1:54321/storage/v1/object/public/official-gallery-assets/cat/sub/asset.png",
      byte_size: 12345,
      mime_type: "image/png",
      sort_order: 8,
      storage_bucket: "official-gallery-assets",
      storage_object_path: "cat/sub/asset.png",
      title: "Updated title",
      width: 1280,
    });
  });

  it("finds stale official gallery ids by the concrete row id instead of the parent subtype", () => {
    expect(
      findOfficialGalleryStaleIds({
        activeIds: ["asset-1", "asset-2", "asset-3"],
        currentIds: ["asset-1"],
      }),
    ).toEqual(["asset-2", "asset-3"]);
  });

  it("filters official gallery categories and subtypes for targeted sync runs", () => {
    expect(
      filterOfficialGalleryCategoriesForSync({
        categories: [
          {
            name: "植物配景",
            children: [
              { name: "绿树", sourceType: "STSQ", tag: "免抠-绿树." },
              { name: "前景树", sourceType: "JZXZ", tag: "写实植物-前景树" },
            ],
          },
          {
            name: "总平素材",
            children: [
              { name: "插画植物", sourceType: "JZXZ", tag: "插画植物" },
              { name: "铺装素材", sourceType: "JZXZ", tag: "铺装素材" },
            ],
          },
        ],
        categoryLabels: ["总平素材"],
        subtypeLabels: ["插画植物"],
      }),
    ).toEqual([
      {
        name: "总平素材",
        children: [
          { name: "插画植物", sourceType: "JZXZ", tag: "插画植物" },
        ],
      },
    ]);
  });
});
