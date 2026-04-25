"use client";

import {
  ArrowLeft,
  ArrowRight,
  Circle,
  Eraser,
  FlipHorizontal2,
  FlipVertical2,
  Hand,
  ImagePlus,
  LoaderCircle,
  Minus,
  MousePointer2,
  MoveLeft,
  MoveRight,
  Pencil,
  Redo2,
  RotateCcw,
  Shapes,
  Sparkles,
  Square,
  Type,
  Undo2,
  WandSparkles,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import type {
  OfficialGalleryCategory,
  OfficialGalleryItem,
} from "@loomic/shared";

import { fetchImageBlobWithFallback } from "../../lib/canvas-elements";
import { readBlobAsDataUrl } from "../../lib/image-upload-preprocessing";
import {
  loadOfficialGalleryLibrary,
  loadOfficialGallerySubtypeItemsPage,
} from "../../lib/official-gallery-library";

type ImageEditorToolId =
  | "hand"
  | "selection"
  | "ai-convert"
  | "ai-add"
  | "ai-remove"
  | "shape"
  | "arrow"
  | "freedraw"
  | "text"
  | "crop"
  | "more";

type ShapeOverlayKind = "rectangle" | "ellipse" | "arrow" | "line";
type OverlayKind = ShapeOverlayKind | "doodle" | "text" | "sticker";

type EditorRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type EditorPoint = {
  x: number;
  y: number;
};

type BaseOverlay = {
  id: string;
  kind: OverlayKind;
};

type ShapeOverlay = BaseOverlay & {
  fillColor: string;
  height: number;
  kind: ShapeOverlayKind;
  strokeColor: string;
  strokeWidth: number;
  width: number;
  x: number;
  y: number;
};

type DoodleOverlay = BaseOverlay & {
  kind: "doodle";
  points: EditorPoint[];
  strokeColor: string;
  strokeWidth: number;
};

type TextOverlay = BaseOverlay & {
  color: string;
  fontSize: number;
  height: number;
  kind: "text";
  text: string;
  width: number;
  x: number;
  y: number;
};

type StickerOverlay = BaseOverlay & {
  height: number;
  kind: "sticker";
  label: string;
  src: string;
  width: number;
  x: number;
  y: number;
};

type EditorOverlay = ShapeOverlay | DoodleOverlay | TextOverlay | StickerOverlay;

type FilterPreset = "original" | "white-model" | "line-draft" | "su-model";

type EditorSnapshot = {
  cropRect: EditorRect;
  filterPreset: FilterPreset;
  overlays: EditorOverlay[];
  skyStrength: number;
};

type StickerCategoryId =
  | "plants"
  | "people"
  | "traffic"
  | "furniture"
  | "objects"
  | "components"
  | "buildings"
  | "landscape"
  | "facade"
  | "animals"
  | "nature"
  | "site-plan";

type StickerCategory = {
  label: string;
  subcategories: Array<{
    id: string;
    items: StickerItem[];
    label: string;
  }>;
};

type StickerItem = {
  height: number;
  id: string;
  label: string;
  src: string;
  width: number;
};

type StickerLibrarySubcategory = {
  assetCount: number;
  id: string;
  items?: StickerItem[];
  label: string;
};

type StickerLibraryCategoryView = {
  id: string;
  label: string;
  subcategories: StickerLibrarySubcategory[];
};

type StickerItemsPageCacheEntry = {
  error: string | null;
  loadedPages: Record<number, StickerItem[]>;
  loadingPageIndexes: number[];
  totalCount: number;
};

type ExternalEditorActionRequest = {
  prompt: string;
  reason:
    | "manual-remove"
    | "remove-clutter"
    | "remove-furniture"
    | "remove-stains";
};

type CanvasImageEditorModalProps = {
  accessToken: string;
  image: {
    alt: string;
    elementId: string;
    fileName: string;
    source: string;
  } | null;
  onClose: () => void;
  onRequestExternalAction: (request: ExternalEditorActionRequest) => void;
  onSave: (payload: {
    blob: Blob;
    fileName: string;
    height: number;
    width: number;
  }) => Promise<void>;
  onSaveAsCopy: (payload: {
    blob: Blob;
    fileName: string;
    height: number;
    width: number;
  }) => Promise<void>;
  open: boolean;
};

type BaseImageState = {
  dataUrl: string;
  height: number;
  imageElement: HTMLImageElement;
  width: number;
};

type DragOverlayInteraction = {
  kind: "drag-overlay";
  overlayId: string;
  origin: EditorPoint;
  startPoint: EditorPoint;
};

type DrawShapeInteraction = {
  kind: "draw-shape";
  overlayId: string;
  shapeKind: ShapeOverlayKind;
  startPoint: EditorPoint;
};

type DoodleInteraction = {
  kind: "doodle";
  overlayId: string;
};

type CropInteraction = {
  draftRect: EditorRect;
  handle:
    | "create"
    | "move"
    | "resize-e"
    | "resize-n"
    | "resize-ne"
    | "resize-nw"
    | "resize-s"
    | "resize-se"
    | "resize-sw"
    | "resize-w";
  kind: "crop";
  startPoint: EditorPoint;
};

type EditorInteraction =
  | CropInteraction
  | DoodleInteraction
  | DragOverlayInteraction
  | DrawShapeInteraction;

function isShapeOverlay(overlay: EditorOverlay | null | undefined): overlay is ShapeOverlay {
  return Boolean(
    overlay &&
      (overlay.kind === "rectangle" ||
        overlay.kind === "ellipse" ||
        overlay.kind === "arrow" ||
        overlay.kind === "line"),
  );
}

const MODAL_RADIUS_CLASS = "rounded-[10px]";
const STICKERS_PER_PAGE = 15;
const TOOL_RAIL_BUTTON_HEIGHT = 44;
const TOOL_RAIL_BUTTON_GAP = 4;
const TOOL_RAIL_PADDING_TOP = 12;
const POPOVER_PREVIEW_CARD_WIDTH = 76;
const POPOVER_PREVIEW_CARD_HEIGHT = 84;
const DEFAULT_TEXT = "双击编辑文字";
const DEFAULT_SHAPE_COLOR = "#111827";
const DEFAULT_FILL_COLOR = "rgba(17,24,39,0)";
const DEFAULT_STROKE_WIDTH = 5;
const DEFAULT_TEXT_COLOR = "#111827";
const DEFAULT_TEXT_SIZE = 34;
const SHAPE_STROKE_WIDTH_OPTIONS = [1, 2, 3, 5, 8, 12, 16];
const TEXT_SIZE_OPTIONS = [18, 24, 32, 40, 48, 60, 72];
const STAGE_PADDING = 24;
const BLUE_SKY_GRADIENT = {
  bottom: "rgba(255,255,255,0)",
  top: "rgba(126,182,255,0.42)",
};

const TOOL_RAIL: Array<{
  icon: typeof MousePointer2;
  id: ImageEditorToolId;
  label: string;
}> = [
  { id: "hand", label: "抓手", icon: Hand },
  { id: "selection", label: "选择", icon: MousePointer2 },
  { id: "ai-convert", label: "AI转换", icon: Sparkles },
  { id: "ai-add", label: "AI添加", icon: ImagePlus },
  { id: "ai-remove", label: "AI消除", icon: Eraser },
  { id: "shape", label: "形状", icon: Shapes },
  { id: "arrow", label: "箭头", icon: MoveRight },
  { id: "freedraw", label: "涂鸦", icon: Pencil },
  { id: "text", label: "文字", icon: Type },
  { id: "crop", label: "裁剪", icon: Square },
  { id: "more", label: "更多", icon: WandSparkles },
];

const CONVERT_OPTIONS = [
  {
    description: "建筑体量更纯净，材质退场",
    id: "white-model",
    label: "转为白模",
    previewAlt: "convert-white-model-preview",
    previewSrc: "/editor-ai-previews/convert-white-model-card.png",
  },
  {
    description: "提炼轮廓、压低色彩干扰",
    id: "line-draft",
    label: "转为线稿",
    previewAlt: "convert-line-draft-preview",
    previewSrc: "/editor-ai-previews/convert-line-draft-card.png",
  },
  {
    description: "偏 SU 建模表达，弱化贴图",
    id: "su-model",
    label: "转为SU模型",
    previewAlt: "convert-su-model-preview",
    previewSrc: "/editor-ai-previews/convert-su-model-card.png",
  },
] as const;

const AI_ADD_OPTIONS = [
  {
    description: "引导到贴图库快速补景",
    id: "enrich-scene",
    label: "丰富配景",
    previewAlt: "add-enrich-scene-preview",
    previewSrc: "/editor-ai-previews/add-enrich-scene-card.png",
  },
  {
    description: "切换到植物贴图分类",
    id: "add-plants",
    label: "添加植物",
    previewAlt: "add-plants-preview",
    previewSrc: "/editor-ai-previews/add-plants-card.png",
  },
  {
    description: "切换到人物贴图分类",
    id: "add-people",
    label: "添加人物",
    previewAlt: "add-people-preview",
    previewSrc: "/editor-ai-previews/add-people-card.png",
  },
  {
    description: "叠加更明亮的蓝天氛围",
    id: "add-sky",
    label: "添加蓝天",
    previewAlt: "add-sky-preview",
    previewSrc: "/editor-ai-previews/add-sky-card.png",
  },
] as const;

const AI_REMOVE_OPTIONS = [
  {
    description: "通过智能对话发起精确消除",
    id: "manual-remove",
    label: "手动消除",
    previewAlt: "remove-manual-preview",
    previewSrc: "/editor-ai-previews/remove-manual-card.png",
  },
  {
    description: "去掉画面中的零碎杂物",
    id: "remove-clutter",
    label: "消除杂物",
    previewAlt: "remove-clutter-preview",
    previewSrc: "/editor-ai-previews/remove-clutter-card.png",
  },
  {
    description: "去除家具和陈设干扰",
    id: "remove-furniture",
    label: "消除家具",
    previewAlt: "remove-furniture-preview",
    previewSrc: "/editor-ai-previews/remove-furniture-card.png",
  },
  {
    description: "清理污渍、脏点和痕迹",
    id: "remove-stains",
    label: "消除污渍",
    previewAlt: "remove-stains-preview",
    previewSrc: "/editor-ai-previews/remove-stains-card.png",
  },
] as const;

const SHAPE_OPTIONS: Array<{
  icon: typeof Square;
  id: ShapeOverlayKind;
  label: string;
}> = [
  { id: "rectangle", label: "矩形", icon: Square },
  { id: "ellipse", label: "圆形", icon: Circle },
  { id: "arrow", label: "箭头", icon: MoveRight },
  { id: "line", label: "直线", icon: Minus },
];

const CROP_PRESETS: Array<{
  aspectRatio: number | null;
  id: string;
  label: string;
}> = [
  { id: "custom", label: "自定义", aspectRatio: null },
  { id: "16-9", label: "16:9", aspectRatio: 16 / 9 },
  { id: "4-3", label: "4:3", aspectRatio: 4 / 3 },
  { id: "1-1", label: "1:1", aspectRatio: 1 },
];

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeRect(rect: EditorRect): EditorRect {
  const width = Math.max(1, Math.abs(rect.width));
  const height = Math.max(1, Math.abs(rect.height));
  return {
    x: rect.width >= 0 ? rect.x : rect.x - width,
    y: rect.height >= 0 ? rect.y : rect.y - height,
    width,
    height,
  };
}

function deepCloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as EditorSnapshot;
}

