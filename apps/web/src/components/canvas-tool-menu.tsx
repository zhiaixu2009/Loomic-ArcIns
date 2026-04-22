"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Circle,
  Diamond,
  Hand,
  ImageUp,
  Minus,
  MousePointer2,
  Pencil,
  Plus,
  Sparkles,
  Square,
  Type,
  Video,
  X,
} from "lucide-react";

import {
  createImageGeneratorElement,
  isImageGeneratorElement,
  getImageGeneratorData,
  type ImageGeneratorData,
} from "../lib/canvas-image-generator";
import {
  createVideoGeneratorElement,
  isVideoGeneratorElement,
  getVideoGeneratorData,
  type VideoGeneratorData,
} from "../lib/canvas-video-generator";
import { insertImageOnCanvas, isVideoUrl } from "../lib/canvas-elements";
import { loadOfficialGalleryLibrary } from "../lib/official-gallery-library";
import {
  officialGallerySeedLibrary,
  type OfficialGalleryCategory,
  type OfficialGalleryItem,
} from "../lib/official-gallery-seeds";
import { ImageGeneratorPanel } from "./canvas/image-generator-panel";
import { VideoGeneratorPanel } from "./canvas/video-generator-panel";
import { VideoPlayerPanel } from "./canvas/video-player-panel";

type ToolType =
  | "hand"
  | "selection"
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "arrow"
  | "line"
  | "freedraw"
  | "text"
  | "image";

const TOOL_GROUPS: (ToolType | null)[] = [
  "hand",
  "selection",
  null,
  "rectangle",
  "ellipse",
  "arrow",
  "line",
  "freedraw",
  null,
  "text",
  "image",
];

const TOOL_ICONS: Record<ToolType, React.ComponentType<{ className?: string }>> = {
  hand: Hand,
  selection: MousePointer2,
  rectangle: Square,
  ellipse: Circle,
  diamond: Diamond,
  arrow: ArrowUpRight,
  line: Minus,
  freedraw: Pencil,
  text: Type,
  image: ImageUp,
};

const TOOL_LABELS: Partial<Record<ToolType, string>> = {
  hand: "拖拽画布 (H)",
  selection: "选择 (V)",
  rectangle: "矩形 (R)",
  ellipse: "椭圆 (O)",
  arrow: "箭头 (A)",
  line: "直线 (L)",
  freedraw: "画笔 (P)",
  text: "文字 (T)",
  image: "图片 (9)",
};

type CanvasToolMenuProps = {
  accessToken: string;
  excalidrawApi: any;
  immersiveArchitecture?: boolean;
  leftPanelOpen?: boolean;
  onInsertReferenceBoard?: (() => void) | undefined;
  onSeedArchitectureBoardStack?: (() => void) | undefined;
  onUploadReference?: (() => void) | undefined;
};

type ArchitectureRailTool = "selection" | "add" | "shape" | "freedraw" | "text";
type ArchitectureShapeFlyoutItemId =
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "line"
  | "polyline";
type AddModalTab = "local-upload" | "official-gallery" | "my-creations";
type MyCreationSourceId =
  | "ai-drawing"
  | "banana-agent"
  | "model-render"
  | "site-coloring"
  | "hand-drawing"
  | "inpaint";
type GallerySampleItem = {
  id: string;
  label: string;
  url: string;
  width: number;
  height: number;
};
type AddModalTabDefinition = {
  id: AddModalTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};
type ShapeToolbarStyle = {
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
};
type TextToolbarStyle = {
  color: string;
  fontSize: number;
};
type SelectedShapeToolbarState = ShapeToolbarStyle & {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  pointCount?: number;
};
type SelectedTextToolbarState = TextToolbarStyle & {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function LiveFrameLineIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M72 1008c-16 0-24-8-40-16-24-24-24-56 0-72l880-880c24-24 56-24 72 0s24 56 0 72l-880 880c0 8-16 16-32 16z" />
    </svg>
  );
}

function LiveLassoShapeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1050 1024"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M50.858812 0.456951a49.758778 49.758778 0 0 1 16.58626 2.985527l539.053433 193.810442L976.455023 6.013348a49.758778 49.758778 0 0 1 72.23316 54.402931L913.095511 738.545498a49.758778 49.758778 0 0 1-30.767511 36.821496L261.089651 1020.428978a50.173435 50.173435 0 0 1-67.506076-36.406839L1.100034 60.913867A49.758778 49.758778 0 0 1 50.195362 0.539883z m560.035052 301.538198a49.758778 49.758778 0 0 1-16.58626-2.985527L118.696613 128.088218l162.047756 777.066257 540.463265-213.133434 109.801038-549.005189L634.280489 296.355821a50.173435 50.173435 0 0 1-23.386625 5.639328z" />
    </svg>
  );
}

const ARCHITECTURE_RAIL_ITEMS: Array<{
  icon: React.ComponentType<{ className?: string }>;
  id: ArchitectureRailTool;
  label: string;
}> = [
  { id: "selection", label: "选择", icon: MousePointer2 },
  { id: "add", label: "添加", icon: Plus },
  { id: "shape", label: "形状", icon: Square },
  { id: "freedraw", label: "涂鸦", icon: Pencil },
  { id: "text", label: "文字", icon: Type },
];

const SHAPE_FLYOUT_ITEMS: Array<{
  id: ToolType;
  label: string;
}> = [
  { id: "rectangle", label: "矩形" },
  { id: "ellipse", label: "椭圆" },
  { id: "arrow", label: "箭头" },
  { id: "line", label: "直线" },
];

const ARCHITECTURE_SHAPE_FLYOUT_ITEMS: Array<{
  id: ArchitectureShapeFlyoutItemId;
  tool: ToolType;
  ariaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  iconId: string;
}> = [
  {
    id: "rectangle",
    tool: "rectangle",
    ariaLabel: "矩形",
    icon: Square,
    iconId: "micro-icon-frame-square-box",
  },
  {
    id: "ellipse",
    tool: "ellipse",
    ariaLabel: "圆形",
    icon: Circle,
    iconId: "micro-icon-frame-ellipse",
  },
  {
    id: "arrow",
    tool: "arrow",
    ariaLabel: "箭头",
    icon: ArrowUpRight,
    iconId: "micro-icon-leafer-12",
  },
  {
    id: "line",
    tool: "line",
    ariaLabel: "直线",
    icon: LiveFrameLineIcon,
    iconId: "micro-icon-frame-line",
  },
  {
    id: "polyline",
    tool: "line",
    ariaLabel: "连续多段线",
    icon: LiveLassoShapeIcon,
    iconId: "micro-icon-lasso",
  },
];

const ADD_MODAL_TABS: AddModalTabDefinition[] = [
  {
    id: "local-upload",
    label: "本地上传",
    description: "从本地文件快速插入参考图",
    icon: ImageUp,
  },
  {
    id: "official-gallery",
    label: "官方图库",
    description: "从本地受控图库挑选稳定素材",
    icon: Sparkles,
  },
  {
    id: "my-creations",
    label: "我的创作",
    description: "复用近期整理过的创作样例",
    icon: Pencil,
  },
];

function buildOfficialGallerySeedItemIndex(library: OfficialGalleryCategory[]) {
  const index = new Map<string, OfficialGalleryItem>();

  for (const category of library) {
    for (const subtype of category.subtypes) {
      for (const item of subtype.items) {
        index.set(item.id, item);
      }
    }
  }

  return index;
}

const OFFICIAL_GALLERY_SEED_ITEM_INDEX =
  buildOfficialGallerySeedItemIndex(officialGallerySeedLibrary);

function buildSeedBackedGalleryItem(
  id: string,
  label: string,
  seedItemId: string,
): GallerySampleItem {
  const fallbackItem =
    officialGallerySeedLibrary[0]?.subtypes[0]?.items[0] ?? {
      id: "fallback",
      label: "Fallback",
      url: "/official-gallery/architecture-default-1.png",
      width: 1600,
      height: 900,
    };
  const seedItem = OFFICIAL_GALLERY_SEED_ITEM_INDEX.get(seedItemId) ?? fallbackItem;

  if (!OFFICIAL_GALLERY_SEED_ITEM_INDEX.has(seedItemId)) {
    console.warn("[canvas-tool-menu] missing seed gallery item, using fallback asset", {
      id,
      label,
      seedItemId,
    });
  }

  return {
    id,
    label,
    url: seedItem.url,
    width: seedItem.width,
    height: seedItem.height,
  };
}

const MY_CREATION_SOURCES: Array<{
  id: MyCreationSourceId;
  label: string;
}> = [
  { id: "ai-drawing", label: "AI创作绘图" },
  { id: "banana-agent", label: "Banana智能体" },
  { id: "model-render", label: "AI模型渲染" },
  { id: "site-coloring", label: "AI总图彩平填色" },
  { id: "hand-drawing", label: "手绘创作" },
  { id: "inpaint", label: "局部重绘" },
];

