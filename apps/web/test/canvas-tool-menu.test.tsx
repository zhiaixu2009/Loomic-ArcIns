// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
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

    expect(screen.getByRole("dialog", { name: "添加素材" })).toBeTruthy();
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

  it("renders the my-creations source strip and empty state", async () => {
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
    expect(screen.getByText("数据为空")).toBeInTheDocument();
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

  it("switches the top shape toolbar into selection mode for rectangles and edits fill via Excalidraw", async () => {
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
    expect(screen.getByRole("spinbutton", { name: "形状宽度" })).toHaveValue(180);
    expect(screen.getByRole("spinbutton", { name: "形状高度" })).toHaveValue(120);

    await user.click(screen.getByRole("button", { name: "设置填充为深色" }));

    expect(excalidrawApi.updateScene).toHaveBeenCalled();
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