function fitWithinBox(size: { height: number; width: number }, box: { height: number; width: number }) {
  const scale = Math.min(box.width / size.width, box.height / size.height);
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

function measureTextOverlay(text: string, fontSize: number) {
  if (typeof document === "undefined") {
    return {
      width: Math.max(fontSize * 2, text.length * fontSize * 0.58),
      height: fontSize * 1.4,
    };
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return {
      width: Math.max(fontSize * 2, text.length * fontSize * 0.58),
      height: fontSize * 1.4,
    };
  }

  context.font = `${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  const metrics = context.measureText(text || DEFAULT_TEXT);
  return {
    width: Math.max(fontSize * 2, metrics.width + fontSize * 0.4),
    height: fontSize * 1.45,
  };
}

async function loadEditorBaseImage(source: string): Promise<BaseImageState> {
  const imageElement = new Image();
  const dataUrl = source.startsWith("data:")
    ? source
    : await readBlobAsDataUrl(await fetchImageBlobWithFallback(source));

  await new Promise<void>((resolve, reject) => {
    imageElement.onload = () => resolve();
    imageElement.onerror = () => reject(new Error("Failed to load image editor source"));
    imageElement.src = dataUrl;
  });

  return {
    dataUrl,
    width: imageElement.naturalWidth || 1,
    height: imageElement.naturalHeight || 1,
    imageElement,
  };
}

async function applyFilterToImage(
  image: BaseImageState,
  preset: FilterPreset,
): Promise<string> {
  if (preset === "original") {
    return image.dataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) {
    return image.dataUrl;
  }

  context.drawImage(image.imageElement, 0, 0, image.width, image.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const grayscaleAt = (offset: number) => grayscale[offset] ?? 0;

  if (preset === "white-model") {
    for (let index = 0; index < pixels.length; index += 4) {
      const luminance =
        (pixels[index] ?? 0) * 0.299 +
        (pixels[index + 1] ?? 0) * 0.587 +
        (pixels[index + 2] ?? 0) * 0.114;
      const lifted = clamp(luminance * 1.08 + 34, 0, 255);
      pixels[index] = clamp(lifted + 10, 0, 255);
      pixels[index + 1] = clamp(lifted + 12, 0, 255);
      pixels[index + 2] = clamp(lifted + 16, 0, 255);
    }
    context.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  }

  const grayscale = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let index = 0, pixelIndex = 0; index < pixels.length; index += 4, pixelIndex += 1) {
    grayscale[pixelIndex] =
      (pixels[index] ?? 0) * 0.299 +
      (pixels[index + 1] ?? 0) * 0.587 +
      (pixels[index + 2] ?? 0) * 0.114;
  }

  if (preset === "line-draft") {
    const output = context.createImageData(canvas.width, canvas.height);
    for (let y = 1; y < canvas.height - 1; y += 1) {
      for (let x = 1; x < canvas.width - 1; x += 1) {
        const index = y * canvas.width + x;
        const gx =
          -grayscaleAt(index - canvas.width - 1) -
          2 * grayscaleAt(index - 1) -
          grayscaleAt(index + canvas.width - 1) +
          grayscaleAt(index - canvas.width + 1) +
          2 * grayscaleAt(index + 1) +
          grayscaleAt(index + canvas.width + 1);
        const gy =
          -grayscaleAt(index - canvas.width - 1) -
          2 * grayscaleAt(index - canvas.width) -
          grayscaleAt(index - canvas.width + 1) +
          grayscaleAt(index + canvas.width - 1) +
          2 * grayscaleAt(index + canvas.width) +
          grayscaleAt(index + canvas.width + 1);
        const magnitude = clamp(Math.sqrt(gx * gx + gy * gy) * 1.4, 0, 255);
        const tone = 255 - magnitude;
        const targetIndex = index * 4;
        output.data[targetIndex] = tone;
        output.data[targetIndex + 1] = tone;
        output.data[targetIndex + 2] = tone;
        output.data[targetIndex + 3] = 255;
      }
    }
    context.putImageData(output, 0, 0);
    return canvas.toDataURL("image/png");
  }

  for (let index = 0, pixelIndex = 0; index < pixels.length; index += 4, pixelIndex += 1) {
    const luminance = grayscale[pixelIndex] ?? 0;
    const posterized = Math.round(luminance / 36) * 36;
    pixels[index] = clamp(posterized * 0.88, 0, 255);
    pixels[index + 1] = clamp(posterized * 0.92 + 8, 0, 255);
    pixels[index + 2] = clamp(posterized + 18, 0, 255);
  }
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function getOverlayBounds(overlay: EditorOverlay): EditorRect {
  if (overlay.kind === "doodle") {
    const xs = overlay.points.map((point) => point.x);
    const ys = overlay.points.map((point) => point.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(1, Math.max(...xs) - Math.min(...xs)),
      height: Math.max(1, Math.max(...ys) - Math.min(...ys)),
    };
  }

  return {
    x: overlay.x,
    y: overlay.y,
    width: overlay.width,
    height: overlay.height,
  };
}

function translateOverlay(overlay: EditorOverlay, delta: EditorPoint): EditorOverlay {
  if (overlay.kind === "doodle") {
    return {
      ...overlay,
      points: overlay.points.map((point) => ({
        x: point.x + delta.x,
        y: point.y + delta.y,
      })),
    };
  }

  return {
    ...overlay,
    x: overlay.x + delta.x,
    y: overlay.y + delta.y,
  };
}

function pointInsideRect(point: EditorPoint, rect: EditorRect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function getCropHandle(point: EditorPoint, rect: EditorRect) {
  const handleSize = 16;
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  const checks: Array<[CropInteraction["handle"], EditorRect]> = [
    ["resize-nw", { x: left - handleSize / 2, y: top - handleSize / 2, width: handleSize, height: handleSize }],
    ["resize-ne", { x: right - handleSize / 2, y: top - handleSize / 2, width: handleSize, height: handleSize }],
    ["resize-sw", { x: left - handleSize / 2, y: bottom - handleSize / 2, width: handleSize, height: handleSize }],
    ["resize-se", { x: right - handleSize / 2, y: bottom - handleSize / 2, width: handleSize, height: handleSize }],
    ["resize-n", { x: centerX - handleSize / 2, y: top - handleSize / 2, width: handleSize, height: handleSize }],
    ["resize-s", { x: centerX - handleSize / 2, y: bottom - handleSize / 2, width: handleSize, height: handleSize }],
    ["resize-w", { x: left - handleSize / 2, y: centerY - handleSize / 2, width: handleSize, height: handleSize }],
    ["resize-e", { x: right - handleSize / 2, y: centerY - handleSize / 2, width: handleSize, height: handleSize }],
  ];

  const matched = checks.find(([, handleRect]) => pointInsideRect(point, handleRect));
  if (matched) {
    return matched[0];
  }

  if (pointInsideRect(point, rect)) {
    return "move";
  }

  return null;
}

function clampRectToBounds(rect: EditorRect, bounds: EditorRect) {
  const normalized = normalizeRect(rect);
  return {
    x: clamp(normalized.x, bounds.x, bounds.x + bounds.width - normalized.width),
    y: clamp(normalized.y, bounds.y, bounds.y + bounds.height - normalized.height),
    width: clamp(normalized.width, 1, bounds.width),
    height: clamp(normalized.height, 1, bounds.height),
  };
}

function applyCropPreset(baseImage: BaseImageState, aspectRatio: number | null) {
  if (!aspectRatio) {
    return {
      x: 0,
      y: 0,
      width: baseImage.width,
      height: baseImage.height,
    };
  }

  const imageAspect = baseImage.width / baseImage.height;
  if (imageAspect > aspectRatio) {
    const width = Math.round(baseImage.height * aspectRatio);
    return {
      x: Math.round((baseImage.width - width) / 2),
      y: 0,
      width,
      height: baseImage.height,
    };
  }

  const height = Math.round(baseImage.width / aspectRatio);
  return {
    x: 0,
    y: Math.round((baseImage.height - height) / 2),
    width: baseImage.width,
    height,
  };
}

function shapePreviewClass(active: boolean) {
  return active
    ? "border-slate-900 bg-slate-900 text-white"
    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
}

function encodeSvg(value: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(value)}`;
}

function createPlaceholderStickerSet(
  prefix: string,
  label: string,
  variant: "building" | "car" | "chair" | "object" | "person" | "site" | "tree",
): StickerItem[] {
  return Array.from({ length: 9 }, (_, index) => {
    const hue = 210 + index * 4;
    const foreground = `hsl(${hue}, 18%, ${variant === "person" ? 28 : 34}%)`;
    const accent = `hsl(${hue}, 22%, 72%)`;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
        <defs>
          <linearGradient id="bg-${prefix}-${index}" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(255,255,255,0)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <rect width="240" height="240" fill="url(#bg-${prefix}-${index})" />
        ${
          variant === "person"
            ? `<circle cx="120" cy="62" r="24" fill="${foreground}" />
               <rect x="96" y="88" width="48" height="88" rx="22" fill="${foreground}" />
               <rect x="76" y="98" width="20" height="74" rx="10" fill="${foreground}" />
               <rect x="144" y="98" width="20" height="74" rx="10" fill="${foreground}" />
               <rect x="95" y="172" width="20" height="56" rx="10" fill="${foreground}" />
               <rect x="125" y="172" width="20" height="56" rx="10" fill="${foreground}" />`
            : variant === "car"
              ? `<rect x="42" y="112" width="156" height="52" rx="18" fill="${foreground}" />
                 <path d="M72 112h92l24 26H52z" fill="${accent}" />
                 <circle cx="84" cy="170" r="18" fill="${foreground}" />
                 <circle cx="156" cy="170" r="18" fill="${foreground}" />`
              : variant === "chair"
                ? `<rect x="72" y="112" width="96" height="30" rx="10" fill="${foreground}" />
                   <rect x="82" y="82" width="76" height="34" rx="10" fill="${accent}" />
                   <rect x="86" y="142" width="16" height="58" rx="8" fill="${foreground}" />
                   <rect x="138" y="142" width="16" height="58" rx="8" fill="${foreground}" />`
                : variant === "building"
                  ? `<rect x="58" y="48" width="124" height="152" rx="10" fill="${foreground}" />
                     <g fill="${accent}">
                       <rect x="76" y="74" width="26" height="24" rx="5" />
                       <rect x="112" y="74" width="26" height="24" rx="5" />
                       <rect x="148" y="74" width="16" height="24" rx="5" />
                       <rect x="76" y="110" width="26" height="24" rx="5" />
                       <rect x="112" y="110" width="26" height="24" rx="5" />
                       <rect x="148" y="110" width="16" height="24" rx="5" />
                       <rect x="76" y="146" width="26" height="24" rx="5" />
                       <rect x="112" y="146" width="26" height="24" rx="5" />
                       <rect x="148" y="146" width="16" height="24" rx="5" />
                     </g>`
                  : variant === "site"
                    ? `<path d="M44 170 110 86l36 44 52-68 18 130H32z" fill="${foreground}" />
                       <circle cx="110" cy="84" r="22" fill="${accent}" />
                       <rect x="102" y="106" width="16" height="42" rx="8" fill="${foreground}" />`
                    : variant === "object"
                      ? `<rect x="64" y="74" width="112" height="122" rx="26" fill="${foreground}" />
                         <circle cx="120" cy="136" r="34" fill="${accent}" />`
                      : `<path d="M120 28c26 22 40 42 40 62 0 12-4 22-12 30 20 12 32 30 32 50 0 32-27 58-60 58S60 202 60 170c0-20 12-38 32-50-8-8-12-18-12-30 0-20 14-40 40-62z" fill="${foreground}" />
                         <rect x="110" y="170" width="20" height="44" rx="10" fill="${accent}" />`
        }
      </svg>
    `;

    return {
      id: `${prefix}-${index + 1}`,
      label: `${label} ${index + 1}`,
      src: encodeSvg(svg),
      width: 180,
      height: 180,
    };
  });
}

const GREEN_TREE_ITEMS: StickerItem[] = [
  "3c3bbe40-22dc-4866-857d-a981edd7f4f1",
  "3cfd6a26-5112-41f8-bb4c-b20600315e53",
  "0c0be577-7207-4d84-80e1-cd1ee4bbb0a0",
  "17b13408-a7c2-44d0-ac24-ae016faf117c",
  "31b3185e-471d-4f48-8ee9-001adb536a64",
  "ba3b502e-8883-4a43-8629-124d4b7a15da",
  "8e3037ed-b08d-4c08-8344-a6ea17b85176",
  "f4b057a4-c053-429f-8654-8c8c23d1871f",
  "8c80222c-ba34-4411-980f-365284b6921f",
  "127a5815-0ee9-4197-9c0e-87ca9d4ce870",
  "9ef2e2ef-ee12-4dd9-a50c-64c7608a4484",
  "fdb9c03c-4ec3-49d3-98cd-fb46c1ef321a",
  "cf0e111b-2806-4a08-9f80-3d3a8bb37081",
  "4407ad9c-3fc4-40a2-834d-880e11a3a20f",
  "0002131d-dd73-4c9b-8b50-a60ccf76d391",
].map((assetId, index) => ({
  id: `green-tree-${index + 1}`,
  label: `绿树 ${index + 1}`,
  src: `https://image-assets.soutushenqi.com/jzxz_photo/green_tree_cutout/${assetId}.png`,
  width: 190,
  height: 190,
}));

const STICKER_LIBRARY: Record<StickerCategoryId, StickerCategory> = {
  plants: {
    label: "植物配景",
    subcategories: [
      { id: "green-tree", label: "绿树", items: GREEN_TREE_ITEMS },
      { id: "foreground-tree", label: "前景树", items: GREEN_TREE_ITEMS.slice(0, 9) },
      { id: "bird-view-tree", label: "鸟瞰树", items: GREEN_TREE_ITEMS.slice(6) },
      { id: "site-plant", label: "总平植物", items: createPlaceholderStickerSet("site-plant", "总平植物", "site") },
    ],
  },
  people: {
    label: "人物配景",
    subcategories: [
      { id: "standing-people", label: "站立人物", items: createPlaceholderStickerSet("people-standing", "站立人物", "person") },
      { id: "walking-people", label: "行走人物", items: createPlaceholderStickerSet("people-walking", "行走人物", "person") },
      { id: "silhouette-people", label: "剪影人物", items: createPlaceholderStickerSet("people-silhouette", "剪影人物", "person") },
    ],
  },
  traffic: {
    label: "交通配景",
    subcategories: [
      { id: "cars", label: "汽车", items: createPlaceholderStickerSet("traffic-car", "汽车", "car") },
      { id: "buses", label: "公交", items: createPlaceholderStickerSet("traffic-bus", "公交", "car") },
      { id: "bikes", label: "自行车", items: createPlaceholderStickerSet("traffic-bike", "自行车", "car") },
    ],
  },
  furniture: {
    label: "室内家具",
    subcategories: [
      { id: "chairs", label: "座椅", items: createPlaceholderStickerSet("furniture-chair", "座椅", "chair") },
      { id: "tables", label: "桌几", items: createPlaceholderStickerSet("furniture-table", "桌几", "chair") },
      { id: "lamps", label: "灯具", items: createPlaceholderStickerSet("furniture-lamp", "灯具", "object") },
    ],
  },
  objects: {
    label: "室内物品",
    subcategories: [
      { id: "decor", label: "摆件", items: createPlaceholderStickerSet("objects-decor", "摆件", "object") },
      { id: "books", label: "书本", items: createPlaceholderStickerSet("objects-books", "书本", "object") },
      { id: "appliance", label: "电器", items: createPlaceholderStickerSet("objects-appliance", "电器", "object") },
    ],
  },
  components: {
    label: "建筑构件",
    subcategories: [
      { id: "stairs", label: "楼梯", items: createPlaceholderStickerSet("components-stairs", "楼梯", "building") },
      { id: "doors", label: "门窗", items: createPlaceholderStickerSet("components-door", "门窗", "building") },
      { id: "facilities", label: "设施", items: createPlaceholderStickerSet("components-facility", "设施", "object") },
    ],
  },
  buildings: {
    label: "城市建筑",
    subcategories: [
      { id: "commercial", label: "商业建筑", items: createPlaceholderStickerSet("buildings-commercial", "商业建筑", "building") },
      { id: "residential", label: "住宅建筑", items: createPlaceholderStickerSet("buildings-residential", "住宅建筑", "building") },
      { id: "tower", label: "高层塔楼", items: createPlaceholderStickerSet("buildings-tower", "高层塔楼", "building") },
    ],
  },
  landscape: {
    label: "景观小品",
    subcategories: [
      { id: "fountain", label: "喷泉", items: createPlaceholderStickerSet("landscape-fountain", "喷泉", "site") },
      { id: "canopy", label: "廊架", items: createPlaceholderStickerSet("landscape-canopy", "廊架", "site") },
      { id: "sculpture", label: "雕塑", items: createPlaceholderStickerSet("landscape-sculpture", "雕塑", "site") },
    ],
  },
  facade: {
    label: "立面图案",
    subcategories: [
      { id: "grids", label: "格栅", items: createPlaceholderStickerSet("facade-grid", "格栅", "object") },
      { id: "panels", label: "肌理板", items: createPlaceholderStickerSet("facade-panel", "肌理板", "object") },
      { id: "graphics", label: "图案", items: createPlaceholderStickerSet("facade-graphic", "图案", "object") },
    ],
  },
  animals: {
    label: "动物配景",
    subcategories: [
      { id: "birds", label: "飞鸟", items: createPlaceholderStickerSet("animals-bird", "飞鸟", "object") },
      { id: "pets", label: "宠物", items: createPlaceholderStickerSet("animals-pet", "宠物", "object") },
      { id: "wild", label: "野生动物", items: createPlaceholderStickerSet("animals-wild", "野生动物", "object") },
    ],
  },
  nature: {
    label: "自然环境",
    subcategories: [
      { id: "mountain", label: "山石", items: createPlaceholderStickerSet("nature-mountain", "山石", "site") },
      { id: "cloud", label: "云层", items: createPlaceholderStickerSet("nature-cloud", "云层", "site") },
      { id: "water", label: "水体", items: createPlaceholderStickerSet("nature-water", "水体", "site") },
    ],
  },
  "site-plan": {
    label: "总平素材",
    subcategories: [
      { id: "road", label: "路网", items: createPlaceholderStickerSet("site-plan-road", "路网", "site") },
      { id: "site-block", label: "地块", items: createPlaceholderStickerSet("site-plan-block", "地块", "site") },
      { id: "annotation", label: "注记", items: createPlaceholderStickerSet("site-plan-note", "注记", "site") },
    ],
  },
};

function mapOfficialGalleryItemToStickerItem(
  item: OfficialGalleryItem,
): StickerItem {
  return {
    id: item.id,
    label: item.label,
    src: item.url,
    width: item.width,
    height: item.height,
  };
}

function buildFallbackStickerLibrary(): StickerLibraryCategoryView[] {
  return (Object.entries(STICKER_LIBRARY) as Array<[string, StickerCategory]>).map(
    ([categoryId, category]) => ({
      id: categoryId,
      label: category.label,
      subcategories: category.subcategories.map((subcategory) => ({
        id: subcategory.id,
        label: subcategory.label,
        assetCount: subcategory.items.length,
        items: subcategory.items,
      })),
    }),
  );
}

function buildOfficialStickerLibrary(
  categories: OfficialGalleryCategory[],
): StickerLibraryCategoryView[] {
  return categories.map((category) => ({
    id: category.id,
    label: category.label,
    subcategories: category.subtypes.map((subtype) => ({
      id: subtype.id,
      label: subtype.label,
      assetCount: subtype.assetCount,
    })),
  }));
}

function createEmptyStickerItemsPageCacheEntry(
  totalCount = 0,
): StickerItemsPageCacheEntry {
  return {
    error: null,
    loadedPages: {},
    loadingPageIndexes: [],
    totalCount,
  };
}

function clearStickerItemsPageLoading(
  entries: Record<string, StickerItemsPageCacheEntry>,
  subtypeId: string,
  pageIndex: number,
): Record<string, StickerItemsPageCacheEntry> {
  const currentEntry = entries[subtypeId];
  if (!currentEntry?.loadingPageIndexes.includes(pageIndex)) {
    return entries;
  }

  return {
    ...entries,
    [subtypeId]: {
      ...currentEntry,
      loadingPageIndexes: currentEntry.loadingPageIndexes.filter(
        (item) => item !== pageIndex,
      ),
    },
  };
}

function findStickerCategoryByKeywords(
  categories: StickerLibraryCategoryView[],
  keywords: string[],
): StickerLibraryCategoryView | null {
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());

  return (
    categories.find((category) => {
      const haystack = `${category.id} ${category.label}`.toLowerCase();
      return normalizedKeywords.some((keyword) => haystack.includes(keyword));
    }) ?? null
  );
}

