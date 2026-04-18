// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const { insertImageOnCanvasMock } = vi.hoisted(() => ({
  insertImageOnCanvasMock: vi.fn(() => Promise.resolve()),
}));

vi.mock("../src/lib/canvas-image-generator", () => ({
  createImageGeneratorElement: vi.fn(),
  getImageGeneratorData: vi.fn(),
  isImageGeneratorElement: vi.fn(() => false),
}));

vi.mock("../src/lib/canvas-video-generator", () => ({
  createVideoGeneratorElement: vi.fn(),
  getVideoGeneratorData: vi.fn(),
  isVideoGeneratorElement: vi.fn(() => false),
}));

vi.mock("../src/lib/canvas-elements", () => ({
  insertImageOnCanvas: insertImageOnCanvasMock,
  isVideoUrl: vi.fn(() => false),
}));

vi.mock("../src/components/canvas/image-generator-panel", () => ({
  ImageGeneratorPanel: () => null,
}));

vi.mock("../src/components/canvas/video-generator-panel", () => ({
  VideoGeneratorPanel: () => null,
}));

vi.mock("../src/components/canvas/video-player-panel", () => ({
  VideoPlayerPanel: () => null,
}));

import { CanvasToolMenu } from "../src/components/canvas-tool-menu";

afterEach(() => {
  cleanup();
  insertImageOnCanvasMock.mockClear();
});

function createMockExcalidrawApi() {
  return {
    addFiles: vi.fn(),
    getSceneElements: vi.fn(() => []),
    getAppState: vi.fn(() => ({
      activeTool: { type: "selection" },
      scrollX: 0,
      scrollY: 0,
      zoom: { value: 1 },
      selectedElementIds: {},
      currentItemStrokeColor: "#0f172a",
      currentItemBackgroundColor: "transparent",
      currentItemStrokeWidth: 2,
      currentItemRoughness: 1,
      currentItemStrokeStyle: "dashed",
      currentItemFillStyle: "hachure",
      currentItemFontSize: 20,
      currentItemFontFamily: 1,
    })),
    onChange: vi.fn(() => () => {}),
    setActiveTool: vi.fn(),
    updateScene: vi.fn(),
  };
}

