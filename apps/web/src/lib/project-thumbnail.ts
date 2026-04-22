import { resolveBrowserAssetUrl } from "./browser-asset-url";

const MOSAIC_WIDTH = 800;
const MOSAIC_HEIGHT = 460;
const MOSAIC_GAP = 10;
const SOURCE_EXPORT_MAX_SIZE = 1200;
const TILE_EXPORT_MAX_SIZE = 900;

type SceneElement = {
  fileId?: string;
  height?: number;
  id: string;
  isDeleted?: boolean;
  type?: string;
  width?: number;
};

type ExportToBlobLike = (options: {
  appState: Record<string, unknown>;
  elements: readonly Record<string, unknown>[];
  files: Record<string, unknown>;
  maxWidthOrHeight: number;
  mimeType: string;
  quality: number;
}) => Promise<Blob>;

export function buildProjectThumbnailSrc(
  thumbnailUrl: string,
  updatedAt?: string | null,
) {
  const resolvedUrl = resolveBrowserAssetUrl(thumbnailUrl);
  const baseOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost";

  try {
    const parsedUrl = new URL(resolvedUrl, baseOrigin);
    if (updatedAt) {
      parsedUrl.searchParams.set("v", updatedAt);
    }
    return parsedUrl.toString();
  } catch {
    if (!updatedAt) {
      return resolvedUrl;
    }

    const separator = resolvedUrl.includes("?") ? "&" : "?";
    return `${resolvedUrl}${separator}v=${encodeURIComponent(updatedAt)}`;
  }
}

export async function createProjectThumbnailBlob(options: {
  appState: Record<string, unknown>;
  elements: readonly Record<string, unknown>[];
  exportToBlob: ExportToBlobLike;
  files: Record<string, unknown>;
}): Promise<Blob | null> {
  const visibleElements = options.elements.filter(isRenderableSceneElement);

  if (visibleElements.length === 0) {
    return exportSceneBlob({
      appState: options.appState,
      elements: [],
      exportToBlob: options.exportToBlob,
      files: options.files,
      maxWidthOrHeight: SOURCE_EXPORT_MAX_SIZE,
    });
  }

  const focusElements = selectProjectThumbnailFocusElements(visibleElements);

  if (focusElements.length < 2) {
    return exportSceneBlob({
      appState: options.appState,
      elements: visibleElements,
      exportToBlob: options.exportToBlob,
      files: options.files,
      maxWidthOrHeight: SOURCE_EXPORT_MAX_SIZE,
    });
  }

  const tileBlobs = await Promise.all(
    focusElements.map((element) =>
      exportSceneBlob({
        appState: options.appState,
        elements: [element as Record<string, unknown>],
        exportToBlob: options.exportToBlob,
        files: options.files,
        maxWidthOrHeight: TILE_EXPORT_MAX_SIZE,
      }),
    ),
  );

  return composeProjectThumbnailMosaic(tileBlobs);
}

export function selectProjectThumbnailFocusElements(
  elements: readonly Record<string, unknown>[],
) {
  const imageElements = elements.filter(isImageSceneElement);

  // Excalidraw keeps scene elements in insertion order, so the trailing image
  // entries map to the most recently added visuals on the board.
  const recentImageElements = imageElements.slice(-4);

  return recentImageElements;
}

async function exportSceneBlob(options: {
  appState: Record<string, unknown>;
  elements: readonly Record<string, unknown>[];
  exportToBlob: ExportToBlobLike;
  files: Record<string, unknown>;
  maxWidthOrHeight: number;
}) {
  return options.exportToBlob({
    elements: options.elements,
    appState: {
      ...options.appState,
      exportBackground: true,
    },
    files: options.files,
    mimeType: "image/webp",
    quality: 0.86,
    maxWidthOrHeight: options.maxWidthOrHeight,
  });
}