function findStickerSubcategoryByKeywords(
  subcategories: StickerLibrarySubcategory[],
  keywords: string[],
): StickerLibrarySubcategory | null {
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());

  return (
    subcategories.find((subcategory) => {
      const haystack = `${subcategory.id} ${subcategory.label}`.toLowerCase();
      return normalizedKeywords.some((keyword) => haystack.includes(keyword));
    }) ?? null
  );
}

function renderPopoverPreviewCard(args: {
  label: string;
  onClick: () => void;
  previewAlt: string;
  previewSrc: string;
}) {
  return (
    <button
      type="button"
      aria-label={args.label}
      className={`${MODAL_RADIUS_CLASS} inline-flex shrink-0 overflow-hidden bg-transparent transition-transform duration-150 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2`}
      style={{ width: `${POPOVER_PREVIEW_CARD_WIDTH}px` }}
      onClick={args.onClick}
    >
      <img
        src={args.previewSrc}
        alt={args.previewAlt}
        width={POPOVER_PREVIEW_CARD_WIDTH}
        height={POPOVER_PREVIEW_CARD_HEIGHT}
        className="block rounded-[10px] object-cover shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
        draggable={false}
        style={{
          width: `${POPOVER_PREVIEW_CARD_WIDTH}px`,
          height: `${POPOVER_PREVIEW_CARD_HEIGHT}px`,
          maxWidth: "none",
        }}
      />
    </button>
  );
}

function buildRemovePrompt(reason: ExternalEditorActionRequest["reason"]) {
  switch (reason) {
    case "manual-remove":
      return "请基于当前选中图片执行局部消除，优先无痕移除我想去掉的区域，并保持建筑主体、透视、材质和光影连续。";
    case "remove-clutter":
      return "请基于当前选中图片清理画面中的杂物和零散干扰，优先保留建筑主体、视角、场景尺度和关键材质。";
    case "remove-furniture":
      return "请基于当前选中图片移除家具与陈设干扰，保持空间主体、透视关系、光线和地面材质连续自然。";
    case "remove-stains":
      return "请基于当前选中图片清理污渍、脏点和细碎痕迹，保持建筑边缘、材质肌理和整体氛围自然一致。";
  }
}

