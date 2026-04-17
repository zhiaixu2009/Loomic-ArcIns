type CanvasLocalizableElement = {
  customData?: {
    label?: unknown;
    title?: unknown;
    type?: unknown;
  } | null;
  text?: unknown;
  type?: string | null;
};

const CANVAS_ELEMENT_TYPE_LABELS: Record<string, string> = {
  arrow: "箭头",
  diamond: "菱形",
  ellipse: "椭圆",
  embeddable: "嵌入",
  frame: "框架",
  freedraw: "手绘",
  iframe: "嵌入",
  image: "图像",
  line: "直线",
  rectangle: "矩形",
  selection: "选区",
  text: "文本",
};

const LEGACY_UNTITLED_PROJECT_NAMES = new Set(["untitled"]);
const LEGACY_NEW_CHAT_TITLES = new Set(["new chat"]);

function toShortLabel(value: unknown, maxLength = 20) {
  if (typeof value !== "string") {
    return "";
  }

  return value.slice(0, maxLength).trim();
}

function normalizeLegacyValue(value?: string | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export const UNTITLED_PROJECT_NAME = "未命名项目";
export const NEW_CHAT_SESSION_TITLE = "新对话";
export const NO_CANVAS_ID_MESSAGE = "未指定画布 ID。";
export const LOAD_CANVAS_FAILED_MESSAGE = "载入画布失败，请刷新重试。";
export const MISSING_PREVIEW_LABEL = "暂无";
export const AGENT_TRIGGER_LABEL = "智能体";
export const AGENT_MODEL_MENU_LABEL = "智能体模型";
export const AGENT_AUTO_WORKSPACE_LABEL = "自动（跟随工作区默认）";
export const IMAGE_MODEL_TAB_LABEL = "图片";
export const VIDEO_MODEL_TAB_LABEL = "视频";
export const IMAGE_MODEL_PANEL_LABEL = "图片模型";
export const VIDEO_MODEL_PANEL_LABEL = "视频模型";
export const AUTO_MODEL_MODE_LABEL = "自动";
export const MANUAL_MODEL_MODE_LABEL = "手动";

export const ARCHITECTURE_EXPORT_COPY = {
  manifest: {
    failure: "下载清单失败，请重试。",
    pending: "正在准备导出清单…",
    success: "清单已下载。",
    unavailable: "当前无法导出清单。",
  },
  review: {
    failure: "下载评审包失败，请重试。",
    pending: "正在准备评审包…",
    success: "评审包已下载。",
    unavailable: "当前无法导出评审包，请稍后再试。",
  },
  share: {
    failure: "快照分享失败，请重试。",
    pending: "正在分享快照…",
    success: "快照已分享。",
    unavailable: "当前无法分享快照，请稍后重试。",
  },
} as const;

export function normalizeProjectDisplayName(name?: string | null) {
  const normalized = normalizeLegacyValue(name);
  if (!normalized) {
    return UNTITLED_PROJECT_NAME;
  }

  if (LEGACY_UNTITLED_PROJECT_NAMES.has(normalized.toLowerCase())) {
    return UNTITLED_PROJECT_NAME;
  }

  return normalized;
}

export function normalizeChatSessionTitle(title?: string | null) {
  const normalized = normalizeLegacyValue(title);
  if (!normalized) {
    return NEW_CHAT_SESSION_TITLE;
  }

  if (LEGACY_NEW_CHAT_TITLES.has(normalized.toLowerCase())) {
    return NEW_CHAT_SESSION_TITLE;
  }

  return normalized;
}

export function getModelPreferencePanelLabel(kind: "image" | "video") {
  return kind === "image" ? IMAGE_MODEL_PANEL_LABEL : VIDEO_MODEL_PANEL_LABEL;
}

export function getModelPreferenceModeDescription(
  kind: "image" | "video",
  mode: "auto" | "manual",
) {
  const taskLabel = kind === "image" ? IMAGE_MODEL_TAB_LABEL : VIDEO_MODEL_TAB_LABEL;

  if (mode === "auto") {
    return `智能体会为每次${taskLabel}任务自动选择最合适的模型`;
  }

  return `智能体会优先从你选中的${taskLabel}模型中执行任务`;
}

export function getCanvasElementTypeLabel(type?: string | null) {
  if (!type) {
    return "元素";
  }

  return CANVAS_ELEMENT_TYPE_LABELS[type] ?? "元素";
}

export function getCanvasElementLabel(element: CanvasLocalizableElement) {
  if (element.customData?.type === "image-generator") {
    return (
      toShortLabel(element.customData.title) ||
      toShortLabel(element.customData.label) ||
      "图像生成器"
    );
  }

  if (element.type === "text") {
    return toShortLabel(element.text) || getCanvasElementTypeLabel("text");
  }

  if (element.type === "image") {
    return (
      toShortLabel(element.customData?.title) ||
      toShortLabel(element.customData?.label) ||
      getCanvasElementTypeLabel("image")
    );
  }

  return getCanvasElementTypeLabel(element.type);
}

export function getCanvasImageFallbackName(index: number) {
  return `图像 ${index}`;
}
