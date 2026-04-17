import { describe, expect, it } from "vitest";

import {
  ARCHITECTURE_EXPORT_COPY,
  LOAD_CANVAS_FAILED_MESSAGE,
  MISSING_PREVIEW_LABEL,
  NEW_CHAT_SESSION_TITLE,
  NO_CANVAS_ID_MESSAGE,
  UNTITLED_PROJECT_NAME,
  getCanvasElementLabel,
  getCanvasElementTypeLabel,
  getCanvasImageFallbackName,
  getModelPreferenceModeDescription,
  getModelPreferencePanelLabel,
  normalizeChatSessionTitle,
  normalizeProjectDisplayName,
} from "../src/lib/canvas-localization";

describe("canvas localization helpers", () => {
  it("provides Chinese fallbacks for shared canvas states", () => {
    expect(UNTITLED_PROJECT_NAME).toBe("未命名项目");
    expect(NEW_CHAT_SESSION_TITLE).toBe("新对话");
    expect(NO_CANVAS_ID_MESSAGE).toBe("未指定画布 ID。");
    expect(LOAD_CANVAS_FAILED_MESSAGE).toBe("载入画布失败，请刷新重试。");
    expect(MISSING_PREVIEW_LABEL).toBe("暂无");
  });

  it("maps element types to Chinese labels", () => {
    expect(getCanvasElementTypeLabel("text")).toBe("文本");
    expect(getCanvasElementTypeLabel("image")).toBe("图像");
    expect(getCanvasElementTypeLabel("rectangle")).toBe("矩形");
    expect(getCanvasElementTypeLabel("ellipse")).toBe("椭圆");
    expect(getCanvasElementTypeLabel("diamond")).toBe("菱形");
    expect(getCanvasElementTypeLabel("line")).toBe("直线");
    expect(getCanvasElementTypeLabel("arrow")).toBe("箭头");
    expect(getCanvasElementTypeLabel("unknown")).toBe("元素");
  });

  it("builds Chinese labels for bottom-bar and layers-panel fallbacks", () => {
    expect(
      getCanvasElementLabel({
        type: "text",
        text: "入口广场动线分析",
      }),
    ).toBe("入口广场动线分析");
    expect(
      getCanvasElementLabel({
        type: "image",
        customData: {},
      }),
    ).toBe("图像");
    expect(
      getCanvasElementLabel({
        type: "rectangle",
      }),
    ).toBe("矩形");
    expect(
      getCanvasElementLabel({
        type: "image",
        customData: {
          type: "image-generator",
          title: "体量生成器",
        },
      }),
    ).toBe("体量生成器");
  });

  it("provides Chinese fallback names for image tiles and export feedback", () => {
    expect(getCanvasImageFallbackName(3)).toBe("图像 3");
    expect(ARCHITECTURE_EXPORT_COPY.share.unavailable).toBe(
      "当前无法分享快照，请稍后重试。",
    );
    expect(ARCHITECTURE_EXPORT_COPY.share.pending).toBe("正在分享快照…");
    expect(ARCHITECTURE_EXPORT_COPY.share.success).toBe("快照已分享。");
    expect(ARCHITECTURE_EXPORT_COPY.share.failure).toBe("快照分享失败，请重试。");
    expect(ARCHITECTURE_EXPORT_COPY.review.pending).toBe("正在准备评审包…");
    expect(ARCHITECTURE_EXPORT_COPY.manifest.success).toBe("清单已下载。");
  });

  it("normalizes legacy English defaults for projects and chat sessions", () => {
    expect(normalizeProjectDisplayName("Untitled")).toBe("未命名项目");
    expect(normalizeProjectDisplayName("  城市更新汇报  ")).toBe("城市更新汇报");
    expect(normalizeProjectDisplayName("")).toBe("未命名项目");

    expect(normalizeChatSessionTitle("New Chat")).toBe("新对话");
    expect(normalizeChatSessionTitle("  方案推敲  ")).toBe("方案推敲");
    expect(normalizeChatSessionTitle("")).toBe("新对话");
  });

  it("provides Chinese model preference labels and descriptions", () => {
    expect(getModelPreferencePanelLabel("image")).toBe("图片模型");
    expect(getModelPreferencePanelLabel("video")).toBe("视频模型");
    expect(getModelPreferenceModeDescription("image", "auto")).toBe(
      "智能体会为每次图片任务自动选择最合适的模型",
    );
    expect(getModelPreferenceModeDescription("video", "manual")).toBe(
      "智能体会优先从你选中的视频模型中执行任务",
    );
  });
});