describe("CanvasToolMenu", () => {
  it("renders the compact architecture rail and hides the legacy bottom-toolbar actions", () => {
    const excalidrawApi = createMockExcalidrawApi();

    render(
      <CanvasToolMenu
        {...({
          accessToken: "token-canvas",
          excalidrawApi,
          immersiveArchitecture: true,
        } as const)}
      />,
    );

    expect(screen.getByRole("button", { name: "选择" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "添加" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "形状" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "涂鸦" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "文字" })).toBeTruthy();

    expect(screen.queryByLabelText("拖拽画布 (H)")).toBeNull();
    expect(screen.queryByLabelText("矩形 (R)")).toBeNull();
    expect(screen.queryByLabelText("椭圆 (O)")).toBeNull();
    expect(screen.queryByLabelText("箭头 (A)")).toBeNull();
    expect(screen.queryByLabelText("直线 (L)")).toBeNull();
    expect(screen.queryByLabelText("AI 生成图片")).toBeNull();
    expect(screen.queryByLabelText("AI 生成视频")).toBeNull();
  });

  it("matches the live local-upload add modal shell with a single centered upload action", async () => {
    const user = userEvent.setup();
    const excalidrawApi = createMockExcalidrawApi();
    const onUploadReference = vi.fn();

    render(
      <CanvasToolMenu
        {...({
          accessToken: "token-canvas",
          excalidrawApi,
          immersiveArchitecture: true,
          onUploadReference,
        } as const)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "添加" }));

    const dialog = screen.getByRole("dialog", { name: "添加素材" });
    expect(dialog).toBeTruthy();
    expect(dialog).toHaveAttribute("data-layout", "fixed-responsive");
    expect(screen.getByTestId("architecture-add-dialog-body")).toHaveAttribute(
      "data-scroll-region",
      "true",
    );
    expect(screen.getByRole("tab", { name: "本地上传" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "官方图库" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "企业图库" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "我的创作" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "上传图片" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "上传参考图" })).toBeNull();
    expect(screen.queryByRole("button", { name: "插入参考板" })).toBeNull();
    expect(screen.queryByRole("button", { name: "铺开建筑板块" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "上传图片" }));
    expect(onUploadReference).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "添加素材" })).toBeNull();
  });

  it("renders the live-style official gallery filters and inserts a selected gallery image onto the canvas", async () => {
    const user = userEvent.setup();
    const excalidrawApi = createMockExcalidrawApi();

    render(
      <CanvasToolMenu
        {...({
          accessToken: "token-canvas",
          excalidrawApi,
          immersiveArchitecture: true,
        } as const)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("tab", { name: "官方图库" }));

    expect(screen.getByRole("button", { name: "建筑效果图" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "室内效果图" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "默认" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "别墅" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "插入官方图库图片 建筑效果图 默认 1" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "插入官方图库图片 建筑效果图 默认 1" }),
    );

    expect(insertImageOnCanvasMock).toHaveBeenCalledWith(
      excalidrawApi,
      expect.objectContaining({
        type: "image",
        mimeType: "image/png",
      }),
    );
    expect(screen.queryByRole("dialog", { name: "添加素材" })).toBeNull();
  });

  it("opens the enterprise entitlement dialog instead of rendering a normal enterprise gallery list", async () => {
    const user = userEvent.setup();
    const excalidrawApi = createMockExcalidrawApi();

    render(
      <CanvasToolMenu
        {...({
          accessToken: "token-canvas",
          excalidrawApi,
          immersiveArchitecture: true,
        } as const)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("tab", { name: "企业图库" }));

    expect(
      screen.getByText("开通【企业会员】解锁企业图库"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "去开通" })).toBeInTheDocument();
  });

  it("renders the my-creations source strip with local sample assets and reinserts a selected asset onto the canvas", async () => {
    const user = userEvent.setup();
    const excalidrawApi = createMockExcalidrawApi();

    render(
      <CanvasToolMenu
        {...({
          accessToken: "token-canvas",
          excalidrawApi,
          immersiveArchitecture: true,
        } as const)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("tab", { name: "我的创作" }));

    expect(screen.getByRole("button", { name: "AI创作绘图" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Banana智能体" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI模型渲染" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI总图彩平填色" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "手绘创作" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "局部重绘" })).toBeInTheDocument();
    expect(screen.queryByText("数据为空")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "插入我的创作图片 AI创作绘图 1" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Banana智能体" }));
    expect(
      screen.getByRole("button", { name: "插入我的创作图片 Banana智能体 1" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "插入我的创作图片 Banana智能体 1" }),
    );

    expect(insertImageOnCanvasMock).toHaveBeenCalledWith(
      excalidrawApi,
      expect.objectContaining({
        type: "image",
        mimeType: "image/png",
        title: "Banana智能体 1",
      }),
    );
    expect(screen.queryByRole("dialog", { name: "添加素材" })).toBeNull();
  });

  it("renders the compact shape flyout and maps the fifth button to 连续多段线 without sharing 直线 active state", async () => {
    const user = userEvent.setup();
    const excalidrawApi = createMockExcalidrawApi();

    render(
      <CanvasToolMenu
        {...({
          accessToken: "token-canvas",
          excalidrawApi,
          immersiveArchitecture: true,
        } as const)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "形状" }));

    const shapeFlyout = screen.getByTestId("architecture-canvas-tool-flyout-shape");
    expect(shapeFlyout).toBeTruthy();
    expect(screen.getByTestId("architecture-canvas-shape-toolbar")).toHaveAttribute(
      "data-mode",
      "tool",
    );
    expect(screen.getByRole("slider", { name: "形状线宽" })).toBeTruthy();

    const shapeButtons = within(shapeFlyout).getAllByRole("button");
    expect(shapeButtons.map((button) => button.getAttribute("data-shape-icon"))).toEqual([
      "micro-icon-frame-square-box",
      "micro-icon-frame-ellipse",
      "micro-icon-leafer-12",
      "micro-icon-frame-line",
      "micro-icon-lasso",
    ]);
    expect(within(shapeFlyout).queryByText("基础块面")).toBeNull();
    expect(within(shapeFlyout).queryByText("流程决策")).toBeNull();
    expect(within(shapeFlyout).queryByRole("button", { name: "菱形" })).toBeNull();

    const straightLineButton = within(shapeFlyout).getByRole("button", { name: "直线" });
    const polylineButton = within(shapeFlyout).getByRole("button", {
      name: "连续多段线",
    });

    await user.click(polylineButton);

    expect(excalidrawApi.setActiveTool).toHaveBeenLastCalledWith({ type: "line" });
    expect(polylineButton.className).toContain("bg-slate-100");
    expect(straightLineButton.className).toContain("bg-white/90");

    await user.click(within(shapeFlyout).getByRole("button", { name: "箭头" }));
    expect(excalidrawApi.setActiveTool).toHaveBeenLastCalledWith({ type: "arrow" });

    await user.click(straightLineButton);
    expect(excalidrawApi.setActiveTool).toHaveBeenLastCalledWith({ type: "line" });
    expect(straightLineButton.className).toContain("bg-slate-100");
    expect(polylineButton.className).toContain("bg-white/90");
  });

  it("switches the shape toolbar into selection mode with real color pickers and follows the selected shape", async () => {
    const user = userEvent.setup();
    const excalidrawApi = createMockExcalidrawApi();

    render(
      <CanvasToolMenu
        {...({
          accessToken: "token-canvas",
          excalidrawApi,
          immersiveArchitecture: true,
        } as const)}
      />,
    );

    const onChange = excalidrawApi.onChange.mock.calls[0]?.[0];
    expect(onChange).toBeTypeOf("function");

    act(() => {
      onChange?.(
        [
          {
            id: "shape-1",
            type: "rectangle",
            x: 40,
            y: 24,
            width: 180,
            height: 120,
            isDeleted: false,
            strokeColor: "#0f172a",
            backgroundColor: "transparent",
            strokeWidth: 2,
          },
        ],
        {
          activeTool: { type: "selection" },
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {
            "shape-1": true,
          },
          currentItemStrokeColor: "#0f172a",
          currentItemBackgroundColor: "transparent",
          currentItemStrokeWidth: 2,
        },
      );
    });

    expect(screen.getByTestId("architecture-canvas-shape-toolbar")).toHaveAttribute(
      "data-mode",
      "selection",
    );
    expect(screen.getByTestId("architecture-canvas-shape-toolbar")).toHaveAttribute(
      "data-anchor",
      "canvas-selection",
    );
    expect(screen.getByLabelText("描边颜色")).toHaveAttribute("type", "color");
    expect(screen.getByLabelText("填充颜色")).toHaveAttribute("type", "color");
    expect(screen.getByRole("button", { name: "清除填充" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "形状宽度" })).toHaveValue(180);
    expect(screen.getByRole("spinbutton", { name: "形状高度" })).toHaveValue(120);

    const anchoredToolbar = screen.getByTestId("architecture-canvas-shape-toolbar");
    const firstLeft = anchoredToolbar.style.left;
    const firstTop = anchoredToolbar.style.top;

    fireEvent.change(screen.getByLabelText("填充颜色"), {
      target: { value: "#111827" },
    });

    expect(excalidrawApi.updateScene).toHaveBeenCalled();

    act(() => {
      onChange?.(
        [
          {
            id: "shape-1",
            type: "rectangle",
            x: 120,
            y: 80,
            width: 180,
            height: 120,
            isDeleted: false,
            strokeColor: "#0f172a",
            backgroundColor: "#111827",
            strokeWidth: 2,
          },
        ],
        {
          activeTool: { type: "selection" },
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {
            "shape-1": true,
          },
          currentItemStrokeColor: "#0f172a",
          currentItemBackgroundColor: "#111827",
          currentItemStrokeWidth: 2,
        },
      );
    });

    expect(anchoredToolbar.style.left).not.toBe(firstLeft);
    expect(anchoredToolbar.style.top).not.toBe(firstTop);
  });

  it("applies clean non-hand-drawn defaults when activating architecture shape tools", async () => {
    const user = userEvent.setup();
    const excalidrawApi = createMockExcalidrawApi();

    render(
      <CanvasToolMenu
        {...({
          accessToken: "token-canvas",
          excalidrawApi,
          immersiveArchitecture: true,
        } as const)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "形状" }));
    await user.click(screen.getByRole("button", { name: "矩形" }));

    expect(excalidrawApi.setActiveTool).toHaveBeenLastCalledWith({ type: "rectangle" });
    expect(excalidrawApi.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({
          currentItemRoughness: 0,
          currentItemStrokeStyle: "solid",
          currentItemFillStyle: "solid",
        }),
      }),
    );
  });

  it("renders a compact selected-shape toolbar without the legacy right-side spacer", async () => {
    const excalidrawApi = createMockExcalidrawApi();

    render(
      <CanvasToolMenu
        {...({
          accessToken: "token-canvas",
          excalidrawApi,
          immersiveArchitecture: true,
        } as const)}
      />,
    );

    const onChange = excalidrawApi.onChange.mock.calls[0]?.[0];

    act(() => {
      onChange?.(
        [
          {
            id: "shape-compact",
            type: "rectangle",
            x: 64,
            y: 48,
            width: 180,
            height: 120,
            isDeleted: false,
            strokeColor: "#0f172a",
            backgroundColor: "transparent",
            strokeWidth: 2,
          },
        ],
        {
          activeTool: { type: "selection" },
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {
            "shape-compact": true,
          },
          currentItemStrokeColor: "#0f172a",
          currentItemBackgroundColor: "transparent",
          currentItemStrokeWidth: 2,
        },
      );
    });

    const toolbar = screen.getByTestId("architecture-canvas-shape-toolbar");
    expect(toolbar.querySelector(".ml-auto")).toBeNull();
    expect(toolbar.className).not.toContain("w-[min(760px,calc(100vw-4rem))]");
  });

  it("shows an anchored doodle selection toolbar when an existing freedraw element is selected", async () => {
    const excalidrawApi = createMockExcalidrawApi();

    render(
      <CanvasToolMenu
        {...({
          accessToken: "token-canvas",
          excalidrawApi,
          immersiveArchitecture: true,
        } as const)}
      />,
    );

    const onChange = excalidrawApi.onChange.mock.calls[0]?.[0];

    act(() => {
      onChange?.(
        [
          {
            id: "freedraw-1",
            type: "freedraw",
            x: 88,
            y: 64,
            width: 240,
            height: 120,
            isDeleted: false,
            strokeColor: "#334155",
            strokeWidth: 6,
          },
        ],
        {
          activeTool: { type: "selection" },
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {
            "freedraw-1": true,
          },
          currentItemStrokeColor: "#334155",
          currentItemStrokeWidth: 6,
        },
      );
    });

    const toolbar = screen.getByTestId("architecture-canvas-shape-toolbar");
    expect(toolbar).toHaveAttribute("data-mode", "freedraw-selection");
    expect(toolbar).toHaveAttribute("data-anchor", "canvas-selection");
    expect(screen.getByLabelText("涂鸦颜色")).toHaveAttribute("type", "color");
    expect(screen.getByRole("slider", { name: "涂鸦粗细" })).toHaveValue("6");
    expect(screen.queryByLabelText("填充颜色")).not.toBeInTheDocument();
  });

  it("shows an anchored text selection toolbar when an existing text element is selected", async () => {
    const excalidrawApi = createMockExcalidrawApi();

    render(
      <CanvasToolMenu
        {...({
          accessToken: "token-canvas",
          excalidrawApi,
          immersiveArchitecture: true,
        } as const)}
      />,
    );

    const onChange = excalidrawApi.onChange.mock.calls[0]?.[0];

    act(() => {
      onChange?.(
        [
          {
            id: "text-1",
            type: "text",
            x: 120,
            y: 96,
            width: 180,
            height: 56,
            isDeleted: false,
            strokeColor: "#dc2626",
            fontSize: 34,
            text: "建筑分析",
          },
        ],
        {
          activeTool: { type: "selection" },
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {
            "text-1": true,
          },
          currentItemStrokeColor: "#dc2626",
          currentItemFontSize: 34,
        },
      );
    });

    const toolbar = screen.getByTestId("architecture-canvas-shape-toolbar");
    expect(toolbar).toHaveAttribute("data-mode", "text-selection");
    expect(toolbar).toHaveAttribute("data-anchor", "canvas-selection");
    expect(screen.getByLabelText("文字颜色")).toHaveAttribute("type", "color");
    expect(screen.getByRole("spinbutton", { name: "文字字号" })).toHaveValue(34);
  });

  it("shows a doodle toolbar with color and width controls", async () => {
    const user = userEvent.setup();
    const excalidrawApi = createMockExcalidrawApi();

    render(
      <CanvasToolMenu
        {...({
          accessToken: "token-canvas",
          excalidrawApi,
          immersiveArchitecture: true,
        } as const)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "涂鸦" }));

    const toolbar = screen.getByTestId("architecture-canvas-shape-toolbar");
    expect(toolbar).toHaveAttribute("data-mode", "freedraw");
    expect(screen.getByLabelText("涂鸦颜色")).toHaveAttribute("type", "color");
    expect(screen.getByRole("slider", { name: "涂鸦粗细" })).toHaveValue("2");

    fireEvent.change(screen.getByLabelText("涂鸦颜色"), {
      target: { value: "#475569" },
    });
    fireEvent.change(screen.getByRole("slider", { name: "涂鸦粗细" }), {
      target: { value: "6" },
    });

    expect(excalidrawApi.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({
          currentItemStrokeColor: "#475569",
          currentItemStrokeWidth: 6,
        }),
      }),
    );
  });

  it("shows a text toolbar with default red text and font size controls", async () => {
    const user = userEvent.setup();
    const excalidrawApi = createMockExcalidrawApi();

    render(
      <CanvasToolMenu
        {...({
          accessToken: "token-canvas",
          excalidrawApi,
          immersiveArchitecture: true,
        } as const)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "文字" }));

    const toolbar = screen.getByTestId("architecture-canvas-shape-toolbar");
    expect(toolbar).toHaveAttribute("data-mode", "text");
    expect(screen.getByLabelText("文字颜色")).toHaveAttribute("type", "color");
    expect(screen.getByRole("spinbutton", { name: "文字字号" })).toHaveValue(28);

    expect(excalidrawApi.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({
          currentItemStrokeColor: "#ef4444",
          currentItemFontSize: 28,
        }),
      }),
    );

    fireEvent.change(screen.getByLabelText("文字颜色"), {
      target: { value: "#dc2626" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "文字字号" }), {
      target: { value: "36" },
    });

    expect(excalidrawApi.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({
          currentItemStrokeColor: "#dc2626",
          currentItemFontSize: 36,
        }),
      }),
    );
  });

  it("closes the add modal when pressing Escape", async () => {
    const user = userEvent.setup();
    const excalidrawApi = createMockExcalidrawApi();
    const onUploadReference = vi.fn();

    render(
      <CanvasToolMenu
        {...({
          accessToken: "token-canvas",
          excalidrawApi,
          immersiveArchitecture: true,
          onUploadReference,
        } as const)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "添加" }));
    expect(screen.getByRole("dialog", { name: "添加素材" })).toBeTruthy();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "添加素材" })).toBeNull();
  });
});