const MY_CREATION_SAMPLE_ITEMS: Record<MyCreationSourceId, GallerySampleItem[]> = {
  "ai-drawing": [
    buildSeedBackedGalleryItem("my-ai-drawing-1", "AI创作绘图 1", "architecture-default-1"),
    buildSeedBackedGalleryItem("my-ai-drawing-2", "AI创作绘图 2", "architecture-default-2"),
  ],
  "banana-agent": [
    buildSeedBackedGalleryItem("my-banana-agent-1", "Banana智能体 1", "architecture-default-3"),
    buildSeedBackedGalleryItem("my-banana-agent-2", "Banana智能体 2", "architecture-default-4"),
  ],
  "model-render": [
    buildSeedBackedGalleryItem("my-model-render-1", "AI模型渲染 1", "architecture-villa-1"),
    buildSeedBackedGalleryItem("my-model-render-2", "AI模型渲染 2", "architecture-villa-2"),
  ],
  "site-coloring": [
    buildSeedBackedGalleryItem("my-site-coloring-1", "AI总图彩平填色 1", "architecture-default-1"),
    buildSeedBackedGalleryItem("my-site-coloring-2", "AI总图彩平填色 2", "architecture-default-3"),
  ],
  "hand-drawing": [
    buildSeedBackedGalleryItem("my-hand-drawing-1", "手绘创作 1", "architecture-default-2"),
    buildSeedBackedGalleryItem("my-hand-drawing-2", "手绘创作 2", "architecture-villa-1"),
  ],
  inpaint: [
    buildSeedBackedGalleryItem("my-inpaint-1", "局部重绘 1", "architecture-default-4"),
    buildSeedBackedGalleryItem("my-inpaint-2", "局部重绘 2", "architecture-villa-2"),
  ],
};

const SHAPE_TOOL_IDS: ToolType[] = [
  "rectangle",
  "ellipse",
  "diamond",
  "arrow",
  "line",
];
const STROKE_SELECTION_TOOL_IDS: ToolType[] = [...SHAPE_TOOL_IDS, "freedraw"];

function isShapeToolId(tool: string): tool is ToolType {
  return SHAPE_TOOL_IDS.includes(tool as ToolType);
}

function isStrokeSelectionToolId(tool: string): tool is ToolType {
  return STROKE_SELECTION_TOOL_IDS.includes(tool as ToolType);
}

function isArchitectureShapeFlyoutItemId(
  value: string | null | undefined,
): value is ArchitectureShapeFlyoutItemId {
  return value === "rectangle" ||
    value === "ellipse" ||
    value === "arrow" ||
    value === "line" ||
    value === "polyline";
}

function getArchitectureShapeFlyoutItemIdFromShape(
  shape: Pick<SelectedShapeToolbarState, "type" | "pointCount"> | null,
): ArchitectureShapeFlyoutItemId | null {
  if (!shape) {
    return null;
  }

  if (shape.type === "line") {
    return (shape.pointCount ?? 0) > 2 ? "polyline" : "line";
  }

  if (
    shape.type === "rectangle" ||
    shape.type === "ellipse" ||
    shape.type === "arrow"
  ) {
    return shape.type;
  }

  return null;
}

function isStrokeSelectionElement(element: any): element is {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: readonly unknown[];
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
} {
  return Boolean(
    element &&
      typeof element.id === "string" &&
      typeof element.type === "string" &&
      isStrokeSelectionToolId(element.type),
  );
}

function isTextSelectionElement(element: any): element is {
  id: string;
  type: "text";
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor?: string;
  fontSize?: number;
} {
  return Boolean(
    element &&
      typeof element.id === "string" &&
      element.type === "text",
  );
}

function normalizeShapeToolbarStyle(style?: Partial<ShapeToolbarStyle> | null): ShapeToolbarStyle {
  return {
    strokeColor: style?.strokeColor ?? "#0f172a",
    backgroundColor: style?.backgroundColor ?? "transparent",
    strokeWidth: typeof style?.strokeWidth === "number" ? style.strokeWidth : 2,
  };
}

function areShapeToolbarStylesEqual(
  left: ShapeToolbarStyle,
  right: ShapeToolbarStyle,
) {
  return (
    left.strokeColor === right.strokeColor &&
    left.backgroundColor === right.backgroundColor &&
    left.strokeWidth === right.strokeWidth
  );
}

function areSelectedShapeStatesEqual(
  left: SelectedShapeToolbarState | null,
  right: SelectedShapeToolbarState | null,
) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.id === right.id &&
    left.type === right.type &&
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height &&
    left.pointCount === right.pointCount &&
    areShapeToolbarStylesEqual(left, right)
  );
}

function areSelectedTextStatesEqual(
  left: SelectedTextToolbarState | null,
  right: SelectedTextToolbarState | null,
) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.id === right.id &&
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height &&
    areTextToolbarStylesEqual(left, right)
  );
}

function normalizeTextToolbarStyle(
  style?: Partial<TextToolbarStyle> | null,
): TextToolbarStyle {
  return {
    color: style?.color ?? "#ef4444",
    fontSize:
      typeof style?.fontSize === "number" && Number.isFinite(style.fontSize)
        ? Math.max(12, Math.round(style.fontSize))
        : 28,
  };
}

function areTextToolbarStylesEqual(
  left: TextToolbarStyle,
  right: TextToolbarStyle,
) {
  return left.color === right.color && left.fontSize === right.fontSize;
}

function bumpSceneElement(element: Record<string, any>) {
  return {
    ...element,
    version: typeof element.version === "number" ? element.version + 1 : 1,
    versionNonce: Math.floor(Math.random() * 2_000_000_000),
    updated: Date.now(),
  };
}

function normalizeColorInputValue(color: string | undefined, fallback: string) {
  if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) {
    return color;
  }

  return fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildCanvasSelectionToolbarStyle(args: {
  x: number;
  y: number;
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
  zoom: number;
}) {
  const viewportWidth =
    typeof window === "undefined" ? 1440 : window.innerWidth;
  const viewportHeight =
    typeof window === "undefined" ? 900 : window.innerHeight;
  const centerX = (args.x + args.width / 2 + args.scrollX) * args.zoom;
  const anchorTop = (args.y + args.scrollY) * args.zoom - 96;
  const fallbackBelowTop =
    (args.y + args.height + args.scrollY) * args.zoom + 12;

  return {
    left: clamp(centerX, 40, Math.max(40, viewportWidth - 40)),
    top: clamp(
      anchorTop < 16 ? fallbackBelowTop : anchorTop,
      16,
      Math.max(16, viewportHeight - 112),
    ),
  };
}

