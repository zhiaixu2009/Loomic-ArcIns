import crypto from "node:crypto";

export const OFFICIAL_GALLERY_STORAGE_BUCKET = "official-gallery-assets";
export const JZXZ_PRODUCT_TYPE = "JZXZ";
export const JZXZ_COMMON_PARAMS = {
  product_id: "51",
  version_code: "21451",
} as const;
export const JZXZ_GALLERY_CONFIG_KEY = "jzxz_draw_chartlet_category_config";
export const JZXZ_CONFIG_URL =
  "https://api.jianzhuxuezhang.com/jzxz/v1/config/queryConfig";
export const JZXZ_QUERY_BY_TAG_URL =
  "https://api.jianzhuxuezhang.com/jzxz/api/image/queryByTag";
export const STSQ_IMAGES_BY_TEXT_URL =
  "https://community-backend.soutushenqi.com/cykj_community/tools/images_by_text";

export type OfficialGalleryRemoteSourceType = "JZXZ" | "STSQ";

export type OfficialGalleryRemoteSubtype = {
  name: string;
  sourceType: OfficialGalleryRemoteSourceType;
  tag: string;
};

export type OfficialGalleryRemoteCategory = {
  children: OfficialGalleryRemoteSubtype[];
  name: string;
};

export type OfficialGallerySkippedResult<TItem> = {
  item: TItem;
  index: number;
  error: string;
};

export type OfficialGalleryBrowserSearchResult<TItem> =
  | {
      items: TItem[];
      kind: "done";
    }
  | {
      items: [];
      kind: "limit";
    }
  | {
      items: [];
      kind: "no_more";
    }
  | {
      error: string;
      items: [];
      kind: "error";
    };

type OfficialGalleryReusablePersistedAsset = {
  asset_url: string;
  byte_size: number | null;
  mime_type: string | null;
  storage_bucket: string;
  storage_object_path: string | null;
};

type OfficialGalleryPreparedAssetRow = {
  asset_url: string;
  byte_size: number | null;
  mime_type: string | null;
  storage_bucket: string;
  storage_object_path: string | null;
};

function buildMd5Uppercase(input: string) {
  return crypto.createHash("md5").update(input).digest("hex").toUpperCase();
}

