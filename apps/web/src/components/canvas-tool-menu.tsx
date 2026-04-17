"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  memo,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
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
type AddModalTab = "local-upload" | "official-gallery" | "enterprise-gallery" | "my-creations";
type OfficialGalleryCategoryId =
  | "architecture-render"
  | "interior-render"
  | "landscape-render"
  | "urban-render"
  | "color-plan"
  | "collage-render"
  | "illustration-render"
  | "competition-render"
  | "night-render"
  | "plan-section-reference"
  | "interior-plan";
type MyCreationSourceId =
  | "ai-drawing"
  | "banana-agent"
  | "model-render"
  | "site-coloring"
  | "hand-drawing"
  | "inpaint";
type ShapeToolbarStyle = {
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
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

const ADD_MODAL_TABS: Array<{
  id: AddModalTab;
  label: string;
}> = [
  { id: "local-upload", label: "本地上传" },
  { id: "official-gallery", label: "官方图库" },
  { id: "enterprise-gallery", label: "企业图库" },
  { id: "my-creations", label: "我的创作" },
];

const OFFICIAL_GALLERY_MAJOR_CATEGORIES: Array<{
  id: OfficialGalleryCategoryId;
  label: string;
}> = [
  { id: "architecture-render", label: "建筑效果图" },
  { id: "interior-render", label: "室内效果图" },
  { id: "landscape-render", label: "景观效果图" },
  { id: "urban-render", label: "城市效果图" },
  { id: "color-plan", label: "彩平参考图" },
  { id: "collage-render", label: "拼贴效果图" },
  { id: "illustration-render", label: "插画效果图" },
  { id: "competition-render", label: "竞赛效果图" },
  { id: "night-render", label: "夜景效果图" },
  { id: "plan-section-reference", label: "平立剖参考" },
  { id: "interior-plan", label: "室内平面图" },
];

const ARCHITECTURE_RENDER_SUBTYPES = [
  "默认",
  "别墅",
  "小区住宅",
  "办公楼",
  "办公园区",
  "文化建筑",
  "酒店",
  "商业综合体",
  "学校",
  "幼儿园",
  "体育馆",
  "售楼部",
  "会所",
  "商业街",
  "商业门头",
  "医院",
  "工业厂房",
  "交通建筑",
  "文旅",
  "民宿",
] as const;

const OFFICIAL_GALLERY_SAMPLE_ITEMS = [
  {
    id: "architecture-default-1",
    label: "建筑效果图 默认 1",
    url: "http://image-assets.soutushenqi.com/jzxz_photo/top_tier_architectural_rendering/8b19a4cf-c1be-4ff0-834b-02ba814eb4fd.png?x-tos-process=image/resize,w_480",
    width: 1600,
    height: 900,
  },
  {
    id: "architecture-default-2",
    label: "建筑效果图 默认 2",
    url: "http://image-assets.soutushenqi.com/jzxz_photo/top_tier_architectural_rendering/9ee1d14e-b422-4587-8fda-4c4dac6eb128.png?x-tos-process=image/resize,w_480",
    width: 1600,
    height: 900,
  },
  {
    id: "architecture-default-3",
    label: "建筑效果图 默认 3",
    url: "http://image-assets.soutushenqi.com/jzxz_photo/top_tier_architectural_rendering/9c3d4e53-ba53-4cc5-a526-53906020b225.png?x-tos-process=image/resize,w_480",
    width: 1600,
    height: 900,
  },
  {
    id: "architecture-default-4",
    label: "建筑效果图 默认 4",
    url: "http://image-assets.soutushenqi.com/jzxz_photo/top_tier_architectural_rendering/c03941e9-2cc5-4c10-a3db-9737d562e1a1.png?x-tos-process=image/resize,w_480",
    width: 1600,
    height: 900,
  },
  {
    id: "architecture-villa-1",
    label: "建筑效果图 别墅 1",
    url: "http://image-assets.soutushenqi.com/jzxz_photo/top_tier_architectural_rendering/562251b1-bc95-487e-b033-b24dec7e7537.png?x-tos-process=image/resize,w_480",
    width: 1600,
    height: 900,
  },
  {
    id: "architecture-villa-2",
    label: "建筑效果图 别墅 2",
    url: "http://image-assets.soutushenqi.com/jzxz_photo/top_tier_architectural_rendering/ef7ae925-d089-4b7d-bd96-6d937a709bd3.png?x-tos-process=image/resize,w_480",
    width: 1600,
    height: 900,
  },
] as const;

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

const SHAPE_TOOL_IDS: ToolType[] = [
  "rectangle",
  "ellipse",
  "diamond",
  "arrow",
  "line",
];

const SHAPE_STROKE_OPTIONS = [
  { id: "transparent", label: "设置描边为透明", value: "transparent" },
  { id: "dark", label: "设置描边为深色", value: "#0f172a" },
  { id: "slate", label: "设置描边为灰色", value: "#64748b" },
] as const;

const SHAPE_FILL_OPTIONS = [
  { id: "transparent", label: "设置填充为透明", value: "transparent" },
  { id: "white", label: "设置填充为浅色", value: "#ffffff" },
  { id: "dark", label: "设置填充为深色", value: "#111827" },
] as const;

function isShapeToolId(tool: string): tool is ToolType {
  return SHAPE_TOOL_IDS.includes(tool as ToolType);
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

function isShapeElement(element: any): element is {
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
      isShapeToolId(element.type),
  );
}

function normalizeShapeToolbarStyle(style?: Partial<ShapeToolbarStyle> | null): ShapeToolbarStyle {
  return {
    strokeColor: style?.strokeColor ?? "#0f172a",
    backgroundColor: style?.backgroundColor ?? "transparent",
    strokeWidth: typeof style?.strokeWidth === "number" ? style.strokeWidth : 2,
  };
}

function swatchClass(selected: boolean) {
  return selected
    ? "border-slate-900 ring-2 ring-slate-300"
    : "border-slate-200 hover:border-slate-400";
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

function bumpSceneElement(element: Record<string, any>) {
  return {
    ...element,
    version: typeof element.version === "number" ? element.version + 1 : 1,
    versionNonce: Math.floor(Math.random() * 2_000_000_000),
    updated: Date.now(),
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
  const [enterpriseGateOpen, setEnterpriseGateOpen] = useState(false);
  const [activeOfficialGalleryCategory, setActiveOfficialGalleryCategory] =
    useState<OfficialGalleryCategoryId>("architecture-render");
  const [activeOfficialGallerySubtype, setActiveOfficialGallerySubtype] =
    useState<string>("默认");
  const [activeMyCreationSource, setActiveMyCreationSource] =
    useState<MyCreationSourceId>("ai-drawing");
  const [shapeToolbarStyle, setShapeToolbarStyle] = useState<ShapeToolbarStyle>(() =>
    normalizeShapeToolbarStyle(),
  );
  const [selectedShapeElement, setSelectedShapeElement] =
    useState<SelectedShapeToolbarState | null>(null);

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
          selectedElements.length === 1 && isShapeElement(selectedElements[0])
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
        const nextShapeFlyoutItemId =
          getArchitectureShapeFlyoutItemIdFromShape(nextSelectedShapeElement);
        if (nextShapeFlyoutItemId) {
          setActiveArchitectureShapeItemId((prev) =>
            prev === nextShapeFlyoutItemId ? prev : nextShapeFlyoutItemId,
          );
        } else if (tool === "selection" && !shapeFlyoutOpen) {
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
      excalidrawApi?.setActiveTool({ type: tool });
    },
    [excalidrawApi],
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
      const currentAppState = excalidrawApi.getAppState?.() ?? {};

      setShapeToolbarStyle(nextStyle);
      excalidrawApi.updateScene({
        appState: {
          ...currentAppState,
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
          });
        },
      );
      const currentAppState = excalidrawApi.getAppState?.() ?? {};

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
          ...currentAppState,
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
      setEnterpriseGateOpen(false);
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

  const activeOfficialSubtypeOptions =
    activeOfficialGalleryCategory === "architecture-render"
      ? [...ARCHITECTURE_RENDER_SUBTYPES]
      : ["默认"];

  const activeOfficialGalleryItems =
    activeOfficialGalleryCategory === "architecture-render"
      ? activeOfficialGallerySubtype === "别墅"
        ? OFFICIAL_GALLERY_SAMPLE_ITEMS.filter((item) => item.id.includes("villa"))
        : OFFICIAL_GALLERY_SAMPLE_ITEMS.filter((item) => item.id.includes("default"))
      : OFFICIAL_GALLERY_SAMPLE_ITEMS.filter((item) => item.id.includes("default"));

  const closeAddModal = useCallback(() => {
    setAddModalOpen(false);
    setEnterpriseGateOpen(false);
  }, []);

  const handleAddTabSelect = useCallback((tab: AddModalTab) => {
    if (tab === "enterprise-gallery") {
      setEnterpriseGateOpen(true);
      return;
    }

    setEnterpriseGateOpen(false);
    setActiveAddTab(tab);
  }, []);

  const handleSelectOfficialGalleryCategory = useCallback(
    (category: OfficialGalleryCategoryId) => {
      setActiveOfficialGalleryCategory(category);
      setActiveOfficialGallerySubtype("默认");
    },
    [],
  );

  const handleInsertOfficialGalleryImage = useCallback(
    async (item: (typeof OFFICIAL_GALLERY_SAMPLE_ITEMS)[number], index: number) => {
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
        console.warn("[canvas-tool-menu] failed to insert official gallery image", {
          error,
          itemId: item.id,
          index,
        });
      }
    },
    [closeAddModal, excalidrawApi],
  );

  const handleOpenEnterpriseUpgrade = useCallback(() => {
    if (typeof window !== "undefined") {
      window.open("/pricing", "_blank", "noopener,noreferrer");
    }
  }, []);

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
      ? "selection"
      : shapeFlyoutOpen || isShapeToolId(activeTool)
        ? "tool"
        : null;

    if (!toolbarMode) {
      return null;
    }

    const currentStyle = selectedShapeElement
      ? normalizeShapeToolbarStyle(selectedShapeElement)
      : shapeToolbarStyle;

    return (
      <div
        className="absolute left-1/2 top-4 z-30 w-[min(760px,calc(100vw-8rem))] -translate-x-1/2"
        data-mode={toolbarMode}
        data-testid="architecture-canvas-shape-toolbar"
      >
        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-slate-200 bg-white/96 px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.1)] backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">描边</span>
            <div className="flex items-center gap-2">
              {SHAPE_STROKE_OPTIONS.map((option) => {
                const selected = currentStyle.strokeColor === option.value;
                return (
                  <button
                    key={`stroke-${option.id}`}
                    type="button"
                    aria-label={option.label}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-all ${swatchClass(selected)}`}
                    onClick={() => handleShapeStrokeSelect(option.value)}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-slate-300"
                      style={{
                        backgroundColor:
                          option.value === "transparent" ? "#ffffff" : option.value,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">填充</span>
            <div className="flex items-center gap-2">
              {SHAPE_FILL_OPTIONS.map((option) => {
                const selected = currentStyle.backgroundColor === option.value;
                return (
                  <button
                    key={`fill-${option.id}`}
                    type="button"
                    aria-label={option.label}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-all ${swatchClass(selected)}`}
                    onClick={() => handleShapeFillSelect(option.value)}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-slate-300"
                      style={{
                        backgroundColor:
                          option.value === "transparent" ? "#ffffff" : option.value,
                      }}
                    />
                  </button>
                );
              })}
            </div>
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
            <div className="ml-auto flex items-center gap-3">
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
          className="relative w-full max-w-[1080px] rounded-[10px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.14)]"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-5 border-b border-slate-200 px-6 py-4">
            <button
              type="button"
              aria-label="返回"
              className="inline-flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
              onClick={closeAddModal}
            >
              <span className="text-base leading-none">←</span>
              <span>返回</span>
            </button>
            <div
              role="tablist"
              aria-label="添加素材分类"
              className="flex flex-1 items-center gap-5 overflow-x-auto text-sm"
            >
              {ADD_MODAL_TABS.map((tab) => {
                const selected = activeAddTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`add-material-panel-${tab.id}`}
                    id={`add-material-tab-${tab.id}`}
                    className={`relative shrink-0 border-b-2 pb-3 font-medium transition-colors ${
                      selected
                        ? "border-slate-900 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                    onClick={() => handleAddTabSelect(tab.id)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-6 py-5">
            {activeAddTab === "local-upload" ? (
              <div
                id="add-material-panel-local-upload"
                role="tabpanel"
                aria-labelledby="add-material-tab-local-upload"
                className="flex min-h-[440px] items-center justify-center"
              >
                <button
                  type="button"
                  aria-label="上传图片"
                  className="inline-flex h-16 min-w-[180px] items-center justify-center rounded-[10px] border border-slate-200 bg-slate-50 px-8 text-base font-medium text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    onUploadReference?.();
                    closeAddModal();
                  }}
                  disabled={typeof onUploadReference !== "function"}
                >
                  上传图片
                </button>
              </div>
            ) : null}

            {activeAddTab === "official-gallery" ? (
              <div
                id="add-material-panel-official-gallery"
                role="tabpanel"
                aria-labelledby="add-material-tab-official-gallery"
                className="grid gap-4"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="向左滚动官方图库分类"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    ‹
                  </button>
                  <div className="flex flex-1 gap-2 overflow-x-auto py-1">
                    {OFFICIAL_GALLERY_MAJOR_CATEGORIES.map((category) => {
                      const selected = activeOfficialGalleryCategory === category.id;
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
                          onClick={() =>
                            handleSelectOfficialGalleryCategory(category.id)
                          }
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
                  >
                    ›
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeOfficialSubtypeOptions.map((subtype) => {
                    const selected = activeOfficialGallerySubtype === subtype;
                    return (
                      <button
                        key={subtype}
                        type="button"
                        aria-pressed={selected}
                        className={`rounded-[8px] border px-3 py-2 text-sm font-medium transition-colors ${
                          selected
                            ? "border-slate-900 bg-slate-100 text-slate-900"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                        onClick={() => setActiveOfficialGallerySubtype(subtype)}
                      >
                        {subtype}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
                  {activeOfficialGalleryItems.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`插入官方图库图片 ${
                        OFFICIAL_GALLERY_MAJOR_CATEGORIES.find(
                          (category) => category.id === activeOfficialGalleryCategory,
                        )?.label ?? "建筑效果图"
                      } ${activeOfficialGallerySubtype} ${index + 1}`}
                      className="group overflow-hidden rounded-[10px] border border-slate-200 bg-white text-left transition-colors hover:border-slate-300"
                      onClick={() => handleInsertOfficialGalleryImage(item, index)}
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                        <img
                          src={item.url}
                          alt={item.label}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {activeAddTab === "my-creations" ? (
              <div
                id="add-material-panel-my-creations"
                role="tabpanel"
                aria-labelledby="add-material-tab-my-creations"
                className="grid gap-4"
              >
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
                <div
                  className="flex min-h-[360px] flex-col items-center justify-center rounded-[10px] border border-dashed border-slate-300 bg-slate-50 px-8 text-center"
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl text-slate-300">
                    □
                  </div>
                  <div className="text-sm font-medium text-slate-700">数据为空</div>
                </div>
              </div>
            ) : null}

            {activeAddTab === "enterprise-gallery" ? (
              <div
                id="add-material-panel-enterprise-gallery"
                role="tabpanel"
                aria-labelledby="add-material-tab-enterprise-gallery"
                className="hidden"
              >
                企业图库
              </div>
            ) : null}
          </div>

          {enterpriseGateOpen ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/18 px-6">
              <div className="w-full max-w-[440px] rounded-[10px] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
                <div className="text-lg font-semibold text-slate-900">
                  开通【企业会员】解锁企业图库
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  尊敬的用户，企业图库为企业会员专享功能，支持企业成员上传、管理和使用企业内部专属的在线图片素材
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-[8px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                    onClick={() => setEnterpriseGateOpen(false)}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-[8px] bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                    onClick={handleOpenEnterpriseUpgrade}
                  >
                    去开通
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>,
      document.body,
    );
  };

  const renderClassicToolbar = () => (
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
