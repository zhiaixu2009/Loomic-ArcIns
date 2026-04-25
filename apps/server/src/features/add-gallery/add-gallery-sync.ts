import crypto from "node:crypto";

export const ADD_GALLERY_STORAGE_BUCKET = "add-gallery-assets";
export const JZXZ_ADD_GALLERY_CONFIG_KEY =
  "jzxz_ai_draw_style_refer_image_tags_config";

export type AddGalleryRemoteSubtype = {
  name: string;
  sourceType: string;
  tag: string;
};

export type AddGalleryRemoteCategory = {
  children?: AddGalleryRemoteSubtype[];
  name: string;
  sourceType?: string;
  tag?: string;
};

export type AddGallerySyncSubtype = {
  label: string;
  sourceMeta: Record<string, unknown>;
  sourceTag: string;
  sourceType: string;
};

export type AddGallerySyncCategory = {
  label: string;
  sourceMeta: Record<string, unknown>;
  subtypes: AddGallerySyncSubtype[];
};

type ReusablePersistedAsset = {
  asset_url: string;
  byte_size: number | null;
  mime_type: string | null;
  storage_bucket: string;
  storage_object_path: string | null;
};

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

export function parseAddGalleryConfigValue(
  rawValue: string,
): AddGallerySyncCategory[] {
  const parsed = JSON.parse(rawValue);
  if (!Array.isArray(parsed)) {
    throw new Error("Add gallery config payload must be an array.");
  }

  return parsed.map((category, categoryIndex) => {
    const payload = category as AddGalleryRemoteCategory;
    if (!payload || typeof payload !== "object" || typeof payload.name !== "string") {
      throw new Error(
        `Add gallery category payload is invalid at index ${categoryIndex}.`,
      );
    }

    const children = Array.isArray(payload.children) ? payload.children : [];
    if (children.length > 0) {
      return {
        label: payload.name,
        sourceMeta: {
          upstreamCategoryName: payload.name,
          upstreamRaw: payload,
        },
        subtypes: children.map((child, childIndex) => {
          if (
            !child ||
            typeof child !== "object" ||
            typeof child.name !== "string" ||
            typeof child.tag !== "string" ||
            typeof child.sourceType !== "string"
          ) {
            throw new Error(
              `Add gallery subtype payload is invalid at ${payload.name}[${childIndex}].`,
            );
          }

          return {
            label: child.name,
            sourceTag: child.tag,
            sourceType: child.sourceType,
            sourceMeta: {
              upstreamCategoryName: payload.name,
              upstreamSubtypeName: child.name,
              upstreamRaw: child,
            },
          };
        }),
      };
    }

    if (typeof payload.tag !== "string" || typeof payload.sourceType !== "string") {
      throw new Error(
        `Leaf add gallery category "${payload.name}" is missing tag/sourceType.`,
      );
    }

    return {
      label: payload.name,
      sourceMeta: {
        upstreamCategoryName: payload.name,
        upstreamRaw: payload,
      },
      subtypes: [
        {
          label: "默认",
          sourceTag: payload.tag,
          sourceType: payload.sourceType,
          sourceMeta: {
            upstreamCategoryName: payload.name,
            upstreamSubtypeName: "默认",
            upstreamRaw: payload,
          },
        },
      ],
    };
  });
}

export function filterAddGalleryCategoriesForSync(
  categories: AddGallerySyncCategory[],
  options: {
    categoryLabels: string[];
    maxAssetsPerSubtype?: number | null;
    subtypeLabels: string[];
  },
): AddGallerySyncCategory[] {
  const categoryFilter = new Set(
    options.categoryLabels.map((label) => label.trim()).filter(Boolean),
  );
  const subtypeFilter = new Set(
    options.subtypeLabels.map((label) => label.trim()).filter(Boolean),
  );

  return categories
    .filter((category) =>
      categoryFilter.size === 0 ? true : categoryFilter.has(category.label),
    )
    .map((category) => ({
      ...category,
      subtypes: category.subtypes.filter((subtype) =>
        subtypeFilter.size === 0 ? true : subtypeFilter.has(subtype.label),
      ),
    }))
    .filter((category) => category.subtypes.length > 0);
}

export function createAddGalleryCategoryId(label: string) {
  return `ag-cat-${createStableHash(label)}`;
}

export function createAddGallerySubtypeId(options: {
  categoryLabel: string;
  subtypeLabel: string;
}) {
  return `ag-sub-${createStableHash(`${options.categoryLabel}::${options.subtypeLabel}`)}`;
}

export function createAddGalleryAssetId(options: {
  categoryId: string;
  sourceAssetId: string | number | null | undefined;
  sourceAssetUrl: string;
  subtypeId: string;
}) {
  const normalizedRemoteId =
    options.sourceAssetId != null && String(options.sourceAssetId).trim().length > 0
      ? normalizeIdentifierSegment(String(options.sourceAssetId))
      : createStableHash(options.sourceAssetUrl);

  return [
    options.categoryId,
    options.subtypeId,
    normalizedRemoteId || createStableHash(options.sourceAssetUrl),
  ].join("-");
}

export function buildAddGalleryStorageObjectPath(options: {
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

export function findAddGalleryStaleIds(options: {
  activeIds: string[];
  currentIds: string[];
}) {
  const currentIds = new Set(options.currentIds);
  return options.activeIds.filter((id) => !currentIds.has(id));
}

export function reusePersistedAddGalleryAsset(
  asset: ReusablePersistedAsset,
  fallbackPublicUrl: string,
) {
  return {
    assetUrl: asset.asset_url?.trim().length ? asset.asset_url : fallbackPublicUrl,
    byteSize: asset.byte_size,
    mimeType: asset.mime_type,
    storageBucket: asset.storage_bucket,
    storageObjectPath: asset.storage_object_path,
  };
}