function buildRequestSign(params: Record<string, string | number>) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(",") : value}`)
    .join("&");

  return buildMd5Uppercase(`${query}&key=d9fd3ec394`);
}

function buildTimestampHeader(nowMs: number) {
  return String(Math.trunc(nowMs));
}

function buildCommunityTimestamp(nowMs: number) {
  const seconds = Math.trunc(nowMs / 1000);
  const tail = String((seconds ^ 334) % 1000).padStart(3, "0");
  return `${seconds}${tail}`;
}

function buildJzxzHeaders(nowMs: number) {
  return {
    "content-type": "application/x-www-form-urlencoded",
    "product-type": JZXZ_PRODUCT_TYPE,
    lang: "zh-CN",
    timestamp: buildTimestampHeader(nowMs),
  } as const;
}

function buildFormBody(
  orderedEntries: Array<[string, string | number]>,
  signInput: Record<string, string | number>,
) {
  const body = new URLSearchParams();
  for (const [key, value] of orderedEntries) {
    body.set(key, String(value));
  }
  body.set("sign", buildRequestSign(signInput));
  return body;
}

function createStableHash(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 10);
}

function normalizeIdentifierSegment(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function stripQueryAndHash(input: string) {
  const [base] = input.split(/[?#]/, 1);
  return base ?? input;
}

function extensionFromContentType(contentType?: string | null) {
  if (!contentType) {
    return null;
  }

  switch (contentType.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return null;
  }
}

function extensionFromUrl(input: string) {
  const normalized = stripQueryAndHash(input).toLowerCase();
  const match = normalized.match(/\.([a-z0-9]{2,5})$/);
  return match?.[1] ?? null;
}

export function parseOfficialGalleryConfigValue(
  rawValue: string,
): OfficialGalleryRemoteCategory[] {
  const parsed = JSON.parse(rawValue);
  if (!Array.isArray(parsed)) {
    throw new Error("Official gallery config payload must be an array.");
  }

  return parsed.map((category) => {
    if (
      !category ||
      typeof category !== "object" ||
      typeof category.name !== "string" ||
      !Array.isArray(category.children)
    ) {
      throw new Error("Official gallery category payload is invalid.");
    }

    return {
      name: category.name,
      children: category.children.map((child: unknown) => {
        const subtypePayload = child as {
          name?: unknown;
          sourceType?: unknown;
          tag?: unknown;
        };

        if (
          !child ||
          typeof child !== "object" ||
          typeof subtypePayload.name !== "string" ||
          typeof subtypePayload.tag !== "string" ||
          (subtypePayload.sourceType !== "JZXZ" && subtypePayload.sourceType !== "STSQ")
        ) {
          throw new Error("Official gallery subtype payload is invalid.");
        }

        return {
          name: subtypePayload.name,
          sourceType: subtypePayload.sourceType,
          tag: subtypePayload.tag,
        };
      }),
    };
  });
}

export function buildJzxzConfigRequest(options: {
  configKey: string;
  nowMs: number;
}) {
  const params = {
    ...JZXZ_COMMON_PARAMS,
    config_key: options.configKey,
  };

  return {
    url: JZXZ_CONFIG_URL,
    headers: buildJzxzHeaders(options.nowMs),
    body: buildFormBody(
      [
        ["product_id", JZXZ_COMMON_PARAMS.product_id],
        ["version_code", JZXZ_COMMON_PARAMS.version_code],
        ["config_key", options.configKey],
      ],
      params,
    ),
  };
}

export function buildJzxzQueryByTagRequest(options: {
  nowMs: number;
  page: number;
  pageSize: number;
  tag: string;
}) {
  const params = {
    ...JZXZ_COMMON_PARAMS,
    page: String(options.page),
    page_size: String(options.pageSize),
    tags: options.tag,
  };

  return {
    url: JZXZ_QUERY_BY_TAG_URL,
    headers: buildJzxzHeaders(options.nowMs),
    body: buildFormBody(
      [
        ["product_id", JZXZ_COMMON_PARAMS.product_id],
        ["version_code", JZXZ_COMMON_PARAMS.version_code],
        ["page", String(options.page)],
        ["page_size", String(options.pageSize)],
        ["tags", options.tag],
      ],
      params,
    ),
  };
}

export function buildStsqImagesByTextRequest(options: {
  nowMs: number;
  text: string;
}) {
  const timestamp = buildCommunityTimestamp(options.nowMs);
  const params = {
    ...JZXZ_COMMON_PARAMS,
    ref: "inSiteSearchGallery",
    productType: JZXZ_PRODUCT_TYPE,
    searchProductType: JZXZ_PRODUCT_TYPE,
    searchType: "ALL",
    searchPlatformType: "SELF_DEVELOPED",
    text: options.text,
    timestamp,
  };

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value));
  }
  search.set("sign", buildRequestSign(params));

  return {
    url: `${STSQ_IMAGES_BY_TEXT_URL}?${search.toString()}`,
    headers: {
      ref: "inSiteSearchGallery",
      productType: JZXZ_PRODUCT_TYPE,
      timestamp,
    } as const,
  };
}

export function createOfficialGalleryCategoryId(label: string) {
  return `og-cat-${createStableHash(label)}`;
}

export function createOfficialGallerySubtypeId(options: {
  categoryLabel: string;
  subtypeLabel: string;
}) {
  return `og-sub-${createStableHash(`${options.categoryLabel}::${options.subtypeLabel}`)}`;
}

export function createOfficialGalleryAssetId(options: {
  categoryId: string;
  sourceAssetId: string | number | null | undefined;
  sourceAssetUrl: string;
  sourceType: OfficialGalleryRemoteSourceType;
  subtypeId: string;
}) {
  const normalizedSourceType = normalizeIdentifierSegment(options.sourceType) || "asset";
  const normalizedRemoteId =
    options.sourceAssetId != null && String(options.sourceAssetId).trim().length > 0
      ? normalizeIdentifierSegment(String(options.sourceAssetId))
      : createStableHash(options.sourceAssetUrl);

  return [
    options.categoryId,
    options.subtypeId,
    normalizedSourceType,
    normalizedRemoteId,
  ].join("-");
}

export function buildOfficialGalleryStorageObjectPath(options: {
  assetId: string;
  categoryId: string;
  contentType?: string | null;
  sourceAssetUrl: string;
  subtypeId: string;
}) {
  const extension =
    extensionFromContentType(options.contentType) ??
    extensionFromUrl(options.sourceAssetUrl) ??
    "png";

  return `${options.categoryId}/${options.subtypeId}/${options.assetId}.${extension}`;
}

export function buildOfficialGalleryRemoteDownloadUrlCandidates(sourceUrl: string) {
  const candidates = new Set<string>();
  const normalizedSourceUrl = sourceUrl.trim();
  if (normalizedSourceUrl.length === 0) {
    return [];
  }

  candidates.add(normalizedSourceUrl);

  try {
    const parsed = new URL(normalizedSourceUrl);

    if (parsed.hostname === "gd-hbimg-edge.huaban.com") {
      const huabanFallback = new URL(normalizedSourceUrl);
      huabanFallback.hostname = "gd-hbimg.huaban.com";
      candidates.add(huabanFallback.toString());
    }

    if (parsed.hostname === "gimg2.baidu.com" && parsed.pathname.startsWith("/image_search/")) {
      const pathSourceMatch = normalizedSourceUrl.match(/\/image_search\/src=([^&]+)/);
      const rawSourceUrl = pathSourceMatch?.[1]
        ? decodeURIComponent(pathSourceMatch[1])
        : parsed.searchParams.get("src");
      if (rawSourceUrl && rawSourceUrl.trim().length > 0) {
        candidates.add(rawSourceUrl.trim());
      }
    }
  } catch {
    return [...candidates];
  }

  return [...candidates];
}

export function getRetryableOfficialGalleryRemoteErrorMessage(
  error: unknown,
): string | null {
  const message = extractOfficialGalleryRemoteErrorMessage(error);
  if (!message) {
    return null;
  }

  const normalized = message.toLowerCase();
  if (
    normalized.includes("http 429") ||
    normalized.includes("http 500") ||
    normalized.includes("http 502") ||
    normalized.includes("http 503") ||
    normalized.includes("http 504") ||
    normalized.includes("http 567") ||
    normalized.includes("fetch failed") ||
    normalized.includes("socket hang up") ||
    normalized.includes("econnreset") ||
    normalized.includes("etimedout") ||
    normalized.includes("und_err_")
  ) {
    return message;
  }

  return null;
}

export async function runOfficialGalleryRetryableOperation<T>(options: {
  baseDelayMs: number;
  getRetryMessage: (error: unknown) => string | null;
  maxAttempts: number;
  onRetry?: ((details: {
    attempt: number;
    maxAttempts: number;
    message: string;
    operationName: string;
  }) => void) | null;
  operationName: string;
  run: () => Promise<T>;
  sleep?: ((ms: number) => Promise<void>) | null;
}): Promise<T> {
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await options.run();
    } catch (error) {
      const retryMessage = options.getRetryMessage(error);
      if (!retryMessage || attempt === options.maxAttempts) {
        throw error;
      }

      options.onRetry?.({
        attempt,
        maxAttempts: options.maxAttempts,
        message: retryMessage,
        operationName: options.operationName,
      });

      const delayMs = options.baseDelayMs * attempt;
      await (options.sleep ?? delay)(delayMs);
    }
  }

  throw new Error(`Unreachable retry loop for ${options.operationName}.`);
}

export async function collectSuccessfulOfficialGalleryResults<TItem, TResult>(options: {
  concurrency: number;
  items: TItem[];
  mapItem: (item: TItem, index: number) => Promise<TResult>;
  onSkip?: ((skip: OfficialGallerySkippedResult<TItem>) => void) | null;
}) {
  const results = new Array<TResult | null>(options.items.length).fill(null);
  const skipped: OfficialGallerySkippedResult<TItem>[] = [];
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= options.items.length) {
        return;
      }

      const item = options.items[currentIndex]!;
      try {
        results[currentIndex] = await options.mapItem(item, currentIndex);
      } catch (error) {
        const skip = {
          item,
          index: currentIndex,
          error:
            extractOfficialGalleryRemoteErrorMessage(error) ?? "Unknown official gallery sync error.",
        } satisfies OfficialGallerySkippedResult<TItem>;
        skipped.push(skip);
        options.onSkip?.(skip);
      }
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(options.concurrency, options.items.length || 1)) },
    () => worker(),
  );

  await Promise.all(workers);

  return {
    items: results.filter((result): result is TResult => result !== null),
    skipped,
  };
}

export function classifyOfficialGalleryBrowserSearchResult<TItem>(
  payload: unknown,
): OfficialGalleryBrowserSearchResult<TItem> {
  if (Array.isArray(payload)) {
    return payload.length > 0
      ? {
          items: payload as TItem[],
          kind: "done",
        }
      : {
          items: [],
          kind: "no_more",
        };
  }

  if (!payload || typeof payload !== "object") {
    return {
      error: "Official gallery browser search payload is not an object.",
      items: [],
      kind: "error",
    };
  }

  const candidate = payload as {
    data?: unknown;
    error?: unknown;
    errorCode?: unknown;
    list?: unknown;
    message?: unknown;
    type?: unknown;
  };
  const normalizedType =
    typeof candidate.type === "string" ? candidate.type.trim().toLowerCase() : null;

  const items = Array.isArray(candidate.list)
    ? (candidate.list as TItem[])
    : Array.isArray(candidate.data)
      ? (candidate.data as TItem[])
      : null;

  if (items && items.length > 0) {
    return {
      items,
      kind: "done",
    };
  }

  if (normalizedType === "limit") {
    return {
      items: [],
      kind: "limit",
    };
  }

  if (normalizedType === "nomore" || normalizedType === "no_more") {
    return {
      items: [],
      kind: "no_more",
    };
  }

  if (items) {
    return {
      items: [],
      kind: "no_more",
    };
  }

  const errorCode =
    typeof candidate.errorCode === "string" ? candidate.errorCode.trim() : null;
  const messageCandidates = [
    typeof candidate.message === "string" ? candidate.message.trim() : null,
    typeof candidate.error === "string" ? candidate.error.trim() : null,
    errorCode,
  ].filter((value): value is string => Boolean(value));

  return {
    error:
      messageCandidates[0] ??
      `Unrecognized official gallery browser search payload${normalizedType ? ` (${normalizedType})` : ""}.`,
    items: [],
    kind: "error",
  };
}

export function dedupeOfficialGalleryRemoteAssets<
  TItem extends {
    id?: number | string | null;
    largeUrl?: string | null;
    sourceAssetUrl?: string | null;
  },
>(items: TItem[]) {
  const seen = new Set<string>();
  const deduped: TItem[] = [];

  for (const item of items) {
    const keyCandidates = [
      typeof item.largeUrl === "string" ? item.largeUrl.trim() : null,
      typeof item.sourceAssetUrl === "string" ? item.sourceAssetUrl.trim() : null,
      item.id != null ? String(item.id).trim() : null,
    ].filter((value): value is string => Boolean(value));

    const dedupeKey = keyCandidates[0];
    if (!dedupeKey || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    deduped.push(item);
  }

  return deduped;
}

export function limitOfficialGalleryRemoteAssets<TItem>(
  items: TItem[],
  maxAssetsPerSubtype: number | null | undefined,
) {
  if (
    !Number.isFinite(maxAssetsPerSubtype) ||
    maxAssetsPerSubtype == null ||
    maxAssetsPerSubtype <= 0
  ) {
    return items;
  }

  return items.slice(0, maxAssetsPerSubtype);
}

export function reusePersistedOfficialGalleryAsset<
  TAsset extends OfficialGalleryPreparedAssetRow,
>(options: {
  existingAsset: OfficialGalleryReusablePersistedAsset;
  nextAsset: TAsset;
}) {
  return {
    ...options.nextAsset,
    asset_url: options.existingAsset.asset_url,
    byte_size: options.existingAsset.byte_size,
    mime_type: options.existingAsset.mime_type,
    storage_bucket: options.existingAsset.storage_bucket,
    storage_object_path: options.existingAsset.storage_object_path,
  } satisfies TAsset;
}

export function findOfficialGalleryStaleIds(options: {
  activeIds: string[];
  currentIds: string[];
}) {
  const currentIdSet = new Set(options.currentIds);
  return options.activeIds.filter((id) => !currentIdSet.has(id));
}

export function filterOfficialGalleryCategoriesForSync(options: {
  categories: OfficialGalleryRemoteCategory[];
  categoryLabels?: string[] | null;
  subtypeLabels?: string[] | null;
}) {
  const categoryLabelSet =
    options.categoryLabels && options.categoryLabels.length > 0
      ? new Set(options.categoryLabels)
      : null;
  const subtypeLabelSet =
    options.subtypeLabels && options.subtypeLabels.length > 0
      ? new Set(options.subtypeLabels)
      : null;

  return options.categories
    .filter((category) => !categoryLabelSet || categoryLabelSet.has(category.name))
    .map((category) => ({
      ...category,
      children: !subtypeLabelSet
        ? category.children
        : category.children.filter((subtype) => subtypeLabelSet.has(subtype.name)),
    }))
    .filter((category) => category.children.length > 0);
}

function extractOfficialGalleryRemoteErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return null;
}

async function delay(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