export function CanvasImageEditorModal({
  accessToken,
  image,
  onClose,
  onRequestExternalAction,
  onSave,
  onSaveAsCopy,
  open,
}: CanvasImageEditorModalProps) {
  const [baseImage, setBaseImage] = useState<BaseImageState | null>(null);
  const [renderImageUrl, setRenderImageUrl] = useState<string | null>(null);
  const [loadingBaseImage, setLoadingBaseImage] = useState(false);
  const [activeTool, setActiveTool] = useState<ImageEditorToolId>("selection");
  const [activeShapeKind, setActiveShapeKind] = useState<ShapeOverlayKind>("rectangle");
  const [activeStickerCategory, setActiveStickerCategory] = useState<string>("");
  const [activeStickerSubcategoryId, setActiveStickerSubcategoryId] = useState<string>("");
  const [activeStickerPage, setActiveStickerPage] = useState(0);
  const [officialStickerLibrary, setOfficialStickerLibrary] = useState<
    OfficialGalleryCategory[]
  >([]);
  const [officialStickerLibraryLoading, setOfficialStickerLibraryLoading] =
    useState(false);
  const [officialStickerLibraryLoadError, setOfficialStickerLibraryLoadError] =
    useState<string | null>(null);
  const [officialStickerItemsBySubtype, setOfficialStickerItemsBySubtype] =
    useState<Record<string, StickerItemsPageCacheEntry>>({});
  const officialStickerItemsBySubtypeRef = useRef(officialStickerItemsBySubtype);
  const [cropPresetId, setCropPresetId] = useState("custom");
  const [cropDraftRect, setCropDraftRect] = useState<EditorRect | null>(null);
  const [filterPreset, setFilterPreset] = useState<FilterPreset>("original");
  const [skyStrength, setSkyStrength] = useState(0);
  const [shapeStrokeColor, setShapeStrokeColor] = useState(DEFAULT_SHAPE_COLOR);
  const [shapeFillColor, setShapeFillColor] = useState(DEFAULT_FILL_COLOR);
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(DEFAULT_STROKE_WIDTH);
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR);
  const [textSize, setTextSize] = useState(DEFAULT_TEXT_SIZE);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<EditorOverlay[]>([]);
  const [pastSnapshots, setPastSnapshots] = useState<EditorSnapshot[]>([]);
  const [futureSnapshots, setFutureSnapshots] = useState<EditorSnapshot[]>([]);
  const [savingMode, setSavingMode] = useState<"copy" | "replace" | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 960, height: 560 });
  const interactionRef = useRef<EditorInteraction | null>(null);
  const stageViewportRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const undoSnapshotRef = useRef<EditorSnapshot | null>(null);
  const markerId = useId().replace(/:/g, "");
  const persistedStickerLibrary = useMemo(
    () => buildOfficialStickerLibrary(officialStickerLibrary),
    [officialStickerLibrary],
  );
  const stickerLibrary = useMemo(
    () => persistedStickerLibrary,
    [persistedStickerLibrary],
  );
  const usingPersistedStickerLibrary = persistedStickerLibrary.length > 0;

  useEffect(() => {
    officialStickerItemsBySubtypeRef.current = officialStickerItemsBySubtype;
  }, [officialStickerItemsBySubtype]);

  const baseBounds = useMemo<EditorRect | null>(() => {
    if (!baseImage) {
      return null;
    }

    return {
      x: 0,
      y: 0,
      width: baseImage.width,
      height: baseImage.height,
    };
  }, [baseImage]);

  const cropRect = useMemo<EditorRect | null>(() => {
    if (!baseImage) {
      return null;
    }

    return cropDraftRect ?? {
      x: 0,
      y: 0,
      width: baseImage.width,
      height: baseImage.height,
    };
  }, [baseImage, cropDraftRect]);

  const currentSnapshot = useCallback(
    (): EditorSnapshot | null => {
      if (!cropRect) {
        return null;
      }

      return {
        cropRect,
        filterPreset,
        overlays,
        skyStrength,
      };
    },
    [cropRect, filterPreset, overlays, skyStrength],
  );

  const commitUndoSnapshot = useCallback(() => {
    const snapshot = currentSnapshot();
    if (!snapshot) {
      return;
    }

    undoSnapshotRef.current = deepCloneSnapshot(snapshot);
  }, [currentSnapshot]);

  const finalizeUndoSnapshot = useCallback(() => {
    const snapshot = undoSnapshotRef.current;
    const current = currentSnapshot();
    if (!snapshot || !current) {
      undoSnapshotRef.current = null;
      return;
    }

    const before = JSON.stringify(snapshot);
    const after = JSON.stringify(current);
    if (before !== after) {
      setPastSnapshots((previous) => [...previous.slice(-24), snapshot]);
      setFutureSnapshots([]);
    }
    undoSnapshotRef.current = null;
  }, [currentSnapshot]);

  const applySnapshot = useCallback((snapshot: EditorSnapshot) => {
    setCropDraftRect(snapshot.cropRect);
    setFilterPreset(snapshot.filterPreset);
    setOverlays(snapshot.overlays);
    setSkyStrength(snapshot.skyStrength);
    setSelectedOverlayId(null);
    setEditingTextId(null);
  }, []);

  const handleUndo = useCallback(() => {
    if (pastSnapshots.length === 0) {
      return;
    }

    const current = currentSnapshot();
    const previous = pastSnapshots[pastSnapshots.length - 1] ?? null;
    if (!current || !previous) {
      return;
    }

    setPastSnapshots((items) => items.slice(0, -1));
    setFutureSnapshots((items) => [...items, deepCloneSnapshot(current)]);
    applySnapshot(previous);
  }, [applySnapshot, currentSnapshot, pastSnapshots]);

  const handleRedo = useCallback(() => {
    if (futureSnapshots.length === 0) {
      return;
    }

    const current = currentSnapshot();
    const next = futureSnapshots[futureSnapshots.length - 1] ?? null;
    if (!current || !next) {
      return;
    }

    setFutureSnapshots((items) => items.slice(0, -1));
    setPastSnapshots((items) => [...items, deepCloneSnapshot(current)]);
    applySnapshot(next);
  }, [applySnapshot, currentSnapshot, futureSnapshots]);

  useEffect(() => {
    if (!open || accessToken.trim().length === 0 || officialStickerLibrary.length > 0) {
      return;
    }

    let cancelled = false;
    setOfficialStickerLibraryLoading(true);
    setOfficialStickerLibraryLoadError(null);

    void loadOfficialGalleryLibrary(accessToken)
      .then((categories) => {
        if (cancelled) {
          return;
        }

        setOfficialStickerLibrary(categories);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error("[canvas-image-editor] failed to load persisted official sticker library", {
          error,
        });
        setOfficialStickerLibraryLoadError("官方图库加载失败，请稍后重试。");
      })
      .finally(() => {
        if (!cancelled) {
          setOfficialStickerLibraryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, officialStickerLibrary.length, open]);

  useEffect(() => {
    if (!open || !image?.source) {
      return;
    }

    let cancelled = false;
    setLoadingBaseImage(true);
    setStatusMessage(null);

    loadEditorBaseImage(image.source)
      .then((loaded) => {
        if (cancelled) {
          return;
        }

        setBaseImage(loaded);
        setRenderImageUrl(loaded.dataUrl);
        setActiveTool("selection");
        setActiveShapeKind("rectangle");
        setActiveStickerCategory("");
        setActiveStickerSubcategoryId("");
        setActiveStickerPage(0);
        setCropPresetId("custom");
        setCropDraftRect({
          x: 0,
          y: 0,
          width: loaded.width,
          height: loaded.height,
        });
        setFilterPreset("original");
        setSkyStrength(0);
        setOverlays([]);
        setPastSnapshots([]);
        setFutureSnapshots([]);
        setSelectedOverlayId(null);
        setEditingTextId(null);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error("[canvas-image-editor] failed to load base image", {
          error,
          source: image.source,
        });
        setStatusMessage("图片加载失败，请重试。");
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingBaseImage(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [image?.elementId, image?.source, open]);

  useEffect(() => {
    if (!open || !baseImage) {
      return;
    }

    let cancelled = false;
    applyFilterToImage(baseImage, filterPreset)
      .then((nextUrl) => {
        if (!cancelled) {
          setRenderImageUrl(nextUrl);
        }
      })
      .catch((error) => {
        console.error("[canvas-image-editor] failed to build filtered preview", {
          error,
          filterPreset,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [baseImage, filterPreset, open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !stageViewportRef.current) {
      return;
    }

    const element = stageViewportRef.current;
    const updateSize = () => {
      setViewportSize({
        width: Math.max(320, element.clientWidth - STAGE_PADDING * 2),
        height: Math.max(260, element.clientHeight - STAGE_PADDING * 2),
      });
    };

    updateSize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!editingTextId) {
      return;
    }

    textInputRef.current?.focus();
    textInputRef.current?.select();
  }, [editingTextId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (editingTextId) {
          setEditingTextId(null);
          return;
        }
        onClose();
        return;
      }

      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        selectedOverlayId
      ) {
        event.preventDefault();
        commitUndoSnapshot();
        setOverlays((items) => items.filter((overlay) => overlay.id !== selectedOverlayId));
        setSelectedOverlayId(null);
        finalizeUndoSnapshot();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    commitUndoSnapshot,
    editingTextId,
    finalizeUndoSnapshot,
    handleRedo,
    handleUndo,
    onClose,
    open,
    selectedOverlayId,
  ]);

  const stickerCategory =
    stickerLibrary.find((category) => category.id === activeStickerCategory) ??
    stickerLibrary[0] ??
    null;
  const stickerSubcategories = stickerCategory?.subcategories ?? [];
  const activeStickerSubcategory =
    stickerSubcategories.find((subcategory) => subcategory.id === activeStickerSubcategoryId) ??
    stickerSubcategories[0] ??
    null;
  const activeStickerSubtypeCacheEntry = activeStickerSubcategory
    ? officialStickerItemsBySubtype[activeStickerSubcategory.id] ??
      createEmptyStickerItemsPageCacheEntry(activeStickerSubcategory.assetCount)
    : null;
  const pagedStickerItems = useMemo(() => {
    if (!activeStickerSubcategory) {
      return [];
    }

    if (!usingPersistedStickerLibrary) {
      const items = activeStickerSubcategory.items ?? [];
      const startIndex = activeStickerPage * STICKERS_PER_PAGE;
      return items.slice(startIndex, startIndex + STICKERS_PER_PAGE);
    }

    return activeStickerSubtypeCacheEntry?.loadedPages[activeStickerPage] ?? [];
  }, [
    activeStickerPage,
    activeStickerSubcategory,
    activeStickerSubtypeCacheEntry,
    usingPersistedStickerLibrary,
  ]);
  const stickerTotalCount = useMemo(() => {
    if (!activeStickerSubcategory) {
      return 0;
    }

    if (!usingPersistedStickerLibrary) {
      return activeStickerSubcategory.items?.length ?? 0;
    }

    return activeStickerSubtypeCacheEntry?.totalCount ?? activeStickerSubcategory.assetCount;
  }, [
    activeStickerSubcategory,
    activeStickerSubtypeCacheEntry,
    usingPersistedStickerLibrary,
  ]);
  const stickerPageCount = useMemo(() => {
    return Math.max(1, Math.ceil(stickerTotalCount / STICKERS_PER_PAGE));
  }, [stickerTotalCount]);
  const activeStickerPageLoading =
    usingPersistedStickerLibrary &&
    activeStickerSubtypeCacheEntry?.loadingPageIndexes.includes(activeStickerPage) ===
      true;
  const activeStickerPageError =
    usingPersistedStickerLibrary && activeStickerSubtypeCacheEntry
      ? activeStickerSubtypeCacheEntry.error
      : null;

  useEffect(() => {
    const firstCategory = stickerLibrary[0] ?? null;
    const firstSubcategoryId = firstCategory?.subcategories[0]?.id ?? null;
    if (!firstCategory) {
      return;
    }

    if (!stickerLibrary.some((category) => category.id === activeStickerCategory)) {
      setActiveStickerCategory(firstCategory.id);
      if (firstSubcategoryId) {
        setActiveStickerSubcategoryId(firstSubcategoryId);
      }
      setActiveStickerPage(0);
    }
  }, [activeStickerCategory, stickerLibrary]);

  useEffect(() => {
    if (
      !open ||
      !accessToken ||
      !usingPersistedStickerLibrary ||
      !activeStickerSubcategory
    ) {
      return;
    }

    const subtypeId = activeStickerSubcategory.id;
    const pageIndex = activeStickerPage;
    const offset = pageIndex * STICKERS_PER_PAGE;
    const existingEntry = officialStickerItemsBySubtypeRef.current[subtypeId];
    if (
      existingEntry?.loadedPages[pageIndex] ||
      existingEntry?.loadingPageIndexes.includes(pageIndex)
    ) {
      return;
    }

    let cancelled = false;
    setOfficialStickerItemsBySubtype((previous) => {
      const currentEntry =
        previous[subtypeId] ??
        createEmptyStickerItemsPageCacheEntry(activeStickerSubcategory.assetCount);
      if (currentEntry.loadingPageIndexes.includes(pageIndex)) {
        return previous;
      }

      return {
        ...previous,
        [subtypeId]: {
          ...currentEntry,
          error: null,
          loadingPageIndexes: [...currentEntry.loadingPageIndexes, pageIndex],
        },
      };
    });

    void loadOfficialGallerySubtypeItemsPage(accessToken, subtypeId, {
      limit: STICKERS_PER_PAGE,
      offset,
    })
      .then((page) => {
        if (cancelled) {
          return;
        }

        setOfficialStickerItemsBySubtype((previous) => {
          const currentEntry =
            previous[subtypeId] ??
            createEmptyStickerItemsPageCacheEntry(activeStickerSubcategory.assetCount);
          const nextLoadingPages = currentEntry.loadingPageIndexes.filter(
            (item) => item !== pageIndex,
          );

          return {
            ...previous,
            [subtypeId]: {
              ...currentEntry,
              error: null,
              loadedPages: {
                ...currentEntry.loadedPages,
                [pageIndex]: page.items.map(mapOfficialGalleryItemToStickerItem),
              },
              loadingPageIndexes: nextLoadingPages,
              totalCount: page.totalCount,
            },
          };
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error("[canvas-image-editor] failed to load persisted official sticker items page", {
          error,
          offset,
          subtypeId,
        });
        setOfficialStickerItemsBySubtype((previous) => {
          const currentEntry =
            previous[subtypeId] ??
            createEmptyStickerItemsPageCacheEntry(activeStickerSubcategory.assetCount);

          return {
            ...previous,
            [subtypeId]: {
              ...currentEntry,
              error: "官方图库图片加载失败，请稍后重试。",
              loadingPageIndexes: currentEntry.loadingPageIndexes.filter(
                (item) => item !== pageIndex,
              ),
            },
          };
        });
      });

    return () => {
      cancelled = true;
      setOfficialStickerItemsBySubtype((previous) =>
        clearStickerItemsPageLoading(previous, subtypeId, pageIndex),
      );
    };
  }, [
    accessToken,
    activeStickerPage,
    activeStickerSubcategory,
    open,
    usingPersistedStickerLibrary,
  ]);

  useEffect(() => {
    const firstSubcategoryId = stickerCategory?.subcategories[0]?.id ?? null;
    if (!firstSubcategoryId) {
      return;
    }

    if (!stickerSubcategories.some((subcategory) => subcategory.id === activeStickerSubcategoryId)) {
      setActiveStickerSubcategoryId(firstSubcategoryId);
      setActiveStickerPage(0);
    }
  }, [activeStickerCategory, activeStickerSubcategoryId, stickerCategory, stickerSubcategories]);

  const visibleRect = useMemo(() => {
    if (!baseImage || !cropRect) {
      return null;
    }

    if (activeTool === "crop") {
      return {
        x: 0,
        y: 0,
        width: baseImage.width,
        height: baseImage.height,
      };
    }

    return cropRect;
  }, [activeTool, baseImage, cropRect]);

  const stageMetrics = useMemo(() => {
    if (!visibleRect) {
      return null;
    }

    const fitted = fitWithinBox(
      { width: visibleRect.width, height: visibleRect.height },
      viewportSize,
    );
    const scale = fitted.width / visibleRect.width;

    return {
      height: fitted.height,
      scale,
      visibleRect,
      width: fitted.width,
    };
  }, [viewportSize, visibleRect]);

  const getPointFromEvent = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>): EditorPoint | null => {
      const metrics = stageMetrics;
      const viewport = stageViewportRef.current;
      if (!metrics || !viewport) {
        return null;
      }

      const bounds = viewport.getBoundingClientRect();
      const offsetX = bounds.left + (viewport.clientWidth - metrics.width) / 2;
      const offsetY = bounds.top + (viewport.clientHeight - metrics.height) / 2;
      const x = clamp((event.clientX - offsetX) / metrics.scale + metrics.visibleRect.x, metrics.visibleRect.x, metrics.visibleRect.x + metrics.visibleRect.width);
      const y = clamp((event.clientY - offsetY) / metrics.scale + metrics.visibleRect.y, metrics.visibleRect.y, metrics.visibleRect.y + metrics.visibleRect.height);

      return { x, y };
    },
    [stageMetrics],
  );

  const setShapeTool = useCallback((shapeKind: ShapeOverlayKind) => {
    setActiveTool(shapeKind === "arrow" ? "arrow" : "shape");
    setActiveShapeKind(shapeKind);
  }, []);

  const beginTextOverlay = useCallback((point: EditorPoint) => {
    const measured = measureTextOverlay(DEFAULT_TEXT, textSize);
    const nextOverlay: TextOverlay = {
      id: createId("text"),
      kind: "text",
      text: DEFAULT_TEXT,
      color: textColor,
      fontSize: textSize,
      x: point.x,
      y: point.y,
      width: measured.width,
      height: measured.height,
    };

    commitUndoSnapshot();
    setOverlays((items) => [...items, nextOverlay]);
    setSelectedOverlayId(nextOverlay.id);
    setEditingTextId(nextOverlay.id);
    finalizeUndoSnapshot();
  }, [commitUndoSnapshot, finalizeUndoSnapshot, textColor, textSize]);

  const handleStagePointerDown = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return;
    }

    const point = getPointFromEvent(event);
    if (!point || !baseBounds || !cropRect) {
      return;
    }

    if (activeTool === "hand") {
      return;
    }

    if (activeTool === "selection") {
      setSelectedOverlayId(null);
      setEditingTextId(null);
      return;
    }

    if (activeTool === "text") {
      beginTextOverlay(point);
      return;
    }

    if (activeTool === "freedraw") {
      const overlayId = createId("doodle");
      const overlay: DoodleOverlay = {
        id: overlayId,
        kind: "doodle",
        points: [point],
        strokeColor: shapeStrokeColor,
        strokeWidth: shapeStrokeWidth,
      };
      commitUndoSnapshot();
      setOverlays((items) => [...items, overlay]);
      setSelectedOverlayId(overlayId);
      interactionRef.current = {
        kind: "doodle",
        overlayId,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === "crop") {
      const handle = getCropHandle(point, cropRect);
      commitUndoSnapshot();
      interactionRef.current = {
        kind: "crop",
        handle: handle ?? "create",
        startPoint: point,
        draftRect: cropRect,
      };
      if (!handle) {
        const nextRect = {
          x: point.x,
          y: point.y,
          width: 1,
          height: 1,
        };
        setCropDraftRect(nextRect);
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === "shape" || activeTool === "arrow") {
      const overlayId = createId(activeShapeKind);
      const shapeKind = activeTool === "arrow" ? "arrow" : activeShapeKind;
      const overlay: ShapeOverlay = {
        id: overlayId,
        kind: shapeKind,
        x: point.x,
        y: point.y,
        width: 1,
        height: 1,
        strokeColor: shapeStrokeColor,
        fillColor: shapeKind === "line" || shapeKind === "arrow" ? "transparent" : shapeFillColor,
        strokeWidth: shapeStrokeWidth,
      };
      commitUndoSnapshot();
      setOverlays((items) => [...items, overlay]);
      setSelectedOverlayId(overlayId);
      interactionRef.current = {
        kind: "draw-shape",
        overlayId,
        shapeKind,
        startPoint: point,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }, [
    activeShapeKind,
    activeTool,
    baseBounds,
    beginTextOverlay,
    commitUndoSnapshot,
    cropRect,
    getPointFromEvent,
    shapeFillColor,
    shapeStrokeColor,
    shapeStrokeWidth,
  ]);

  const handleStagePointerMove = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const interaction = interactionRef.current;
    const point = getPointFromEvent(event);
    if (!interaction || !point || !baseBounds) {
      return;
    }

    if (interaction.kind === "doodle") {
      setOverlays((items) =>
        items.map((overlay) =>
          overlay.id === interaction.overlayId && overlay.kind === "doodle"
            ? {
                ...overlay,
                points: [...overlay.points, point],
              }
            : overlay,
        ),
      );
      return;
    }

    if (interaction.kind === "draw-shape") {
      const rect = normalizeRect({
        x: interaction.startPoint.x,
        y: interaction.startPoint.y,
        width: point.x - interaction.startPoint.x,
        height: point.y - interaction.startPoint.y,
      });

      setOverlays((items) =>
        items.map((overlay) =>
          overlay.id === interaction.overlayId && overlay.kind !== "doodle"
            ? {
                ...overlay,
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              }
            : overlay,
        ),
      );
      return;
    }

    if (interaction.kind === "drag-overlay") {
      const delta = {
        x: point.x - interaction.startPoint.x,
        y: point.y - interaction.startPoint.y,
      };
      setOverlays((items) =>
        items.map((overlay) =>
          overlay.id === interaction.overlayId
            ? translateOverlay(overlay, {
                x: delta.x - (overlay.kind === "doodle" ? 0 : overlay.x - interaction.origin.x),
                y: delta.y - (overlay.kind === "doodle" ? 0 : overlay.y - interaction.origin.y),
              })
            : overlay,
        ),
      );
      return;
    }

    if (interaction.kind === "crop") {
      const sourceRect = interaction.draftRect;
      let nextRect = sourceRect;
      if (interaction.handle === "move") {
        const delta = {
          x: point.x - interaction.startPoint.x,
          y: point.y - interaction.startPoint.y,
        };
        nextRect = {
          ...sourceRect,
          x: sourceRect.x + delta.x,
          y: sourceRect.y + delta.y,
        };
      } else if (interaction.handle === "create") {
        nextRect = normalizeRect({
          x: interaction.startPoint.x,
          y: interaction.startPoint.y,
          width: point.x - interaction.startPoint.x,
          height: point.y - interaction.startPoint.y,
        });
      } else {
        const rect = { ...sourceRect };
        if (interaction.handle.includes("n")) {
          rect.height += rect.y - point.y;
          rect.y = point.y;
        }
        if (interaction.handle.includes("s")) {
          rect.height = point.y - rect.y;
        }
        if (interaction.handle.includes("w")) {
          rect.width += rect.x - point.x;
          rect.x = point.x;
        }
        if (interaction.handle.includes("e")) {
          rect.width = point.x - rect.x;
        }
        nextRect = normalizeRect(rect);
      }

      setCropDraftRect(clampRectToBounds(nextRect, baseBounds));
    }
  }, [baseBounds, getPointFromEvent]);

  const handleStagePointerUp = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (interactionRef.current) {
      finalizeUndoSnapshot();
    }
    interactionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, [finalizeUndoSnapshot]);

  const handleOverlayPointerDown = useCallback((
    overlayId: string,
    event: ReactPointerEvent<SVGRectElement>,
  ) => {
    if (activeTool !== "selection") {
      return;
    }

    const point = getPointFromEvent(event as unknown as ReactPointerEvent<SVGSVGElement>);
    const overlay = overlays.find((item) => item.id === overlayId) ?? null;
    if (!point || !overlay) {
      return;
    }

    event.stopPropagation();
    commitUndoSnapshot();
    setSelectedOverlayId(overlayId);
    setEditingTextId(null);

    const bounds = getOverlayBounds(overlay);
    interactionRef.current = {
      kind: "drag-overlay",
      overlayId,
      startPoint: point,
      origin: {
        x: bounds.x,
        y: bounds.y,
      },
    };
  }, [activeTool, commitUndoSnapshot, getPointFromEvent, overlays]);

  const updateSelectedText = useCallback((value: string) => {
    setOverlays((items) =>
      items.map((overlay) => {
        if (overlay.id !== editingTextId || overlay.kind !== "text") {
          return overlay;
        }

        const measured = measureTextOverlay(value, overlay.fontSize);
        return {
          ...overlay,
          text: value,
          width: measured.width,
          height: measured.height,
        };
      }),
    );
  }, [editingTextId]);

  const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId) ?? null;
  const selectedOverlayBounds = selectedOverlay ? getOverlayBounds(selectedOverlay) : null;

  useEffect(() => {
    if (!selectedOverlay || selectedOverlay.kind !== "text") {
      return;
    }

    setTextColor(selectedOverlay.color);
    setTextSize(selectedOverlay.fontSize);
  }, [selectedOverlay]);

  useEffect(() => {
    if (!isShapeOverlay(selectedOverlay)) {
      return;
    }

    setShapeStrokeColor(selectedOverlay.strokeColor);
    setShapeFillColor(selectedOverlay.fillColor);
    setShapeStrokeWidth(selectedOverlay.strokeWidth);
  }, [selectedOverlay]);

  const handleShapeStyleChange = useCallback((updates: Partial<Pick<ShapeOverlay, "fillColor" | "strokeColor" | "strokeWidth">>) => {
    setOverlays((items) =>
      items.map((overlay) => {
        if (overlay.id !== selectedOverlayId) {
          return overlay;
        }
        if (overlay.kind === "text" || overlay.kind === "sticker" || overlay.kind === "doodle") {
          return overlay;
        }
        return { ...overlay, ...updates };
      }),
    );
  }, [selectedOverlayId]);

  const handleTextStyleChange = useCallback((updates: Partial<Pick<TextOverlay, "color" | "fontSize">>) => {
    setOverlays((items) =>
      items.map((overlay) => {
        if (overlay.id !== selectedOverlayId || overlay.kind !== "text") {
          return overlay;
        }
        const nextFontSize = updates.fontSize ?? overlay.fontSize;
        const nextText = overlay.text;
        const measured = measureTextOverlay(nextText, nextFontSize);
        return {
          ...overlay,
          ...updates,
          width: measured.width,
          height: measured.height,
        };
      }),
    );
  }, [selectedOverlayId]);

  const insertSticker = useCallback((item: StickerItem) => {
    if (!cropRect) {
      return;
    }

    const size = Math.min(cropRect.width, cropRect.height) * 0.22;
    const aspectRatio = item.width / item.height;
    const width = aspectRatio >= 1 ? size : size * aspectRatio;
    const height = aspectRatio >= 1 ? size / aspectRatio : size;
    const nextSticker: StickerOverlay = {
      id: createId("sticker"),
      kind: "sticker",
      label: item.label,
      src: item.src,
      x: cropRect.x + cropRect.width / 2 - width / 2,
      y: cropRect.y + cropRect.height / 2 - height / 2,
      width,
      height,
    };

    commitUndoSnapshot();
    setOverlays((items) => [...items, nextSticker]);
    setSelectedOverlayId(nextSticker.id);
    finalizeUndoSnapshot();
  }, [commitUndoSnapshot, cropRect, finalizeUndoSnapshot]);

  const handleStickerLocalUpload = useCallback(async (files: FileList | null) => {
    const file = files?.[0] ?? null;
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readBlobAsDataUrl(file);
      const imageElement = new Image();
      await new Promise<void>((resolve, reject) => {
        imageElement.onload = () => resolve();
        imageElement.onerror = () => reject(new Error("Failed to load local sticker"));
        imageElement.src = dataUrl;
      });

      insertSticker({
        id: createId("local-sticker"),
        label: file.name.replace(/\.[^.]+$/, ""),
        src: dataUrl,
        width: imageElement.naturalWidth || 160,
        height: imageElement.naturalHeight || 160,
      });
      setStatusMessage("已将本地贴图加入画面。");
    } catch (error) {
      console.error("[canvas-image-editor] failed to import local sticker", error);
      setStatusMessage("本地贴图加载失败，请重试。");
    }
  }, [insertSticker]);

  const handleApplyConvertOption = useCallback((preset: FilterPreset) => {
    commitUndoSnapshot();
    setFilterPreset(preset);
    finalizeUndoSnapshot();
    setActiveTool("selection");
    setStatusMessage("已应用新的图片表达效果。");
  }, [commitUndoSnapshot, finalizeUndoSnapshot]);

  const peopleStickerTarget = useMemo(() => {
    const targetCategory =
      findStickerCategoryByKeywords(stickerLibrary, [
        "人物",
        "people",
        "person",
        "人",
      ]) ??
      stickerLibrary[0] ??
      null;
    const targetSubcategory =
      findStickerSubcategoryByKeywords(targetCategory?.subcategories ?? [], [
        "人物",
        "站",
        "people",
        "person",
        "人",
      ]) ??
      targetCategory?.subcategories[0] ??
      null;

    return {
      categoryId: targetCategory?.id ?? activeStickerCategory,
      subcategoryId: targetSubcategory?.id ?? activeStickerSubcategoryId,
    };
  }, [
    activeStickerCategory,
    activeStickerSubcategoryId,
    stickerLibrary,
  ]);

  const plantStickerTarget = useMemo(() => {
    const targetCategory =
      findStickerCategoryByKeywords(stickerLibrary, [
        "植物",
        "树",
        "plant",
        "tree",
        "green",
      ]) ??
      stickerLibrary[0] ??
      null;
    const targetSubcategory =
      findStickerSubcategoryByKeywords(targetCategory?.subcategories ?? [], [
        "植物",
        "树",
        "plant",
        "tree",
        "green",
      ]) ??
      targetCategory?.subcategories[0] ??
      null;

    return {
      categoryId: targetCategory?.id ?? activeStickerCategory,
      subcategoryId: targetSubcategory?.id ?? activeStickerSubcategoryId,
    };
  }, [
    activeStickerCategory,
    activeStickerSubcategoryId,
    stickerLibrary,
  ]);

  const handleApplyAddOption = useCallback((optionId: (typeof AI_ADD_OPTIONS)[number]["id"]) => {
    if (optionId === "add-people") {
      setActiveStickerCategory(peopleStickerTarget.categoryId);
      setActiveStickerSubcategoryId(peopleStickerTarget.subcategoryId);
      setActiveStickerPage(0);
      setStatusMessage("已切换到人物贴图。");
      return;
    }

    if (optionId === "add-sky") {
      commitUndoSnapshot();
      setSkyStrength(0.5);
      finalizeUndoSnapshot();
      setStatusMessage("已增强蓝天氛围，可继续裁剪或保存。");
      return;
    }

    setActiveStickerCategory(plantStickerTarget.categoryId);
    setActiveStickerSubcategoryId(plantStickerTarget.subcategoryId);
    setActiveStickerPage(0);
    setStatusMessage("已切换到植物贴图。");
  }, [
    commitUndoSnapshot,
    finalizeUndoSnapshot,
    peopleStickerTarget.categoryId,
    peopleStickerTarget.subcategoryId,
    plantStickerTarget.categoryId,
    plantStickerTarget.subcategoryId,
  ]);

  const handleApplyRemoveOption = useCallback((reason: ExternalEditorActionRequest["reason"]) => {
    setStatusMessage("已切换到智能消除流程。");
    onRequestExternalAction({
      reason,
      prompt: buildRemovePrompt(reason),
    });
  }, [onRequestExternalAction]);

  const handleApplyCrop = useCallback(() => {
    if (!baseImage || !cropDraftRect) {
      return;
    }

    commitUndoSnapshot();
    setCropDraftRect(clampRectToBounds(cropDraftRect, {
      x: 0,
      y: 0,
      width: baseImage.width,
      height: baseImage.height,
    }));
    finalizeUndoSnapshot();
    setActiveTool("selection");
    setCropPresetId("custom");
    setStatusMessage("已更新裁剪区域。");
  }, [baseImage, commitUndoSnapshot, cropDraftRect, finalizeUndoSnapshot]);

  const handleCropPresetChange = useCallback((presetId: string) => {
    setCropPresetId(presetId);
    if (!baseImage) {
      return;
    }

    const preset = CROP_PRESETS.find((item) => item.id === presetId) ?? null;
    setCropDraftRect(applyCropPreset(baseImage, preset?.aspectRatio ?? null));
  }, [baseImage]);

  const renderOverlay = useCallback((overlay: EditorOverlay) => {
    if (overlay.kind === "rectangle") {
      return (
        <rect
          x={overlay.x}
          y={overlay.y}
          width={overlay.width}
          height={overlay.height}
          fill={overlay.fillColor}
          stroke={overlay.strokeColor}
          strokeWidth={overlay.strokeWidth}
          rx={8}
        />
      );
    }

    if (overlay.kind === "ellipse") {
      return (
        <ellipse
          cx={overlay.x + overlay.width / 2}
          cy={overlay.y + overlay.height / 2}
          rx={overlay.width / 2}
          ry={overlay.height / 2}
          fill={overlay.fillColor}
          stroke={overlay.strokeColor}
          strokeWidth={overlay.strokeWidth}
        />
      );
    }

    if (overlay.kind === "line") {
      return (
        <line
          x1={overlay.x}
          y1={overlay.y}
          x2={overlay.x + overlay.width}
          y2={overlay.y + overlay.height}
          stroke={overlay.strokeColor}
          strokeWidth={overlay.strokeWidth}
          strokeLinecap="round"
        />
      );
    }

    if (overlay.kind === "arrow") {
      return (
        <line
          x1={overlay.x}
          y1={overlay.y}
          x2={overlay.x + overlay.width}
          y2={overlay.y + overlay.height}
          stroke={overlay.strokeColor}
          strokeWidth={overlay.strokeWidth}
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
        />
      );
    }

    if (overlay.kind === "doodle") {
      return (
        <polyline
          points={overlay.points.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke={overlay.strokeColor}
          strokeWidth={overlay.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }

    if (overlay.kind === "sticker") {
      return (
        <image
          href={overlay.src}
          x={overlay.x}
          y={overlay.y}
          width={overlay.width}
          height={overlay.height}
          preserveAspectRatio="none"
        />
      );
    }

    if (overlay.kind === "text") {
      return (
        <text
          x={overlay.x}
          y={overlay.y + overlay.fontSize}
          fill={overlay.color}
          fontFamily='"PingFang SC", "Microsoft YaHei", sans-serif'
          fontSize={overlay.fontSize}
          fontWeight={600}
        >
          {overlay.text}
        </text>
      );
    }

    return null;
  }, [markerId]);

  const selectedOverlayScreenRect = useMemo(() => {
    if (!selectedOverlayBounds || !stageMetrics) {
      return null;
    }

    return {
      left: (selectedOverlayBounds.x - stageMetrics.visibleRect.x) * stageMetrics.scale,
      top: (selectedOverlayBounds.y - stageMetrics.visibleRect.y) * stageMetrics.scale,
      width: selectedOverlayBounds.width * stageMetrics.scale,
      height: selectedOverlayBounds.height * stageMetrics.scale,
    };
  }, [selectedOverlayBounds, stageMetrics]);

  const editingTextOverlay = useMemo<TextOverlay | null>(() => {
    if (!editingTextId) {
      return null;
    }

    const overlay =
      overlays.find(
        (item): item is TextOverlay =>
          item.id === editingTextId && item.kind === "text",
      ) ?? null;

    return overlay;
  }, [editingTextId, overlays]);

  const editingTextScreenRect = useMemo(() => {
    if (!editingTextOverlay || !stageMetrics) {
      return null;
    }

    return {
      left: (editingTextOverlay.x - stageMetrics.visibleRect.x) * stageMetrics.scale,
      top: (editingTextOverlay.y - stageMetrics.visibleRect.y) * stageMetrics.scale,
      width: Math.max(120, editingTextOverlay.width * stageMetrics.scale),
      height: Math.max(60, editingTextOverlay.height * stageMetrics.scale + 12),
    };
  }, [editingTextOverlay, stageMetrics]);

  const saveEditorImage = useCallback(async (mode: "copy" | "replace") => {
    if (!baseImage || !cropRect || !image) {
      return;
    }

    setSavingMode(mode);
    setStatusMessage(mode === "replace" ? "正在保存图片..." : "正在生成副本...");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(cropRect.width));
      canvas.height = Math.max(1, Math.round(cropRect.height));
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Image editor canvas context is unavailable");
      }

      const filteredUrl = await applyFilterToImage(baseImage, filterPreset);
      const renderImage = new Image();
      await new Promise<void>((resolve, reject) => {
        renderImage.onload = () => resolve();
        renderImage.onerror = () => reject(new Error("Failed to load rasterized source"));
        renderImage.src = filteredUrl;
      });

      context.save();
      context.beginPath();
      context.rect(0, 0, canvas.width, canvas.height);
      context.clip();
      context.drawImage(
        renderImage,
        cropRect.x,
        cropRect.y,
        cropRect.width,
        cropRect.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      if (skyStrength > 0) {
        const gradient = context.createLinearGradient(0, 0, 0, canvas.height * 0.56);
        gradient.addColorStop(0, `rgba(126,182,255,${skyStrength})`);
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height * 0.56);
      }

      const visibleOverlays = overlays.filter((overlay) => {
        const bounds = getOverlayBounds(overlay);
        return !(
          bounds.x + bounds.width < cropRect.x ||
          bounds.x > cropRect.x + cropRect.width ||
          bounds.y + bounds.height < cropRect.y ||
          bounds.y > cropRect.y + cropRect.height
        );
      });

      for (const overlay of visibleOverlays) {
        context.save();
        if (overlay.kind === "rectangle") {
          context.lineWidth = overlay.strokeWidth;
          context.strokeStyle = overlay.strokeColor;
          context.fillStyle = overlay.fillColor === "transparent" ? "rgba(0,0,0,0)" : overlay.fillColor;
          if (overlay.fillColor !== "transparent") {
            context.fillRect(
              overlay.x - cropRect.x,
              overlay.y - cropRect.y,
              overlay.width,
              overlay.height,
            );
          }
          context.strokeRect(
            overlay.x - cropRect.x,
            overlay.y - cropRect.y,
            overlay.width,
            overlay.height,
          );
        } else if (overlay.kind === "ellipse") {
          context.lineWidth = overlay.strokeWidth;
          context.strokeStyle = overlay.strokeColor;
          context.fillStyle = overlay.fillColor === "transparent" ? "rgba(0,0,0,0)" : overlay.fillColor;
          context.beginPath();
          context.ellipse(
            overlay.x - cropRect.x + overlay.width / 2,
            overlay.y - cropRect.y + overlay.height / 2,
            overlay.width / 2,
            overlay.height / 2,
            0,
            0,
            Math.PI * 2,
          );
          if (overlay.fillColor !== "transparent") {
            context.fill();
          }
          context.stroke();
        } else if (overlay.kind === "line" || overlay.kind === "arrow") {
          context.lineWidth = overlay.strokeWidth;
          context.strokeStyle = overlay.strokeColor;
          context.lineCap = "round";
          context.beginPath();
          context.moveTo(overlay.x - cropRect.x, overlay.y - cropRect.y);
          context.lineTo(
            overlay.x - cropRect.x + overlay.width,
            overlay.y - cropRect.y + overlay.height,
          );
          context.stroke();
          if (overlay.kind === "arrow") {
            const angle = Math.atan2(overlay.height, overlay.width);
            const arrowLength = Math.max(14, overlay.strokeWidth * 3.4);
            const endX = overlay.x - cropRect.x + overlay.width;
            const endY = overlay.y - cropRect.y + overlay.height;
            context.beginPath();
            context.moveTo(endX, endY);
            context.lineTo(
              endX - arrowLength * Math.cos(angle - Math.PI / 6),
              endY - arrowLength * Math.sin(angle - Math.PI / 6),
            );
            context.lineTo(
              endX - arrowLength * Math.cos(angle + Math.PI / 6),
              endY - arrowLength * Math.sin(angle + Math.PI / 6),
            );
            context.closePath();
            context.fillStyle = overlay.strokeColor;
            context.fill();
          }
        } else if (overlay.kind === "doodle") {
          context.lineWidth = overlay.strokeWidth;
          context.strokeStyle = overlay.strokeColor;
          context.lineCap = "round";
          context.lineJoin = "round";
          context.beginPath();
          overlay.points.forEach((point, index) => {
            const x = point.x - cropRect.x;
            const y = point.y - cropRect.y;
            if (index === 0) {
              context.moveTo(x, y);
            } else {
              context.lineTo(x, y);
            }
          });
          context.stroke();
        } else if (overlay.kind === "text") {
          context.fillStyle = overlay.color;
          context.font = `600 ${overlay.fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
          context.textBaseline = "top";
          context.fillText(
            overlay.text,
            overlay.x - cropRect.x,
            overlay.y - cropRect.y,
          );
        } else if (overlay.kind === "sticker") {
          const sticker = new Image();
          await new Promise<void>((resolve, reject) => {
            sticker.onload = () => resolve();
            sticker.onerror = () => reject(new Error(`Failed to load sticker ${overlay.label}`));
            sticker.src = overlay.src;
          });
          context.drawImage(
            sticker,
            overlay.x - cropRect.x,
            overlay.y - cropRect.y,
            overlay.width,
            overlay.height,
          );
        }
        context.restore();
      }
      context.restore();

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => {
          if (value) {
            resolve(value);
            return;
          }
          reject(new Error("Failed to export edited image"));
        }, "image/png");
      });

      const payload = {
        blob,
        fileName: image.fileName.replace(/\.png$/i, "") + "-edited.png",
        width: canvas.width,
        height: canvas.height,
      };

      if (mode === "replace") {
        await onSave(payload);
      } else {
        await onSaveAsCopy(payload);
      }

      setStatusMessage(mode === "replace" ? "图片已保存到画板。" : "已生成新的图片副本。");
      onClose();
    } catch (error) {
      console.error("[canvas-image-editor] failed to persist edited image", {
        error,
        mode,
      });
      setStatusMessage("保存失败，请稍后重试。");
    } finally {
      setSavingMode(null);
    }
  }, [baseImage, cropRect, filterPreset, image, onClose, onSave, onSaveAsCopy, overlays, skyStrength]);

  if (!open || !image) {
    return null;
  }

  const popoverTool = activeTool;
  const popoverToolIndex = TOOL_RAIL.findIndex((tool) => tool.id === popoverTool);
  const floatingPopoverStyle =
    popoverToolIndex >= 0
      ? {
          top:
            TOOL_RAIL_PADDING_TOP +
            popoverToolIndex * (TOOL_RAIL_BUTTON_HEIGHT + TOOL_RAIL_BUTTON_GAP),
        }
      : null;
  const shapeStrokeWidthPercent = ((shapeStrokeWidth - 1) / 15) * 100;
  const topToolbar =
    activeTool === "crop" ? (
      <div className={`${MODAL_RADIUS_CLASS} border border-slate-200 bg-white/96 px-3 py-2 shadow-sm backdrop-blur`}>
        <div className="flex items-center gap-2">
          <select
            aria-label="裁剪比例"
            className={`${MODAL_RADIUS_CLASS} border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none`}
            value={cropPresetId}
            onChange={(event) => handleCropPresetChange(event.target.value)}
          >
            {CROP_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`${MODAL_RADIUS_CLASS} bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800`}
            onClick={handleApplyCrop}
          >
            裁剪
          </button>
        </div>
      </div>
    ) : activeTool === "shape" || activeTool === "arrow" || (selectedOverlay && !["text", "doodle", "sticker"].includes(selectedOverlay.kind)) ? (
      <div className={`${MODAL_RADIUS_CLASS} flex items-center gap-2 border border-slate-200 bg-white/96 px-3 py-2 shadow-sm backdrop-blur`}>
        <div className={`${MODAL_RADIUS_CLASS} flex items-center gap-1 bg-slate-900 p-1`}>
          <button
            type="button"
            aria-label="描边模式"
            className={`${MODAL_RADIUS_CLASS} inline-flex h-8 w-8 items-center justify-center transition-colors ${
              shapeFillColor === "transparent" ? "bg-white text-slate-900" : "bg-slate-900 text-white/80 hover:bg-slate-800"
            }`}
            onClick={() => {
              setShapeFillColor("transparent");
              handleShapeStyleChange({ fillColor: "transparent" });
            }}
          >
            <span className="h-4 w-4 rounded-[4px] border-2 border-current" />
          </button>
          <button
            type="button"
            aria-label="切换填充"
            className={`${MODAL_RADIUS_CLASS} inline-flex h-8 w-8 items-center justify-center transition-colors ${
              shapeFillColor === "transparent" ? "bg-slate-900 text-white/80 hover:bg-slate-800" : "bg-white text-slate-900"
            }`}
            onClick={() => {
              const nextFillColor =
                shapeFillColor === "transparent" ? "rgba(17,24,39,0.18)" : "transparent";
              setShapeFillColor(nextFillColor);
              handleShapeStyleChange({ fillColor: nextFillColor });
            }}
          >
            <span className="h-4 w-4 rounded-[4px] bg-current" />
          </button>
        </div>
        <label className={`${MODAL_RADIUS_CLASS} relative inline-flex h-8 w-9 cursor-pointer items-center justify-center overflow-hidden border border-slate-200 bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]`}>
          <input
            aria-label="描边颜色"
            type="color"
            className="absolute inset-0 cursor-pointer opacity-0"
            value={shapeStrokeColor}
            onChange={(event) => {
              setShapeStrokeColor(event.target.value);
              handleShapeStyleChange({ strokeColor: event.target.value });
            }}
          />
          <span
            className="h-5 w-7 rounded-[5px] border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
            style={{ backgroundColor: shapeStrokeColor }}
          />
        </label>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="shape-stroke-width">
            形状线宽
          </label>
          <input
            id="shape-stroke-width"
            aria-label="形状线宽"
            type="range"
            min={1}
            max={16}
            step={1}
            list="shape-stroke-width-ticks"
            className="h-2 w-40 cursor-pointer appearance-none rounded-full bg-transparent accent-slate-900"
            style={{
              background: `linear-gradient(90deg, #0f172a 0%, #0f172a ${shapeStrokeWidthPercent}%, #cbd5e1 ${shapeStrokeWidthPercent}%, #cbd5e1 100%)`,
            }}
            value={shapeStrokeWidth}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setShapeStrokeWidth(nextValue);
              handleShapeStyleChange({ strokeWidth: nextValue });
            }}
          />
          <datalist id="shape-stroke-width-ticks">
            {SHAPE_STROKE_WIDTH_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <span className="min-w-[42px] text-sm font-semibold text-slate-600">
            {shapeStrokeWidth}px
          </span>
        </div>
      </div>
    ) : activeTool === "text" || (selectedOverlay && selectedOverlay.kind === "text") ? (
      <div className={`${MODAL_RADIUS_CLASS} flex items-center gap-2 border border-slate-200 bg-white/96 px-3 py-2 shadow-sm backdrop-blur`}>
        <label className={`${MODAL_RADIUS_CLASS} inline-flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden border border-slate-200 bg-white`}>
          <input
            aria-label="文字颜色"
            type="color"
            className="h-full w-full cursor-pointer border-0 bg-transparent p-0"
            value={textColor}
            onChange={(event) => {
              setTextColor(event.target.value);
              handleTextStyleChange({ color: event.target.value });
            }}
          />
        </label>
        <label className="sr-only" htmlFor="text-size">
          文字字号
        </label>
        <select
          id="text-size"
          aria-label="文字字号"
          className={`${MODAL_RADIUS_CLASS} h-8 border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none`}
          value={textSize}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            setTextSize(nextValue);
            handleTextStyleChange({ fontSize: nextValue });
          }}
        >
          {TEXT_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}px
            </option>
          ))}
        </select>
      </div>
    ) : null;

  const floatingPopover = popoverTool === "ai-convert" ? (
    <div className={`${MODAL_RADIUS_CLASS} flex gap-2 border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.12)]`}>
      {CONVERT_OPTIONS.map((option) => (
        <div key={option.id}>
          {renderPopoverPreviewCard({
            label: option.label,
            onClick: () => handleApplyConvertOption(option.id),
            previewAlt: option.previewAlt,
            previewSrc: option.previewSrc,
          })}
        </div>
      ))}
    </div>
  ) : popoverTool === "ai-add" ? (
    <div className={`${MODAL_RADIUS_CLASS} flex gap-2 border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.12)]`}>
      {AI_ADD_OPTIONS.map((option) => (
        <div key={option.id}>
          {renderPopoverPreviewCard({
            label: option.label,
            onClick: () => handleApplyAddOption(option.id),
            previewAlt: option.previewAlt,
            previewSrc: option.previewSrc,
          })}
        </div>
      ))}
    </div>
  ) : popoverTool === "ai-remove" ? (
    <div className={`${MODAL_RADIUS_CLASS} flex gap-2 border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.12)]`}>
      {AI_REMOVE_OPTIONS.map((option) => (
        <div key={option.id}>
          {renderPopoverPreviewCard({
            label: option.label,
            onClick: () => handleApplyRemoveOption(option.id),
            previewAlt: option.previewAlt,
            previewSrc: option.previewSrc,
          })}
        </div>
      ))}
    </div>
  ) : popoverTool === "shape" ? (
    <div className={`${MODAL_RADIUS_CLASS} grid w-[132px] grid-cols-2 gap-2 border border-slate-200 bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.12)]`}>
      {SHAPE_OPTIONS.map((shape) => {
        const Icon = shape.icon;
        const selected = activeShapeKind === shape.id;
        return (
          <button
            key={shape.id}
            type="button"
            aria-label={shape.label}
            className={`${MODAL_RADIUS_CLASS} inline-flex h-12 items-center justify-center border transition-colors ${shapePreviewClass(selected)}`}
            onClick={() => setShapeTool(shape.id)}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  ) : popoverTool === "more" ? (
    <div className={`${MODAL_RADIUS_CLASS} flex gap-2 border border-slate-200 bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.12)]`}>
      <button
        type="button"
        aria-label="左右翻转"
        className={`${MODAL_RADIUS_CLASS} inline-flex h-10 w-10 items-center justify-center border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50`}
        onClick={() => setStatusMessage("左右翻转将通过智能编辑继续完成。")}
      >
        <FlipHorizontal2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="上下翻转"
        className={`${MODAL_RADIUS_CLASS} inline-flex h-10 w-10 items-center justify-center border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50`}
        onClick={() => setStatusMessage("上下翻转将通过智能编辑继续完成。")}
      >
        <FlipVertical2 className="h-4 w-4" />
      </button>
    </div>
  ) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-white/36 px-6 py-5 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !savingMode) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="图片编辑"
        className={`flex h-[min(84vh,820px)] w-[min(1460px,calc(100vw-72px))] max-h-[calc(100vh-32px)] max-w-[1460px] flex-col overflow-hidden border border-slate-200 bg-white shadow-[0_28px_72px_rgba(15,23,42,0.14)] ${MODAL_RADIUS_CLASS}`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="返回"
              className={`${MODAL_RADIUS_CLASS} inline-flex h-9 items-center gap-1.5 border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50`}
              onClick={onClose}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回</span>
            </button>
            <button
              type="button"
              aria-label="撤销"
              disabled={pastSnapshots.length === 0}
              className={`${MODAL_RADIUS_CLASS} inline-flex h-9 w-9 items-center justify-center border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}
              onClick={handleUndo}
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="重做"
              disabled={futureSnapshots.length === 0}
              className={`${MODAL_RADIUS_CLASS} inline-flex h-9 w-9 items-center justify-center border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}
              onClick={handleRedo}
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="重置编辑"
              className={`${MODAL_RADIUS_CLASS} inline-flex h-9 w-9 items-center justify-center border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50`}
              onClick={() => {
                if (!baseImage) {
                  return;
                }
                commitUndoSnapshot();
                setCropDraftRect({
                  x: 0,
                  y: 0,
                  width: baseImage.width,
                  height: baseImage.height,
                });
                setFilterPreset("original");
                setSkyStrength(0);
                setOverlays([]);
                setSelectedOverlayId(null);
                setEditingTextId(null);
                finalizeUndoSnapshot();
                setStatusMessage("已重置当前编辑内容。");
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <div className="text-base font-semibold text-slate-900">图片编辑</div>
          <button
            type="button"
            aria-label="视频教程"
            className={`${MODAL_RADIUS_CLASS} inline-flex h-9 items-center gap-1.5 border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50`}
            onClick={() => {
              window.open(
                "https://www.bilibili.com/video/BV1jVQZBnE5h/",
                "_blank",
                "noopener,noreferrer",
              );
            }}
          >
            <WandSparkles className="h-4 w-4" />
            <span>视频教程</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="relative flex w-[66px] shrink-0 flex-col items-center gap-1 border-r border-slate-200 py-3">
            {TOOL_RAIL.map((tool) => {
              const Icon = tool.icon;
              const selected =
                activeTool === tool.id ||
                (tool.id === "shape" && activeTool === "arrow");
              return (
                <button
                  key={tool.id}
                  type="button"
                  aria-label={tool.label}
                  className={`flex h-[44px] w-[44px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                    selected
                      ? `${MODAL_RADIUS_CLASS} bg-slate-100 text-slate-900`
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  onClick={() => {
                    if (tool.id === "shape") {
                      setActiveTool("shape");
                      return;
                    }
                    if (tool.id === "arrow") {
                      setActiveTool("arrow");
                      setActiveShapeKind("arrow");
                      return;
                    }
                    setActiveTool(tool.id);
                    if (tool.id !== "text") {
                      setEditingTextId(null);
                    }
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tool.label}</span>
                </button>
              );
            })}
            {floatingPopover && floatingPopoverStyle ? (
              <div
                className="absolute left-[60px] z-20"
                style={floatingPopoverStyle}
              >
                {floatingPopover}
              </div>
            ) : null}
          </div>

          <div className="relative flex min-w-0 flex-1 flex-col">
            <div
              ref={stageViewportRef}
              className="relative min-h-0 flex-1 overflow-hidden bg-[#eff2f6]"
            >
              {topToolbar ? (
                <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
                  <div className="pointer-events-auto">{topToolbar}</div>
                </div>
              ) : null}

              <div className="absolute inset-0 flex items-center justify-center px-6 py-6">
                {stageMetrics && renderImageUrl && baseImage ? (
                  <div
                    className="relative"
                    style={{
                      width: stageMetrics.width,
                      height: stageMetrics.height,
                    }}
                  >
                    <svg
                      className={`block overflow-visible bg-white shadow-[0_18px_36px_rgba(15,23,42,0.08)] ${MODAL_RADIUS_CLASS}`}
                      viewBox={`${stageMetrics.visibleRect.x} ${stageMetrics.visibleRect.y} ${stageMetrics.visibleRect.width} ${stageMetrics.visibleRect.height}`}
                      width={stageMetrics.width}
                      height={stageMetrics.height}
                      onPointerDown={handleStagePointerDown}
                      onPointerMove={handleStagePointerMove}
                      onPointerUp={handleStagePointerUp}
                      onPointerLeave={handleStagePointerUp}
                    >
                      <defs>
                        <marker
                          id={markerId}
                          markerWidth="12"
                          markerHeight="12"
                          refX="9"
                          refY="6"
                          orient="auto-start-reverse"
                        >
                          <path d="M0 0L12 6L0 12z" fill="currentColor" />
                        </marker>
                        <linearGradient id={`sky-${markerId}`} x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor={BLUE_SKY_GRADIENT.top} />
                          <stop offset="100%" stopColor={BLUE_SKY_GRADIENT.bottom} />
                        </linearGradient>
                      </defs>

                      <image
                        href={renderImageUrl}
                        x={0}
                        y={0}
                        width={baseImage.width}
                        height={baseImage.height}
                        preserveAspectRatio="none"
                      />

                      {skyStrength > 0 ? (
                        <rect
                          x={0}
                          y={0}
                          width={baseImage.width}
                          height={baseImage.height * 0.56}
                          fill={`url(#sky-${markerId})`}
                          opacity={skyStrength * 1.15}
                        />
                      ) : null}

                      {overlays.map((overlay) => (
                        <g key={overlay.id}>{renderOverlay(overlay)}</g>
                      ))}

                      {overlays.map((overlay) => {
                        const bounds = getOverlayBounds(overlay);
                        const selected = overlay.id === selectedOverlayId;
                        return (
                          <g key={`${overlay.id}-hitbox`}>
                            {selected ? (
                              <rect
                                x={bounds.x - 4}
                                y={bounds.y - 4}
                                width={bounds.width + 8}
                                height={bounds.height + 8}
                                fill="none"
                                stroke="#6d5efc"
                                strokeDasharray="8 6"
                                strokeWidth={2}
                                rx={6}
                              />
                            ) : null}
                            <rect
                              x={bounds.x - 10}
                              y={bounds.y - 10}
                              width={bounds.width + 20}
                              height={bounds.height + 20}
                              fill="transparent"
                              onDoubleClick={() => {
                                if (overlay.kind === "text") {
                                  setSelectedOverlayId(overlay.id);
                                  setEditingTextId(overlay.id);
                                }
                              }}
                              onPointerDown={(event) => handleOverlayPointerDown(overlay.id, event)}
                            />
                          </g>
                        );
                      })}

                      {activeTool === "crop" && cropRect ? (
                        <>
                          <rect
                            x={0}
                            y={0}
                            width={baseImage.width}
                            height={baseImage.height}
                            fill="rgba(15,23,42,0.12)"
                          />
                          <rect
                            x={cropRect.x}
                            y={cropRect.y}
                            width={cropRect.width}
                            height={cropRect.height}
                            fill="transparent"
                            stroke="#6d5efc"
                            strokeWidth={3}
                          />
                        </>
                      ) : null}
                    </svg>

                    {editingTextOverlay && editingTextScreenRect ? (
                      <textarea
                        ref={textInputRef}
                        aria-label="编辑文字"
                        className={`${MODAL_RADIUS_CLASS} absolute resize-none border border-slate-300 bg-white/92 px-3 py-2 font-semibold text-slate-900 shadow-sm outline-none ring-2 ring-[#6d5efc]/20`}
                        style={{
                          left: editingTextScreenRect.left,
                          top: editingTextScreenRect.top,
                          width: editingTextScreenRect.width,
                          height: editingTextScreenRect.height,
                          color: editingTextOverlay.color,
                          fontSize: editingTextOverlay.fontSize * stageMetrics.scale,
                          lineHeight: 1.3,
                        }}
                        value={editingTextOverlay.text}
                        onBlur={() => setEditingTextId(null)}
                        onChange={(event) => updateSelectedText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            setEditingTextId(null);
                          }
                          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                            event.preventDefault();
                            setEditingTextId(null);
                          }
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>

              {loadingBaseImage ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/72 backdrop-blur-sm">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>加载图片编辑器中...</span>
                  </div>
                </div>
              ) : null}

              {statusMessage ? (
                <div className={`${MODAL_RADIUS_CLASS} absolute left-4 top-4 z-20 border border-slate-200 bg-white/96 px-3 py-2 text-sm text-slate-600 shadow-sm backdrop-blur`}>
                  {statusMessage}
                </div>
              ) : null}

              <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
                <button
                  type="button"
                  aria-label="保存"
                  className={`${MODAL_RADIUS_CLASS} inline-flex h-10 min-w-[104px] items-center justify-center bg-slate-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={savingMode !== null || !baseImage}
                  onClick={() => void saveEditorImage("replace")}
                >
                  {savingMode === "replace" ? "保存中..." : "保存"}
                </button>
                <button
                  type="button"
                  aria-label="保存为副本"
                  className={`${MODAL_RADIUS_CLASS} inline-flex h-10 min-w-[128px] items-center justify-center border border-slate-300 bg-white/96 px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={savingMode !== null || !baseImage}
                  onClick={() => void saveEditorImage("copy")}
                >
                  {savingMode === "copy" ? "复制中..." : "保存为副本"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex w-[288px] shrink-0 flex-col border-l border-slate-200 bg-[#fbfbfc]">
            <div className="border-b border-slate-200 px-4 py-4">
              <div className="text-center text-lg font-semibold text-slate-900">贴图</div>
              <button
                type="button"
                aria-label="本地上传"
                className={`${MODAL_RADIUS_CLASS} mt-4 flex w-full items-center justify-between border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50`}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="inline-flex items-center gap-2">
                  <ImagePlus className="h-4 w-4" />
                  <span>本地上传</span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  void handleStickerLocalUpload(event.target.files);
                  event.target.value = "";
                }}
              />
              <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] bg-slate-100 p-1.5">
                <div
                  className={`${MODAL_RADIUS_CLASS} inline-flex items-center bg-slate-800 px-3 py-2 text-sm font-semibold text-white`}
                >
                  官方图库
                </div>
                <span className="pr-2 text-xs font-medium text-slate-500">
                  已切换为本地受控图库
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {stickerLibrary.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={activeStickerCategory === category.id}
                    className={`${MODAL_RADIUS_CLASS} shrink-0 border px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeStickerCategory === category.id
                        ? "border-slate-900 bg-slate-100 text-slate-900"
                        : "border-transparent bg-transparent text-slate-500 hover:text-slate-900"
                    }`}
                    onClick={() => {
                      setActiveStickerCategory(category.id);
                      setActiveStickerPage(0);
                    }}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-4">
                {stickerSubcategories.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    type="button"
                    aria-pressed={activeStickerSubcategoryId === subcategory.id}
                    className={`${MODAL_RADIUS_CLASS} shrink-0 border px-3 py-1.5 text-sm transition-colors ${
                      activeStickerSubcategoryId === subcategory.id
                        ? "border-slate-300 bg-white text-slate-900"
                        : "border-transparent bg-transparent text-slate-500 hover:text-slate-900"
                    }`}
                    onClick={() => {
                      setActiveStickerSubcategoryId(subcategory.id);
                      setActiveStickerPage(0);
                    }}
                  >
                    {subcategory.label}
                  </button>
                ))}
              </div>

              {officialStickerLibraryLoadError && !usingPersistedStickerLibrary ? (
                <div className={`${MODAL_RADIUS_CLASS} mb-4 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800`}>
                  {officialStickerLibraryLoadError}
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-2">
                {pagedStickerItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`插入贴图 ${item.label}`}
                    className={`${MODAL_RADIUS_CLASS} group overflow-hidden border border-slate-200 bg-white transition-colors hover:border-slate-300`}
                    onClick={() => insertSticker(item)}
                  >
                    <div className="aspect-square bg-[linear-gradient(180deg,#ffffff_0%,#f5f6f8_100%)] p-2">
                      <img
                        src={item.src}
                        alt={item.label}
                        className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.04]"
                      />
                    </div>
                  </button>
                ))}
              </div>

              {activeStickerPageLoading ? (
                <div className="flex items-center justify-center py-6 text-sm text-slate-500">
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  <span>正在加载官方图库...</span>
                </div>
              ) : null}

              {!activeStickerPageLoading &&
              !activeStickerPageError &&
              pagedStickerItems.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">
                  当前分类暂无可用贴图。
                </div>
              ) : null}

              {activeStickerPageError ? (
                <div className={`${MODAL_RADIUS_CLASS} mt-4 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800`}>
                  {activeStickerPageError}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-4">
              <button
                type="button"
                aria-label="上一页"
                className={`${MODAL_RADIUS_CLASS} inline-flex h-10 flex-1 items-center justify-center border border-slate-200 bg-white text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}
                disabled={activeStickerPage === 0}
                onClick={() => setActiveStickerPage((page) => Math.max(0, page - 1))}
              >
                上一页
              </button>
              <button
                type="button"
                aria-label="下一页"
                className={`${MODAL_RADIUS_CLASS} inline-flex h-10 flex-1 items-center justify-center border border-slate-200 bg-white text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}
                disabled={activeStickerPage >= stickerPageCount - 1}
                onClick={() => setActiveStickerPage((page) => Math.min(stickerPageCount - 1, page + 1))}
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