/** Memoized shimmer overlay for a single generating element */
const GeneratingOverlay = memo(function GeneratingOverlay({
  id,
  screenX,
  screenY,
  screenW,
  screenH,
  model,
}: {
  id: string;
  screenX: number;
  screenY: number;
  screenW: number;
  screenH: number;
  model?: string;
}) {
  return (
    <div
      key={id}
      className="pointer-events-none fixed overflow-hidden rounded-lg"
      style={{
        left: screenX,
        top: screenY,
        width: screenW,
        height: screenH,
        zIndex: 99,
      }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
        <svg
          className="h-12 w-12 text-muted-foreground/40"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
        {model && (
          <span className="mt-2 rounded-full bg-foreground/5 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {model.split("/").pop()?.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
          </span>
        )}
        <span className="mt-1 text-[11px] text-muted-foreground">
          生成中...
        </span>
      </div>
      <div className="absolute inset-0 animate-shimmer-scan">
        <div
          className="h-full w-1/2"
          style={{
            background:
              "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
});

export function CanvasToolMenu({
  accessToken,
  excalidrawApi,
  immersiveArchitecture = false,
  leftPanelOpen,
  onInsertReferenceBoard,
  onSeedArchitectureBoardStack,
  onUploadReference,
}: CanvasToolMenuProps) {
  const [activeTool, setActiveTool] = useState<string>("selection");
  const [activeArchitectureShapeItemId, setActiveArchitectureShapeItemId] =
    useState<ArchitectureShapeFlyoutItemId | null>(null);
  const [shapeFlyoutOpen, setShapeFlyoutOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [activeAddTab, setActiveAddTab] = useState<AddModalTab>("local-upload");
  const [officialGalleryLibrary, setOfficialGalleryLibrary] =
    useState<OfficialGalleryCategory[]>(officialGallerySeedLibrary);
  const [officialGalleryLoading, setOfficialGalleryLoading] = useState(false);
  const [officialGalleryLoaded, setOfficialGalleryLoaded] = useState(false);
  const [officialGalleryLoadError, setOfficialGalleryLoadError] = useState<string | null>(
    null,
  );
  const [activeOfficialGalleryCategory, setActiveOfficialGalleryCategory] =
    useState<string>(() => officialGallerySeedLibrary[0]?.id ?? "");
  const [activeOfficialGallerySubtype, setActiveOfficialGallerySubtype] =
    useState<string>(() => officialGallerySeedLibrary[0]?.subtypes[0]?.id ?? "");
  const [activeMyCreationSource, setActiveMyCreationSource] =
    useState<MyCreationSourceId>("ai-drawing");
  const [shapeToolbarStyle, setShapeToolbarStyle] = useState<ShapeToolbarStyle>(() =>
    normalizeShapeToolbarStyle(),
  );
  const [textToolbarStyle, setTextToolbarStyle] = useState<TextToolbarStyle>(() =>
    normalizeTextToolbarStyle(),
  );
  const [selectedShapeElement, setSelectedShapeElement] =
    useState<SelectedShapeToolbarState | null>(null);
  const [selectedTextElement, setSelectedTextElement] =
    useState<SelectedTextToolbarState | null>(null);

  // Image generator state
  const [activeGeneratorId, setActiveGeneratorId] = useState<string | null>(null);
  const [generatorData, setGeneratorData] = useState<ImageGeneratorData | null>(null);
  const [generatorBounds, setGeneratorBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Video generator state
  const [activeVideoGenId, setActiveVideoGenId] = useState<string | null>(null);
  const [videoGenData, setVideoGenData] = useState<VideoGeneratorData | null>(null);
  const [videoGenBounds, setVideoGenBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Video player state (for completed video elements)
  const [activeVideoPlayerId, setActiveVideoPlayerId] = useState<string | null>(null);
  const [videoPlayerData, setVideoPlayerData] = useState<{
    videoUrl: string;
    mimeType: string;
    durationSeconds?: number;
    title?: string;
  } | null>(null);
  const [videoPlayerBounds, setVideoPlayerBounds] = useState<{
    x: number; y: number; width: number; height: number;
  } | null>(null);

  const [canvasScrollZoom, setCanvasScrollZoom] = useState({
    scrollX: 0,
    scrollY: 0,
    zoom: 1,
  });

  // Track generating elements for shimmer overlay
  const [generatingElements, setGeneratingElements] = useState<
    Array<{
      id: string;
      screenX: number;
      screenY: number;
      screenW: number;
      screenH: number;
      model?: string;
    }>
  >([]);

  // Keep activeGeneratorId / activeVideoGenId accessible inside onChange without causing re-subscription
  const activeGeneratorIdRef = useRef(activeGeneratorId);
  activeGeneratorIdRef.current = activeGeneratorId;
  const activeVideoGenIdRef = useRef(activeVideoGenId);
  activeVideoGenIdRef.current = activeVideoGenId;
  const activeVideoPlayerIdRef = useRef(activeVideoPlayerId);
  activeVideoPlayerIdRef.current = activeVideoPlayerId;
  const railRef = useRef<HTMLDivElement | null>(null);
  const officialGalleryCategoryStripRef = useRef<HTMLDivElement | null>(null);

  // Track previous generating element IDs to avoid re-renders when nothing changed
  const prevGeneratingKeyRef = useRef("");

  // Helper: close all generator / player panels
  const closeAllPanels = useCallback(() => {
    setActiveGeneratorId(null);
    setGeneratorData(null);
    setGeneratorBounds(null);
    setActiveVideoGenId(null);
    setVideoGenData(null);
    setVideoGenBounds(null);
    setActiveVideoPlayerId(null);
    setVideoPlayerData(null);
    setVideoPlayerBounds(null);
  }, []);

  // Subscribe to Excalidraw changes.
  // This fires on every frame during drag / drawing, so we must be very
  // careful to avoid unnecessary state updates that trigger re-renders.
  useEffect(() => {
    if (!excalidrawApi) return;

    const unsubscribe = excalidrawApi.onChange(
      (elements: any[], appState: any) => {
        // --- Tool sync (cheap string comparison, skip if unchanged) ---
        const tool = appState?.activeTool?.type;
        if (tool) {
          setActiveTool((prev: string) => (prev === tool ? prev : tool));
          setActiveArchitectureShapeItemId((prev) => {
            if (tool === "line") {
              return prev === "polyline" ? prev : "line";
            }

            if (
              tool === "rectangle" ||
              tool === "ellipse" ||
              tool === "arrow"
            ) {
              return tool;
            }

            if (tool === "selection") {
              return prev;
            }

            return null;
          });
        }

        const nextShapeToolbarStyle = normalizeShapeToolbarStyle({
          strokeColor: appState?.currentItemStrokeColor,
          backgroundColor: appState?.currentItemBackgroundColor,
          strokeWidth: appState?.currentItemStrokeWidth,
        });
        setShapeToolbarStyle((prev) =>
          areShapeToolbarStylesEqual(prev, nextShapeToolbarStyle)
            ? prev
            : nextShapeToolbarStyle,
        );
        const nextTextToolbarStyle = normalizeTextToolbarStyle({
          color: appState?.currentItemStrokeColor,
          fontSize: appState?.currentItemFontSize,
        });
        setTextToolbarStyle((prev) =>
          areTextToolbarStylesEqual(prev, nextTextToolbarStyle)
            ? prev
            : nextTextToolbarStyle,
        );

        const scrollX = appState?.scrollX ?? 0;
        const scrollY = appState?.scrollY ?? 0;
        const zoom = appState?.zoom?.value ?? 1;
        // Only update scroll/zoom state if values actually changed
        setCanvasScrollZoom((prev) => {
          if (prev.scrollX === scrollX && prev.scrollY === scrollY && prev.zoom === zoom) return prev;
          return { scrollX, scrollY, zoom };
        });

        // --- Selection-based panel management ---
        const selectedIds = appState?.selectedElementIds ?? {};
        const selectedElements = elements.filter(
          (el: any) => selectedIds[el.id] && !el.isDeleted,
        );
        const selectedShape =
          selectedElements.length === 1 && isStrokeSelectionElement(selectedElements[0])
            ? selectedElements[0]
            : null;
        const selectedText =
          selectedElements.length === 1 && isTextSelectionElement(selectedElements[0])
            ? selectedElements[0]
            : null;
        const nextSelectedShapeElement =
          selectedShape
            ? {
                id: selectedShape.id,
                type: selectedShape.type,
                x: selectedShape.x,
                y: selectedShape.y,
                width: selectedShape.width,
                height: selectedShape.height,
                ...(Array.isArray(selectedShape.points)
                  ? { pointCount: selectedShape.points.length }
                  : {}),
                ...normalizeShapeToolbarStyle({
                  ...(selectedShape.strokeColor
                    ? { strokeColor: selectedShape.strokeColor }
                    : {}),
                  ...(selectedShape.backgroundColor
                    ? { backgroundColor: selectedShape.backgroundColor }
                    : {}),
                  ...(typeof selectedShape.strokeWidth === "number"
                    ? { strokeWidth: selectedShape.strokeWidth }
                    : {}),
                }),
              }
            : null;
        setSelectedShapeElement((prev) =>
          areSelectedShapeStatesEqual(prev, nextSelectedShapeElement)
            ? prev
            : nextSelectedShapeElement,
        );
        const nextSelectedTextElement =
          selectedText
            ? {
                id: selectedText.id,
                x: selectedText.x,
                y: selectedText.y,
                width: selectedText.width,
                height: selectedText.height,
                ...normalizeTextToolbarStyle({
                  ...(selectedText.strokeColor
                    ? { color: selectedText.strokeColor }
                    : {}),
                  ...(typeof selectedText.fontSize === "number"
                    ? { fontSize: selectedText.fontSize }
                    : {}),
                }),
              }
            : null;
        setSelectedTextElement((prev) =>
          areSelectedTextStatesEqual(prev, nextSelectedTextElement)
            ? prev
            : nextSelectedTextElement,
        );
        const nextShapeFlyoutItemId =
          getArchitectureShapeFlyoutItemIdFromShape(nextSelectedShapeElement);
        if (nextShapeFlyoutItemId) {
          setActiveArchitectureShapeItemId((prev) =>
            prev === nextShapeFlyoutItemId ? prev : nextShapeFlyoutItemId,
          );
        } else if (tool === "selection" && !shapeFlyoutOpen && !selectedText) {
          setActiveArchitectureShapeItemId(null);
        }

        const currentId = activeGeneratorIdRef.current;
        const currentVideoId = activeVideoGenIdRef.current;

        if (selectedElements.length === 1) {
          const sel = selectedElements[0];

          if (isImageGeneratorElement(sel)) {
            // Only update if the selected generator changed
            if (currentId !== sel.id) {
              const data = getImageGeneratorData(sel);
              setActiveGeneratorId(sel.id as string);
              setGeneratorData(data);
              if (currentVideoId) { setActiveVideoGenId(null); setVideoGenData(null); setVideoGenBounds(null); }
              if (activeVideoPlayerIdRef.current) { setActiveVideoPlayerId(null); setVideoPlayerData(null); setVideoPlayerBounds(null); }
            }
            // Always update bounds (element may have been moved/resized)
            setGeneratorBounds({
              x: sel.x as number, y: sel.y as number,
              width: sel.width as number, height: sel.height as number,
            });
          } else if (isVideoGeneratorElement(sel)) {
            if (currentVideoId !== sel.id) {
              const data = getVideoGeneratorData(sel);
              setActiveVideoGenId(sel.id as string);
              setVideoGenData(data);
              if (currentId) { setActiveGeneratorId(null); setGeneratorData(null); setGeneratorBounds(null); }
              if (activeVideoPlayerIdRef.current) { setActiveVideoPlayerId(null); setVideoPlayerData(null); setVideoPlayerBounds(null); }
            }
            setVideoGenBounds({
              x: sel.x as number, y: sel.y as number,
              width: sel.width as number, height: sel.height as number,
            });
          } else if (
            sel.type === "embeddable" &&
            (isVideoUrl(sel.link as string) || sel.customData?.isVideo === true)
          ) {
            if (activeVideoPlayerIdRef.current !== sel.id) {
              const videoLink = sel.link as string;
              setActiveVideoPlayerId(sel.id as string);
              setVideoPlayerData({
                videoUrl: videoLink,
                mimeType: (sel.customData?.mimeType as string) ?? "video/mp4",
                ...(sel.customData?.durationSeconds != null
                  ? { durationSeconds: sel.customData.durationSeconds as number }
                  : {}),
                ...(sel.customData?.title != null
                  ? { title: sel.customData.title as string }
                  : {}),
              });
              if (currentId) { setActiveGeneratorId(null); setGeneratorData(null); setGeneratorBounds(null); }
              if (currentVideoId) { setActiveVideoGenId(null); setVideoGenData(null); setVideoGenBounds(null); }
            }
            setVideoPlayerBounds({
              x: sel.x as number, y: sel.y as number,
              width: sel.width as number, height: sel.height as number,
            });
          } else {
            // Neither generator nor video player -- close all if any was open
            if (currentId || currentVideoId || activeVideoPlayerIdRef.current) {
              closeAllPanels();
            }
          }
        } else {
          // Zero or multiple selected -- close all panels if any was open
          if (currentId || currentVideoId || activeVideoPlayerIdRef.current) {
            closeAllPanels();
          }
        }

        // --- Generating elements shimmer overlay ---
        // Build a stable key so we skip setState when the generating set is unchanged.
        const generatingRaw = elements.filter(
          (el: any) =>
            !el.isDeleted &&
            (isImageGeneratorElement(el) || isVideoGeneratorElement(el)) &&
            el.customData?.status === "generating",
        );

        // Quick identity check: IDs + positions as a serialized key
        const genKey = generatingRaw.map((el: any) =>
          `${el.id}:${el.x}:${el.y}:${el.width}:${el.height}`
        ).join("|");

        if (genKey !== prevGeneratingKeyRef.current) {
          prevGeneratingKeyRef.current = genKey;
          const generating = generatingRaw.map((el: any) => ({
            id: el.id as string,
            screenX: ((el.x as number) + scrollX) * zoom,
            screenY: ((el.y as number) + scrollY) * zoom,
            screenW: (el.width as number) * zoom,
            screenH: (el.height as number) * zoom,
            ...(el.customData?.model ? { model: el.customData.model as string } : {}),
          }));
          setGeneratingElements(generating);
        }
      },
    );

    return unsubscribe;
  }, [closeAllPanels, excalidrawApi, shapeFlyoutOpen]);

  const handleToolChange = useCallback(
    (
      tool: ToolType,
      options?: {
        closeShapeFlyout?: boolean;
        shapeFlyoutItemId?: ArchitectureShapeFlyoutItemId | null;
      },
    ) => {
      if (options?.closeShapeFlyout ?? true) {
        setShapeFlyoutOpen(false);
      }
      if (typeof options?.shapeFlyoutItemId !== "undefined") {
        setActiveArchitectureShapeItemId(options.shapeFlyoutItemId);
      } else if (tool === "line") {
        setActiveArchitectureShapeItemId((prev) =>
          prev === "polyline" ? prev : "line",
        );
      } else if (
        tool === "rectangle" ||
        tool === "ellipse" ||
        tool === "arrow"
      ) {
        setActiveArchitectureShapeItemId(tool);
      } else {
        setActiveArchitectureShapeItemId(null);
      }
      setActiveTool((prev: string) => (prev === tool ? prev : tool));
      console.log("[canvas-tool-menu] activate tool", {
        tool,
        shapeFlyoutItemId: options?.shapeFlyoutItemId ?? null,
      });
      excalidrawApi?.setActiveTool({ type: tool });

      if (!excalidrawApi?.updateScene) {
        return;
      }

      if (
        tool === "rectangle" ||
        tool === "ellipse" ||
        tool === "arrow" ||
        tool === "line"
      ) {
        excalidrawApi.updateScene({
          appState: {
            currentItemStrokeColor: shapeToolbarStyle.strokeColor,
            currentItemBackgroundColor: shapeToolbarStyle.backgroundColor,
            currentItemStrokeWidth: shapeToolbarStyle.strokeWidth,
            currentItemRoughness: 0,
            currentItemStrokeStyle: "solid",
            currentItemFillStyle: "solid",
          },
          captureUpdate: "IMMEDIATELY",
        });
        return;
      }

      if (tool === "freedraw") {
        excalidrawApi.updateScene({
          appState: {
            currentItemStrokeColor: shapeToolbarStyle.strokeColor,
            currentItemStrokeWidth: shapeToolbarStyle.strokeWidth,
            currentItemRoughness: 0,
            currentItemStrokeStyle: "solid",
          },
          captureUpdate: "IMMEDIATELY",
        });
        return;
      }

      if (tool === "text") {
        const nextTextStyle = normalizeTextToolbarStyle(textToolbarStyle);
        setTextToolbarStyle(nextTextStyle);
        excalidrawApi.updateScene({
          appState: {
            currentItemStrokeColor: nextTextStyle.color,
            currentItemFontSize: nextTextStyle.fontSize,
          },
          captureUpdate: "IMMEDIATELY",
        });
      }
    },
    [excalidrawApi, shapeToolbarStyle, textToolbarStyle],
  );

  const applyShapeToolStyle = useCallback(
    (partialStyle: Partial<ShapeToolbarStyle>) => {
      if (!excalidrawApi?.updateScene) {
        return;
      }

      const nextStyle = normalizeShapeToolbarStyle({
        ...shapeToolbarStyle,
        ...partialStyle,
      });

      setShapeToolbarStyle(nextStyle);
      excalidrawApi.updateScene({
        appState: {
          currentItemStrokeColor: nextStyle.strokeColor,
          currentItemBackgroundColor: nextStyle.backgroundColor,
          currentItemStrokeWidth: nextStyle.strokeWidth,
        },
        captureUpdate: "IMMEDIATELY",
      });
    },
    [excalidrawApi, shapeToolbarStyle],
  );

  const applySelectedShapeUpdate = useCallback(
    (
      nextValues: Partial<
        ShapeToolbarStyle & Pick<SelectedShapeToolbarState, "width" | "height">
      >,
    ) => {
      if (!excalidrawApi?.updateScene || !selectedShapeElement) {
        return;
      }

      const nextStyle = normalizeShapeToolbarStyle({
        strokeColor:
          nextValues.strokeColor ?? selectedShapeElement.strokeColor,
        backgroundColor:
          nextValues.backgroundColor ?? selectedShapeElement.backgroundColor,
        strokeWidth:
          nextValues.strokeWidth ?? selectedShapeElement.strokeWidth,
      });
      const nextWidth =
        typeof nextValues.width === "number"
          ? Math.max(1, Math.round(nextValues.width))
          : selectedShapeElement.width;
      const nextHeight =
        typeof nextValues.height === "number"
          ? Math.max(1, Math.round(nextValues.height))
          : selectedShapeElement.height;
      const nextElements = (excalidrawApi.getSceneElements?.() ?? []).map(
        (element: any) => {
          if (element.isDeleted || element.id !== selectedShapeElement.id) {
            return element;
          }

          return bumpSceneElement({
            ...element,
            strokeColor: nextStyle.strokeColor,
            backgroundColor: nextStyle.backgroundColor,
            strokeWidth: nextStyle.strokeWidth,
            width: nextWidth,
            height: nextHeight,
            roughness: 0,
            strokeStyle: "solid",
            fillStyle: "solid",
          });
        },
      );

      setSelectedShapeElement({
        ...selectedShapeElement,
        ...nextStyle,
        width: nextWidth,
        height: nextHeight,
      });
      setShapeToolbarStyle(nextStyle);
      excalidrawApi.updateScene({
        elements: nextElements,
        appState: {
          currentItemStrokeColor: nextStyle.strokeColor,
          currentItemBackgroundColor: nextStyle.backgroundColor,
          currentItemStrokeWidth: nextStyle.strokeWidth,
        },
        captureUpdate: "IMMEDIATELY",
      });
    },
    [excalidrawApi, selectedShapeElement],
  );

  const handleShapeStrokeSelect = useCallback(
    (strokeColor: string) => {
      if (selectedShapeElement) {
        applySelectedShapeUpdate({ strokeColor });
        return;
      }

      applyShapeToolStyle({ strokeColor });
    },
    [applySelectedShapeUpdate, applyShapeToolStyle, selectedShapeElement],
  );

  const handleShapeFillSelect = useCallback(
    (backgroundColor: string) => {
      if (selectedShapeElement) {
        applySelectedShapeUpdate({ backgroundColor });
        return;
      }

      applyShapeToolStyle({ backgroundColor });
    },
    [applySelectedShapeUpdate, applyShapeToolStyle, selectedShapeElement],
  );

  const handleShapeStrokeWidthChange = useCallback(
    (strokeWidth: number) => {
      if (selectedShapeElement) {
        applySelectedShapeUpdate({ strokeWidth });
        return;
      }

      applyShapeToolStyle({ strokeWidth });
    },
    [applySelectedShapeUpdate, applyShapeToolStyle, selectedShapeElement],
  );

  const applySelectedTextUpdate = useCallback(
    (nextValues: Partial<TextToolbarStyle>) => {
      if (!excalidrawApi?.updateScene || !selectedTextElement) {
        return;
      }

      const nextStyle = normalizeTextToolbarStyle({
        color: nextValues.color ?? selectedTextElement.color,
        fontSize: nextValues.fontSize ?? selectedTextElement.fontSize,
      });
      const nextElements = (excalidrawApi.getSceneElements?.() ?? []).map(
        (element: any) => {
          if (element.isDeleted || element.id !== selectedTextElement.id) {
            return element;
          }

          return bumpSceneElement({
            ...element,
            strokeColor: nextStyle.color,
            fontSize: nextStyle.fontSize,
          });
        },
      );

      setSelectedTextElement({
        ...selectedTextElement,
        ...nextStyle,
      });
      setTextToolbarStyle(nextStyle);
      excalidrawApi.updateScene({
        elements: nextElements,
        appState: {
          currentItemStrokeColor: nextStyle.color,
          currentItemFontSize: nextStyle.fontSize,
        },
        captureUpdate: "IMMEDIATELY",
      });
    },
    [excalidrawApi, selectedTextElement],
  );

  const handleTextStyleChange = useCallback(
    (nextValues: Partial<TextToolbarStyle>) => {
      if (selectedTextElement) {
        applySelectedTextUpdate(nextValues);
        return;
      }

      if (!excalidrawApi?.updateScene) {
        return;
      }

      const nextStyle = normalizeTextToolbarStyle({
        ...textToolbarStyle,
        ...nextValues,
      });

      setTextToolbarStyle(nextStyle);
      excalidrawApi.updateScene({
        appState: {
          currentItemStrokeColor: nextStyle.color,
          currentItemFontSize: nextStyle.fontSize,
        },
        captureUpdate: "IMMEDIATELY",
      });
    },
    [applySelectedTextUpdate, excalidrawApi, selectedTextElement, textToolbarStyle],
  );

  const handleSelectedShapeDimensionChange = useCallback(
    (dimension: "width" | "height", value: number) => {
      if (!selectedShapeElement || Number.isNaN(value)) {
        return;
      }

      applySelectedShapeUpdate({ [dimension]: value });
    },
    [applySelectedShapeUpdate, selectedShapeElement],
  );

  const handleCreateImageGenerator = useCallback(() => {
    if (!excalidrawApi) return;
    const elementId = createImageGeneratorElement(excalidrawApi);
    // Select the newly created element so onChange recognises it
    excalidrawApi.updateScene({
      appState: { selectedElementIds: { [elementId]: true } },
    });
    setActiveGeneratorId(elementId);
    // Read back the created element to populate initial state
    const elements = excalidrawApi.getSceneElements();
    const el = elements.find((e: any) => e.id === elementId);
    if (el) {
      setGeneratorData(getImageGeneratorData(el));
      setGeneratorBounds({
        x: el.x as number,
        y: el.y as number,
        width: el.width as number,
        height: el.height as number,
      });
    }
  }, [excalidrawApi]);

  const handleCloseGenerator = useCallback(() => {
    setActiveGeneratorId(null);
    setGeneratorData(null);
    setGeneratorBounds(null);
  }, []);

  const handleCreateVideoGenerator = useCallback(() => {
    if (!excalidrawApi) return;
    const videoId = createVideoGeneratorElement(excalidrawApi, {
      aspectRatio: "16:9",
    });
    excalidrawApi.updateScene({
      appState: { selectedElementIds: { [videoId]: true } },
    });
    setActiveVideoGenId(videoId);
    // Read back the created element to populate initial state
    const elements = excalidrawApi.getSceneElements();
    const el = elements.find((e: any) => e.id === videoId);
    if (el) {
      setVideoGenData(getVideoGeneratorData(el));
      setVideoGenBounds({
        x: el.x as number,
        y: el.y as number,
        width: el.width as number,
        height: el.height as number,
      });
    }
  }, [excalidrawApi]);

  const handleCloseVideoGenerator = useCallback(() => {
    setActiveVideoGenId(null);
    setVideoGenData(null);
    setVideoGenBounds(null);
  }, []);

  const handleCloseVideoPlayer = useCallback(() => {
    setActiveVideoPlayerId(null);
    setVideoPlayerData(null);
    setVideoPlayerBounds(null);
  }, []);

  const activateWithoutStealingFocus = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, action: () => void) => {
      event.preventDefault();
      action();
    },
    [],
  );

  const handleKeyboardActivate = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, action: () => void) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        action();
      }
    },
    [],
  );

  useEffect(() => {
    if (!shapeFlyoutOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!railRef.current?.contains(event.target as Node)) {
        setShapeFlyoutOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShapeFlyoutOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [shapeFlyoutOpen]);

useEffect(() => {
    if (!addModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAddModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [addModalOpen]);

  const loadOfficialGalleryData = useCallback(async () => {
    if (officialGalleryLoading) {
      return;
    }

    setOfficialGalleryLoading(true);
    setOfficialGalleryLoadError(null);
    console.info("[canvas-tool-menu] loading official gallery library");

    try {
      const nextLibrary = await loadOfficialGalleryLibrary();
      const resolvedLibrary =
        nextLibrary.length > 0 ? nextLibrary : officialGallerySeedLibrary;

      setOfficialGalleryLibrary(resolvedLibrary);
      setOfficialGalleryLoaded(true);
      console.info("[canvas-tool-menu] official gallery library ready", {
        categoryCount: resolvedLibrary.length,
      });
    } catch (error) {
      console.warn(
        "[canvas-tool-menu] failed to load official gallery library, falling back to seeds",
        error,
      );
      setOfficialGalleryLibrary(officialGallerySeedLibrary);
      setOfficialGalleryLoaded(true);
      setOfficialGalleryLoadError("官方图库暂时未连上在线图源，已切换到本地受控素材库。");
    } finally {
      setOfficialGalleryLoading(false);
    }
  }, [officialGalleryLoading]);

  useEffect(() => {
    if (
      !addModalOpen ||
      activeAddTab !== "official-gallery" ||
      officialGalleryLoaded ||
      officialGalleryLoading
    ) {
      return;
    }

    void loadOfficialGalleryData();
  }, [
    activeAddTab,
    addModalOpen,
    loadOfficialGalleryData,
    officialGalleryLoaded,
    officialGalleryLoading,
  ]);

  useEffect(() => {
    const nextCategory =
      officialGalleryLibrary.find((category) => category.id === activeOfficialGalleryCategory) ??
      officialGalleryLibrary[0];

    if (!nextCategory) {
      return;
    }

    if (nextCategory.id !== activeOfficialGalleryCategory) {
      setActiveOfficialGalleryCategory(nextCategory.id);
      return;
    }

    const nextSubtype =
      nextCategory.subtypes.find((subtype) => subtype.id === activeOfficialGallerySubtype) ??
      nextCategory.subtypes[0];

    if (nextSubtype && nextSubtype.id !== activeOfficialGallerySubtype) {
      setActiveOfficialGallerySubtype(nextSubtype.id);
    }
  }, [
    activeOfficialGalleryCategory,
    activeOfficialGallerySubtype,
    officialGalleryLibrary,
  ]);

  const activeOfficialGalleryCategoryRecord = useMemo(
    () =>
      officialGalleryLibrary.find((category) => category.id === activeOfficialGalleryCategory) ??
      officialGalleryLibrary[0] ??
      null,
    [activeOfficialGalleryCategory, officialGalleryLibrary],
  );
  const activeOfficialSubtypeOptions = useMemo(
    () => activeOfficialGalleryCategoryRecord?.subtypes ?? [],
    [activeOfficialGalleryCategoryRecord],
  );
  const activeOfficialGallerySubtypeRecord = useMemo(
    () =>
      activeOfficialSubtypeOptions.find((subtype) => subtype.id === activeOfficialGallerySubtype) ??
      activeOfficialSubtypeOptions[0] ??
      null,
    [activeOfficialGallerySubtype, activeOfficialSubtypeOptions],
  );
  const activeOfficialGalleryItems = useMemo(
    () => activeOfficialGallerySubtypeRecord?.items ?? [],
    [activeOfficialGallerySubtypeRecord],
  );
  const activeMyCreationItems = MY_CREATION_SAMPLE_ITEMS[activeMyCreationSource] ?? [];

  const closeAddModal = useCallback(() => {
    setAddModalOpen(false);
  }, []);

  const handleAddTabSelect = useCallback((tab: AddModalTab) => {
    setActiveAddTab(tab);
  }, []);

  const handleSelectOfficialGalleryCategory = useCallback(
    (categoryId: string) => {
      const nextSubtypeId =
        officialGalleryLibrary.find((category) => category.id === categoryId)?.subtypes[0]?.id ??
        "";

      setActiveOfficialGalleryCategory(categoryId);
      setActiveOfficialGallerySubtype(nextSubtypeId);
    },
    [officialGalleryLibrary],
  );

  const handleScrollOfficialGalleryCategories = useCallback(
    (direction: "left" | "right") => {
      const strip = officialGalleryCategoryStripRef.current;
      if (!strip) {
        return;
      }

      const delta = direction === "left" ? -240 : 240;
      console.log("[canvas-tool-menu] scroll official gallery categories", {
        direction,
        delta,
      });

      if (typeof strip.scrollBy === "function") {
        strip.scrollBy({ left: delta, behavior: "smooth" });
        return;
      }

      strip.scrollLeft += delta;
    },
    [],
  );

  const handleInsertGalleryImage = useCallback(
    async (
      item: GallerySampleItem,
      options: {
        index: number;
        logSource: "official-gallery" | "my-creations";
      },
    ) => {
      if (!excalidrawApi) {
        return;
      }

      try {
        await insertImageOnCanvas(excalidrawApi, {
          type: "image",
          title: item.label,
          url: item.url,
          mimeType: "image/png",
          width: item.width,
          height: item.height,
        });
        closeAddModal();
      } catch (error) {
        console.warn("[canvas-tool-menu] failed to insert gallery image", {
          error,
          itemId: item.id,
          index: options.index,
          source: options.logSource,
        });
      }
    },
    [closeAddModal, excalidrawApi],
  );

  const handleInsertOfficialGalleryImage = useCallback(
    async (item: GallerySampleItem, index: number) => {
      await handleInsertGalleryImage(item, {
        index,
        logSource: "official-gallery",
      });
    },
    [handleInsertGalleryImage],
  );

  const handleInsertMyCreationImage = useCallback(
    async (item: GallerySampleItem, index: number) => {
      await handleInsertGalleryImage(item, {
        index,
        logSource: "my-creations",
      });
    },
    [handleInsertGalleryImage],
  );

  const renderArchitectureRail = () => {
    const resolvedActiveArchitectureShapeItemId =
      activeArchitectureShapeItemId ??
      (activeTool === "line"
        ? "line"
        : isArchitectureShapeFlyoutItemId(activeTool)
          ? activeTool
          : null);

    return (
      <div
        ref={railRef}
        className="absolute top-1/2 z-30 -translate-y-1/2 transition-[left] duration-200"
        data-testid="architecture-canvas-tool-rail"
        style={{ left: leftPanelOpen ? 296 : 16 }}
      >
        <div className="flex flex-col gap-2 rounded-[10px] border border-slate-200 bg-white/95 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.1)] backdrop-blur">
          {ARCHITECTURE_RAIL_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.id === "selection"
                ? activeTool === "selection"
                : item.id === "shape"
                  ? shapeFlyoutOpen ||
                    Boolean(selectedShapeElement) ||
                    Boolean(resolvedActiveArchitectureShapeItemId) ||
                    ["rectangle", "ellipse", "diamond", "arrow", "line"].includes(activeTool)
                  : item.id === "add"
                    ? addModalOpen
                    : activeTool === item.id;

            const baseClass =
              "flex w-12 flex-col items-center gap-1 rounded-[10px] px-2 py-3 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
            const activeClass = isActive
              ? "bg-slate-100 text-foreground shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]"
              : "text-foreground/70 hover:bg-slate-50 hover:text-foreground";

            const handleSelect = () => {
              if (item.id === "add") {
                setShapeFlyoutOpen(false);
                setAddModalOpen(true);
                return;
              }

              if (item.id === "shape") {
                setShapeFlyoutOpen((current) => !current);
                return;
              }

              const directTool: ToolType =
                item.id === "selection"
                  ? "selection"
                  : item.id === "freedraw"
                    ? "freedraw"
                    : "text";
              handleToolChange(directTool);
            };

            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                className={`${baseClass} ${activeClass}`}
                onKeyDown={(event) => handleKeyboardActivate(event, handleSelect)}
                onMouseDown={(event) =>
                  activateWithoutStealingFocus(event, handleSelect)
                }
              >
                <Icon className="size-[18px]" />
                <span className="leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>

        {shapeFlyoutOpen ? (
          <div
            className="absolute left-[56px] top-[126px] w-[142px] rounded-[10px] border border-slate-200 bg-white/98 p-2 shadow-[0_22px_56px_rgba(15,23,42,0.12)] backdrop-blur"
            data-testid="architecture-canvas-tool-flyout-shape"
          >
            <div className="grid grid-cols-3 gap-2">
                {ARCHITECTURE_SHAPE_FLYOUT_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = resolvedActiveArchitectureShapeItemId === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={item.ariaLabel}
                      data-shape-icon={item.iconId}
                      className={`flex h-9 w-9 items-center justify-center rounded-[10px] border text-slate-700 transition-colors ${
                        isActive
                          ? "border-slate-300 bg-slate-100"
                          : "border-slate-200 bg-white/90 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      onKeyDown={(event) =>
                        handleKeyboardActivate(event, () =>
                          handleToolChange(item.tool, {
                            closeShapeFlyout: false,
                            shapeFlyoutItemId: item.id,
                          }),
                        )
                      }
                      onMouseDown={(event) =>
                        activateWithoutStealingFocus(event, () =>
                          handleToolChange(item.tool, {
                            closeShapeFlyout: false,
                            shapeFlyoutItemId: item.id,
                          }),
                        )
                      }
                    >
                      <Icon className="size-4" />
                    </button>
                  );
                })}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderArchitectureShapeToolbar = () => {
    if (!immersiveArchitecture) {
      return null;
    }

    const toolbarMode = selectedShapeElement
      ? selectedShapeElement.type === "freedraw"
        ? "freedraw-selection"
        : "selection"
      : selectedTextElement
        ? "text-selection"
      : activeTool === "freedraw"
        ? "freedraw"
        : activeTool === "text"
          ? "text"
          : shapeFlyoutOpen || isShapeToolId(activeTool)
            ? "tool"
            : null;

    if (!toolbarMode) {
      return null;
    }

    const currentStyle = selectedShapeElement
      ? normalizeShapeToolbarStyle(selectedShapeElement)
      : shapeToolbarStyle;
    const strokeColorValue = normalizeColorInputValue(
      currentStyle.strokeColor,
      "#0f172a",
    );
    const fillColorValue = normalizeColorInputValue(
      currentStyle.backgroundColor,
      "#ffffff",
    );
    const selectionToolbarStyle = selectedShapeElement
      ? buildCanvasSelectionToolbarStyle({
          x: selectedShapeElement.x,
          y: selectedShapeElement.y,
          width: selectedShapeElement.width,
          height: selectedShapeElement.height,
          scrollX: canvasScrollZoom.scrollX,
          scrollY: canvasScrollZoom.scrollY,
          zoom: canvasScrollZoom.zoom,
        })
      : selectedTextElement
        ? buildCanvasSelectionToolbarStyle({
            x: selectedTextElement.x,
            y: selectedTextElement.y,
            width: selectedTextElement.width,
            height: selectedTextElement.height,
            scrollX: canvasScrollZoom.scrollX,
            scrollY: canvasScrollZoom.scrollY,
            zoom: canvasScrollZoom.zoom,
          })
      : null;
    const textStyle = selectedTextElement
      ? normalizeTextToolbarStyle(selectedTextElement)
      : textToolbarStyle;

    if (
      (toolbarMode === "freedraw" || toolbarMode === "freedraw-selection") &&
      selectionToolbarStyle &&
      toolbarMode === "freedraw-selection" &&
      typeof document !== "undefined"
    ) {
      return createPortal(
        <div
          className="pointer-events-auto fixed z-[72] w-fit max-w-[calc(100vw-4rem)] -translate-x-1/2"
          data-anchor="canvas-selection"
          data-mode={toolbarMode}
          data-testid="architecture-canvas-shape-toolbar"
          style={selectionToolbarStyle}
        >
          <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-slate-200 bg-white/96 px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.1)] backdrop-blur">
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500">颜色</span>
              <input
                aria-label="涂鸦颜色"
                type="color"
                value={strokeColorValue}
                onChange={(event) => handleShapeStrokeSelect(event.currentTarget.value)}
                className="h-8 w-8 cursor-pointer rounded-[8px] border border-slate-200 bg-white p-1"
              />
            </label>
            <label className="flex min-w-[220px] items-center gap-3">
              <span className="text-[11px] font-medium text-slate-500">粗细</span>
              <input
                aria-label="涂鸦粗细"
                type="range"
                min={1}
                max={16}
                step={1}
                value={currentStyle.strokeWidth}
                onChange={(event) =>
                  handleShapeStrokeWidthChange(Number(event.currentTarget.value))
                }
                className="h-2 flex-1 accent-slate-900"
              />
              <span className="w-8 text-right text-[11px] font-medium text-slate-700">
                {currentStyle.strokeWidth}
              </span>
            </label>
          </div>
        </div>,
        document.body,
      );
    }

    if (toolbarMode === "freedraw") {
      return (
        <div
          className="absolute left-1/2 top-4 z-30 w-fit max-w-[calc(100vw-4rem)] -translate-x-1/2"
          data-mode={toolbarMode}
          data-testid="architecture-canvas-shape-toolbar"
        >
          <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-slate-200 bg-white/96 px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.1)] backdrop-blur">
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500">颜色</span>
              <input
                aria-label="涂鸦颜色"
                type="color"
                value={strokeColorValue}
                onChange={(event) => handleShapeStrokeSelect(event.currentTarget.value)}
                className="h-8 w-8 cursor-pointer rounded-[8px] border border-slate-200 bg-white p-1"
              />
            </label>
            <label className="flex min-w-[220px] items-center gap-3">
              <span className="text-[11px] font-medium text-slate-500">粗细</span>
              <input
                aria-label="涂鸦粗细"
                type="range"
                min={1}
                max={16}
                step={1}
                value={currentStyle.strokeWidth}
                onChange={(event) =>
                  handleShapeStrokeWidthChange(Number(event.currentTarget.value))
                }
                className="h-2 flex-1 accent-slate-900"
              />
              <span className="w-8 text-right text-[11px] font-medium text-slate-700">
                {currentStyle.strokeWidth}
              </span>
            </label>
          </div>
        </div>
      );
    }

    if (
      (toolbarMode === "text" || toolbarMode === "text-selection") &&
      selectionToolbarStyle &&
      toolbarMode === "text-selection" &&
      typeof document !== "undefined"
    ) {
      return createPortal(
        <div
          className="pointer-events-auto fixed z-[72] w-fit max-w-[calc(100vw-4rem)] -translate-x-1/2"
          data-anchor="canvas-selection"
          data-mode={toolbarMode}
          data-testid="architecture-canvas-shape-toolbar"
          style={selectionToolbarStyle}
        >
          <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-slate-200 bg-white/96 px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.1)] backdrop-blur">
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500">颜色</span>
              <input
                aria-label="文字颜色"
                type="color"
                value={normalizeColorInputValue(textStyle.color, "#ef4444")}
                onChange={(event) => handleTextStyleChange({ color: event.currentTarget.value })}
                className="h-8 w-8 cursor-pointer rounded-[8px] border border-slate-200 bg-white p-1"
              />
            </label>
            <label className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
              <span>字号</span>
              <input
                aria-label="文字字号"
                type="number"
                min={12}
                max={96}
                value={textStyle.fontSize}
                onChange={(event) =>
                  handleTextStyleChange({ fontSize: Number(event.currentTarget.value) })
                }
                className="h-8 w-20 rounded-[8px] border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
              />
            </label>
          </div>
        </div>,
        document.body,
      );
    }

    if (toolbarMode === "text") {
      return (
        <div
          className="absolute left-1/2 top-4 z-30 w-fit max-w-[calc(100vw-4rem)] -translate-x-1/2"
          data-mode={toolbarMode}
          data-testid="architecture-canvas-shape-toolbar"
        >
          <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-slate-200 bg-white/96 px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.1)] backdrop-blur">
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500">颜色</span>
              <input
                aria-label="文字颜色"
                type="color"
                value={normalizeColorInputValue(textStyle.color, "#ef4444")}
                onChange={(event) => handleTextStyleChange({ color: event.currentTarget.value })}
                className="h-8 w-8 cursor-pointer rounded-[8px] border border-slate-200 bg-white p-1"
              />
            </label>
            <label className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
              <span>字号</span>
              <input
                aria-label="文字字号"
                type="number"
                min={12}
                max={96}
                value={textStyle.fontSize}
                onChange={(event) =>
                  handleTextStyleChange({ fontSize: Number(event.currentTarget.value) })
                }
                className="h-8 w-20 rounded-[8px] border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
              />
            </label>
          </div>
        </div>
      );
    }

    const toolbarCard = (
      <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-slate-200 bg-white/96 px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.1)] backdrop-blur">
        <label className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-500">描边</span>
          <input
            aria-label="描边颜色"
            type="color"
            value={strokeColorValue}
            onChange={(event) => handleShapeStrokeSelect(event.currentTarget.value)}
            className="h-8 w-8 cursor-pointer rounded-[8px] border border-slate-200 bg-white p-1"
          />
        </label>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">填充</span>
            <input
              aria-label="填充颜色"
              type="color"
              value={fillColorValue}
              onChange={(event) => handleShapeFillSelect(event.currentTarget.value)}
              className="h-8 w-8 cursor-pointer rounded-[8px] border border-slate-200 bg-white p-1"
            />
          </label>
          <button
            type="button"
            aria-label="清除填充"
            className="inline-flex h-8 items-center justify-center rounded-[8px] border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
            onClick={() => handleShapeFillSelect("transparent")}
          >
            清除填充
          </button>
        </div>

        <label className="flex min-w-[180px] items-center gap-3">
          <span className="text-[11px] font-medium text-slate-500">线宽</span>
          <input
            aria-label="形状线宽"
            type="range"
            min={1}
            max={16}
            step={1}
            value={currentStyle.strokeWidth}
            onChange={(event) =>
              handleShapeStrokeWidthChange(Number(event.currentTarget.value))
            }
            className="h-2 flex-1 accent-slate-900"
          />
          <span className="w-8 text-right text-[11px] font-medium text-slate-700">
            {currentStyle.strokeWidth}
          </span>
        </label>

        {selectedShapeElement ? (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
              <span>W</span>
              <input
                aria-label="形状宽度"
                type="number"
                min={1}
                value={Math.round(selectedShapeElement.width)}
                onChange={(event) =>
                  handleSelectedShapeDimensionChange(
                    "width",
                    Number(event.currentTarget.value),
                  )
                }
                className="h-8 w-20 rounded-[8px] border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
              />
            </label>
            <label className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
              <span>H</span>
              <input
                aria-label="形状高度"
                type="number"
                min={1}
                value={Math.round(selectedShapeElement.height)}
                onChange={(event) =>
                  handleSelectedShapeDimensionChange(
                    "height",
                    Number(event.currentTarget.value),
                  )
                }
                className="h-8 w-20 rounded-[8px] border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
              />
            </label>
          </div>
        ) : null}
      </div>
    );

    if (
      (toolbarMode === "selection" || toolbarMode === "freedraw-selection") &&
      selectionToolbarStyle &&
      typeof document !== "undefined"
    ) {
      return createPortal(
        <div
          className="pointer-events-auto fixed z-[72] w-fit max-w-[calc(100vw-4rem)] -translate-x-1/2"
          data-anchor="canvas-selection"
          data-mode={toolbarMode}
          data-testid="architecture-canvas-shape-toolbar"
          style={selectionToolbarStyle}
        >
          {toolbarCard}
        </div>,
        document.body,
      );
    }

    return (
      <div
        className="absolute left-1/2 top-4 z-30 w-fit max-w-[calc(100vw-4rem)] -translate-x-1/2"
        data-mode={toolbarMode}
        data-testid="architecture-canvas-shape-toolbar"
      >
        {toolbarCard}
      </div>
    );
  };

const renderAddModal = () => {
    if (!addModalOpen || typeof document === "undefined") {
      return null;
    }

    return createPortal(
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/20 px-6 backdrop-blur-[2px]"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeAddModal();
          }
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="添加素材"
          data-layout="fixed-responsive"
          className="relative flex h-[min(78vh,760px)] w-[min(1100px,calc(100vw-48px))] max-h-[calc(100vh-48px)] max-w-[1100px] flex-col overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.14)]"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            aria-label="关闭添加素材窗口"
            className="absolute right-6 top-5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
            onClick={closeAddModal}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.98))] px-6 pb-5 pt-6 pr-20">
            <div
              role="tablist"
              aria-label="添加素材分类"
              className="grid gap-3 sm:grid-cols-3"
            >
              {ADD_MODAL_TABS.map((tab) => {
                const Icon = tab.icon;
                const selected = activeAddTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-label={tab.label}
                    aria-selected={selected}
                    aria-controls={`add-material-panel-${tab.id}`}
                    id={`add-material-tab-${tab.id}`}
                    className={`group flex min-h-[88px] items-start gap-3 rounded-[14px] border px-4 py-3 text-left transition-all ${
                      selected
                        ? "border-slate-900 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
                        : "border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white"
                    }`}
                    onClick={() => handleAddTabSelect(tab.id)}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] transition-colors ${
                        selected
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-600 group-hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">
                        {tab.label}
                      </span>
                      <span aria-hidden="true" className="mt-1 block text-xs leading-5 text-slate-500">
                        {tab.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            data-testid="architecture-add-dialog-body"
            data-scroll-region="true"
            className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
          >
            {activeAddTab === "local-upload" ? (
              <div
                id="add-material-panel-local-upload"
                role="tabpanel"
                aria-labelledby="add-material-tab-local-upload"
                className="flex h-full min-h-[440px] items-center justify-center"
              >
                <div className="w-full max-w-[760px] rounded-[18px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(241,245,249,0.8),rgba(255,255,255,1))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="mx-auto flex max-w-[520px] flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-slate-900 text-white shadow-[0_18px_32px_rgba(15,23,42,0.18)]">
                      <ImageUp className="h-7 w-7" />
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                      上传本地图片
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      支持 PNG、JPG、WEBP。上传后会直接插入当前画板，适合快速补参考图和过程稿。
                    </p>
                    <button
                      type="button"
                      aria-label="上传图片"
                      className="mt-6 inline-flex h-14 min-w-[220px] items-center justify-center gap-3 rounded-[14px] bg-slate-900 px-8 text-base font-semibold text-white shadow-[0_16px_32px_rgba(15,23,42,0.16)] transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => {
                        onUploadReference?.();
                        closeAddModal();
                      }}
                      disabled={typeof onUploadReference !== "function"}
                    >
                      <ImageUp className="h-5 w-5" />
                      上传图片
                    </button>
                  </div>
                  <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-[14px] border border-white bg-white/90 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                      <div className="font-semibold text-slate-900">快速插入</div>
                      <p className="mt-1 leading-6 text-slate-500">
                        选完文件后会直接回到当前画板继续操作。
                      </p>
                    </div>
                    <div className="rounded-[14px] border border-white bg-white/90 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                      <div className="font-semibold text-slate-900">稳定展示</div>
                      <p className="mt-1 leading-6 text-slate-500">
                        插入后保留原图比例，减少封面裁切和缩放出错。
                      </p>
                    </div>
                    <div className="rounded-[14px] border border-white bg-white/90 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                      <div className="font-semibold text-slate-900">继续生产</div>
                      <p className="mt-1 leading-6 text-slate-500">
                        适合补参考、贴材质和整理过程稿，不打断当前流畅度。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeAddTab === "official-gallery" ? (
              <div
                id="add-material-panel-official-gallery"
                role="tabpanel"
                aria-labelledby="add-material-tab-official-gallery"
                className="grid gap-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">官方图库</div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      已切换为本地受控素材源，优先保证加载稳定、可维护和后续可继续沉淀。
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void loadOfficialGalleryData()}
                    disabled={officialGalleryLoading}
                  >
                    <Sparkles className="h-4 w-4" />
                    刷新图库
                  </button>
                </div>
                {officialGalleryLoadError ? (
                  <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {officialGalleryLoadError}
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="向左滚动官方图库分类"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100"
                    onClick={() => handleScrollOfficialGalleryCategories("left")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div
                    ref={officialGalleryCategoryStripRef}
                    data-testid="official-gallery-category-strip"
                    className="flex flex-1 gap-2 overflow-x-auto py-1"
                  >
                    {officialGalleryLibrary.map((category) => {
                      const selected = activeOfficialGalleryCategoryRecord?.id === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          aria-pressed={selected}
                          className={`shrink-0 rounded-[8px] border px-3 py-2 text-sm font-medium transition-colors ${
                            selected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                          onClick={() => handleSelectOfficialGalleryCategory(category.id)}
                        >
                          {category.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    aria-label="向右滚动官方图库分类"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100"
                    onClick={() => handleScrollOfficialGalleryCategories("right")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeOfficialSubtypeOptions.map((subtype) => {
                    const selected = activeOfficialGallerySubtypeRecord?.id === subtype.id;
                    return (
                      <button
                        key={subtype.id}
                        type="button"
                        aria-pressed={selected}
                        className={`rounded-[8px] border px-3 py-2 text-sm font-medium transition-colors ${
                          selected
                            ? "border-slate-900 bg-slate-100 text-slate-900"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                        onClick={() => setActiveOfficialGallerySubtype(subtype.id)}
                      >
                        {subtype.label}
                      </button>
                    );
                  })}
                </div>
                {officialGalleryLoading && activeOfficialGalleryItems.length === 0 ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={`official-gallery-loading-${index}`}
                        className="overflow-hidden rounded-[14px] border border-slate-200 bg-white p-3"
                      >
                        <div className="aspect-[4/3] animate-pulse rounded-[10px] bg-slate-100" />
                        <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                      </div>
                    ))}
                  </div>
                ) : activeOfficialGalleryItems.length === 0 ? (
                  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[16px] border border-dashed border-slate-300 bg-slate-50 px-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="mt-4 text-base font-semibold text-slate-900">
                      当前分类还没有可用图片
                    </div>
                    <p className="mt-2 max-w-[420px] text-sm leading-6 text-slate-500">
                      先保留这个分类入口，后续可以继续往本地图库库表补真实图片，不需要再改弹窗结构。
                    </p>
                  </div>
                ) : (
                  <div
                    data-testid="official-gallery-grid"
                    className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6"
                  >
                    {activeOfficialGalleryItems.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-label={`插入官方图库图片 ${item.label}`}
                        className="group overflow-hidden rounded-[14px] border border-slate-200 bg-white text-left shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_28px_rgba(15,23,42,0.08)]"
                        onClick={() => handleInsertOfficialGalleryImage(item, index)}
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                          <img
                            src={item.url}
                            alt={item.label}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                        </div>
                        <div className="border-t border-slate-100 px-3 py-2.5">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {item.label}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">点击后直接插入当前画板</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {activeAddTab === "my-creations" ? (
              <div
                id="add-material-panel-my-creations"
                role="tabpanel"
                aria-labelledby="add-material-tab-my-creations"
                className="grid gap-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">我的创作</div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      当前先接入本地样例资产，后续可以无缝替换成用户真实生成内容而不改交互层。
                    </p>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {activeMyCreationItems.length} 个样例
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MY_CREATION_SOURCES.map((source) => {
                    const selected = activeMyCreationSource === source.id;
                    return (
                      <button
                        key={source.id}
                        type="button"
                        aria-pressed={selected}
                        className={`rounded-[8px] border px-3 py-2 text-sm font-medium transition-colors ${
                          selected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                        onClick={() => setActiveMyCreationSource(source.id)}
                      >
                        {source.label}
                      </button>
                    );
                  })}
                </div>
                {activeMyCreationItems.length === 0 ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[10px] border border-dashed border-slate-300 bg-slate-50 px-8 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl text-slate-300">
                      ✦
                    </div>
                    <div className="text-sm font-medium text-slate-700">数据为空</div>
                  </div>
                ) : (
                  <div
                    data-testid="my-creations-grid"
                    className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6"
                  >
                    {activeMyCreationItems.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-label={`插入我的创作图片 ${item.label}`}
                        className="group overflow-hidden rounded-[14px] border border-slate-200 bg-white text-left shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_28px_rgba(15,23,42,0.08)]"
                        onClick={() => handleInsertMyCreationImage(item, index)}
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                          <img
                            src={item.url}
                            alt={item.label}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                        </div>
                        <div className="border-t border-slate-100 px-3 py-2.5">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {item.label}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">点击后重新插回当前画板</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>,
      document.body,
    );
  };  const renderClassicToolbar = () => (
    <div
      className="absolute bottom-5 z-30 flex items-center gap-0.5 rounded-[10px] border border-border bg-card/75 p-1 shadow-card backdrop-blur-lg transition-[left,transform] duration-200"
      style={{
        left: leftPanelOpen ? "calc(140px + 50%)" : "50%",
        transform: "translateX(-50%)",
      }}
    >
      {TOOL_GROUPS.map((tool, i) => {
        if (tool === null) {
          return <div key={`sep-${i}`} className="mx-0.5 h-6 w-px bg-border" />;
        }

        const Icon = TOOL_ICONS[tool];
        const isActive = activeTool === tool;

        return (
          <button
            key={tool}
            type="button"
            title={TOOL_LABELS[tool]}
            aria-label={TOOL_LABELS[tool]}
            onMouseDown={(e) => {
              e.preventDefault();
              handleToolChange(tool);
            }}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
              isActive
                ? "bg-foreground/[0.08] text-foreground"
                : "text-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground"
            }`}
          >
            <Icon className="size-[16px]" />
          </button>
        );
      })}

      <div className="mx-0.5 h-6 w-px bg-border" />

      <button
        type="button"
        title="AI 生成图片"
        aria-label="AI 生成图片"
        onClick={handleCreateImageGenerator}
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
          activeGeneratorId
            ? "bg-foreground/[0.08] text-foreground"
            : "text-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground"
        }`}
      >
        <Sparkles className="size-[16px]" />
      </button>

      <button
        type="button"
        title="AI 生成视频"
        aria-label="AI 生成视频"
        onClick={handleCreateVideoGenerator}
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
          activeVideoGenId
            ? "bg-foreground/[0.08] text-foreground"
            : "text-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground"
        }`}
      >
        <Video className="size-[16px]" />
      </button>
    </div>
  );

  return (
    <>
      {immersiveArchitecture ? renderArchitectureRail() : renderClassicToolbar()}
      {renderArchitectureShapeToolbar()}
      {renderAddModal()}

      {/* Image Generator Panel -- floats below the selected placeholder */}
      {activeGeneratorId && generatorData && generatorBounds && (
        <ImageGeneratorPanel
          elementId={activeGeneratorId}
          elementBounds={generatorBounds}
          data={generatorData}
          excalidrawApi={excalidrawApi}
          accessToken={accessToken}
          canvasScrollZoom={canvasScrollZoom}
          onClose={handleCloseGenerator}
        />
      )}

      {/* Video Generator Panel -- floats below the selected placeholder */}
      {activeVideoGenId && videoGenData && videoGenBounds && (
        <VideoGeneratorPanel
          elementId={activeVideoGenId}
          elementBounds={videoGenBounds}
          data={videoGenData}
          excalidrawApi={excalidrawApi}
          accessToken={accessToken}
          canvasScrollZoom={canvasScrollZoom}
          onClose={handleCloseVideoGenerator}
        />
      )}

      {/* Video Player Panel -- floats when a completed video element is selected */}
      {activeVideoPlayerId && videoPlayerData && videoPlayerBounds && (
        <VideoPlayerPanel
          elementId={activeVideoPlayerId}
          elementBounds={videoPlayerBounds}
          videoUrl={videoPlayerData.videoUrl}
          mimeType={videoPlayerData.mimeType}
          {...(videoPlayerData.durationSeconds != null ? { durationSeconds: videoPlayerData.durationSeconds } : {})}
          {...(videoPlayerData.title != null ? { title: videoPlayerData.title } : {})}
          canvasScrollZoom={canvasScrollZoom}
          onClose={handleCloseVideoPlayer}
        />
      )}

      {/* Shimmer overlays for generating elements */}
      {generatingElements.length > 0 &&
        createPortal(
          <>
            {generatingElements.map((el) => (
              <GeneratingOverlay key={el.id} {...el} />
            ))}
          </>,
          document.body,
        )}

    </>
  );
}