function isRenderableSceneElement(element: Record<string, unknown>) {
  const candidate = element as SceneElement;
  return (
    !candidate.isDeleted &&
    typeof candidate.width === "number" &&
    candidate.width > 0 &&
    typeof candidate.height === "number" &&
    candidate.height > 0
  );
}

function isImageSceneElement(element: Record<string, unknown>) {
  const candidate = element as SceneElement;
  return candidate.type === "image" && typeof candidate.fileId === "string";
}

async function composeProjectThumbnailMosaic(tileBlobs: Blob[]) {
  const canvas = document.createElement("canvas");
  canvas.width = MOSAIC_WIDTH;
  canvas.height = MOSAIC_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to initialize project thumbnail canvas.");
  }

  const leftWidth = Math.round(MOSAIC_WIDTH * 0.56);
  const rightWidth = MOSAIC_WIDTH - leftWidth - MOSAIC_GAP;
  const stackedHeight = Math.floor((MOSAIC_HEIGHT - MOSAIC_GAP) / 2);
  const quadWidth = Math.floor((MOSAIC_WIDTH - MOSAIC_GAP) / 2);
  const quadHeight = Math.floor((MOSAIC_HEIGHT - MOSAIC_GAP) / 2);
  const layouts =
    tileBlobs.length >= 4
      ? [
          { height: quadHeight, width: quadWidth, x: 0, y: 0 },
          { height: quadHeight, width: quadWidth, x: quadWidth + MOSAIC_GAP, y: 0 },
          { height: quadHeight, width: quadWidth, x: 0, y: quadHeight + MOSAIC_GAP },
          {
            height: quadHeight,
            width: quadWidth,
            x: quadWidth + MOSAIC_GAP,
            y: quadHeight + MOSAIC_GAP,
          },
        ]
      : tileBlobs.length === 2
      ? [
          { height: MOSAIC_HEIGHT, width: leftWidth, x: 0, y: 0 },
          { height: MOSAIC_HEIGHT, width: rightWidth, x: leftWidth + MOSAIC_GAP, y: 0 },
        ]
      : [
          { height: MOSAIC_HEIGHT, width: leftWidth, x: 0, y: 0 },
          { height: stackedHeight, width: rightWidth, x: leftWidth + MOSAIC_GAP, y: 0 },
          {
            height: MOSAIC_HEIGHT - stackedHeight - MOSAIC_GAP,
            width: rightWidth,
            x: leftWidth + MOSAIC_GAP,
            y: stackedHeight + MOSAIC_GAP,
          },
        ];

  const gradient = context.createLinearGradient(0, 0, MOSAIC_WIDTH, MOSAIC_HEIGHT);
  gradient.addColorStop(0, "#f8fafc");
  gradient.addColorStop(1, "#eef2f7");
  context.fillStyle = gradient;
  context.fillRect(0, 0, MOSAIC_WIDTH, MOSAIC_HEIGHT);

  const images = await Promise.all(tileBlobs.map(loadBlobImage));

  for (let index = 0; index < layouts.length; index += 1) {
    const image = images[index];
    const layout = layouts[index];

    if (!image || !layout) {
      continue;
    }

    context.save();
    context.beginPath();
    context.rect(layout.x, layout.y, layout.width, layout.height);
    context.clip();
    drawImageCover(context, image, layout);
    context.restore();
  }

  return canvasToBlob(canvas, "image/webp", 0.88);
}

async function loadBlobImage(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => {
        resolve();
      };
      image.onerror = () => {
        reject(new Error("Failed to decode project thumbnail tile."));
      };
      image.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource & { height: number; width: number },
  layout: { height: number; width: number; x: number; y: number },
) {
  const scale = Math.max(layout.width / image.width, layout.height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = layout.x + (layout.width - drawWidth) / 2;
  const offsetY = layout.y + (layout.height - drawHeight) / 2;

  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    if (typeof canvas.toBlob === "function") {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to encode project thumbnail blob."));
          return;
        }

        resolve(blob);
      }, mimeType, quality);
      return;
    }

    reject(new Error("Canvas blob encoding is unavailable."));
  });
}
