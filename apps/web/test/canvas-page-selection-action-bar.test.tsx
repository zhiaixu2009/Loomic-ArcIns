// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

const {
  fetchCanvasMock,
  fetchImageBlobWithFallbackMock,
  fetchProjectMock,
  replaceMock,
  setActiveToolMock,
} = vi.hoisted(() => ({
  fetchCanvasMock: vi.fn(),
  fetchImageBlobWithFallbackMock: vi.fn(),
  fetchProjectMock: vi.fn(),
  replaceMock: vi.fn(),
  setActiveToolMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
  }),
  useSearchParams: () =>
    new URLSearchParams("id=canvas-1&studio=architecture"),
}));

vi.mock("../src/lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    session: { access_token: "token-canvas" },
    loading: false,
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../src/hooks/use-canvas-collaboration", () => ({
  useCanvasCollaboration: () => ({
    clearPendingRemoteMutation: vi.fn(),
    pendingRemoteMutation: null,
    remoteCursors: [],
    remoteSelections: [],
    reportCursor: vi.fn(),
    reportSelection: vi.fn(),
  }),
}));

vi.mock("../src/hooks/use-websocket", () => ({
  useWebSocket: () => ({
    connected: true,
    onEvent: vi.fn(() => () => {}),
  }),
}));

vi.mock("../src/hooks/use-job-fallback-polling", () => ({
  useJobFallbackPolling: () => ({
    checkForTimedOutJobs: vi.fn(),
  }),
}));

vi.mock("../src/lib/server-api", () => ({
  ApiAuthError: class ApiAuthError extends Error {},
  fetchCanvas: fetchCanvasMock,
  fetchProject: fetchProjectMock,
  uploadFile: vi.fn(),
}));

vi.mock("../src/lib/canvas-elements", () => ({
  fetchImageBlobWithFallback: fetchImageBlobWithFallbackMock,
  insertImageOnCanvas: vi.fn(),
  insertVideoOnCanvas: vi.fn(),
}));

vi.mock("../src/lib/studio-routes", () => ({
  buildCanvasUrl: vi.fn(() => "/canvas?id=canvas-1&studio=architecture"),
  isArchitectureStudio: vi.fn((studio: string | null) => studio === "architecture"),
}));

vi.mock("../src/lib/architecture-canvas", () => {
  const defaultContext = {
    studio: "architecture",
    boards: [],
    selectedElementIds: [],
    objectTypesInSelection: [],
    strategyOptions: [],
  };

  return {
    areArchitectureContextsEqual: vi.fn((left, right) => JSON.stringify(left) === JSON.stringify(right)),
    createEmptyArchitectureContext: vi.fn(() => defaultContext),
    deriveArchitectureContextFromScene: vi.fn(() => defaultContext),
    insertArchitectureBoardIntoScene: vi.fn(() => ({
      boardId: "board-1",
      elements: [],
      inserted: true,
      insertedRootElementId: "board-root-1",
    })),
    insertArchitectureBoardStackIntoScene: vi.fn(() => ({
      elements: [],
      insertedKinds: [],
      insertedRootElementId: "board-root-1",
    })),
  };
});

vi.mock("../src/lib/canvas-localization", () => ({
  LOAD_CANVAS_FAILED_MESSAGE: "load canvas failed",
  NO_CANVAS_ID_MESSAGE: "missing canvas id",
  UNTITLED_PROJECT_NAME: "untitled project",
  getCanvasImageFallbackName: vi.fn((index: number) => `reference image ${index}`),
  normalizeProjectDisplayName: vi.fn((name: string) => name || "untitled project"),
}));

vi.mock("../src/components/loading-screen", () => ({
  LoadingScreen: () => <div>Loading</div>,
}));

vi.mock("../src/components/canvas-editor", () => ({
  CanvasEditor: (props: any) => {
    React.useEffect(() => {
      props.onApiReady?.({
        getAppState: () => ({
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
        }),
        setActiveTool: setActiveToolMock,
      });
    }, [props.onApiReady]);

    const singleImageSelection = {
      id: "image-1",
      type: "image",
      x: 160,
      y: 120,
      width: 240,
      height: 160,
      storageUrl:
        "http://host.docker.internal:54321/storage/v1/object/public/assets/reference.png",
    };

    return (
      <div data-testid="canvas-editor">
        <button
          type="button"
          data-testid="mock-select-canvas-image"
          onClick={() => {
            props.onSelectionIntent?.("left");
            props.onViewportChange?.({
              scrollX: 0,
              scrollY: 0,
              zoom: 1,
            });
            props.onSelectionChange?.([singleImageSelection]);
          }}
        >
          select canvas image
        </button>
        <button
          type="button"
          data-testid="mock-select-canvas-image-via-context-menu"
          onClick={() => {
            props.onSelectionIntent?.("right");
            props.onViewportChange?.({
              scrollX: 0,
              scrollY: 0,
              zoom: 1,
            });
            props.onSelectionChange?.([singleImageSelection]);
            props.onContextMenuRequest?.({
              x: 160,
              y: 120,
              clientX: 160,
              clientY: 120,
              selectedElements: [singleImageSelection],
            });
          }}
        >
          select image via context menu
        </button>
        <button
          type="button"
          data-testid="mock-select-multiple-canvas-images"
          onClick={() => {
            props.onSelectionIntent?.("left");
            props.onViewportChange?.({
              scrollX: 0,
              scrollY: 0,
              zoom: 1,
            });
            props.onSelectionChange?.([
              {
                id: "image-1",
                type: "image",
                x: 160,
                y: 120,
                width: 240,
                height: 160,
                storageUrl: "https://example.com/reference-1.png",
              },
              {
                id: "image-2",
                type: "image",
                x: 420,
                y: 160,
                width: 240,
                height: 160,
                storageUrl: "https://example.com/reference-2.png",
              },
            ]);
          }}
        >
          select multiple canvas images
        </button>
        <button
          type="button"
          data-testid="mock-select-canvas-rectangle"
          onClick={() => {
            props.onSelectionIntent?.("left");
            props.onViewportChange?.({
              scrollX: 0,
              scrollY: 0,
              zoom: 1,
            });
            props.onSelectionChange?.([
              {
                id: "shape-1",
                type: "rectangle",
                x: 120,
                y: 96,
                width: 220,
                height: 140,
                strokeColor: "#0f172a",
                backgroundColor: "transparent",
                strokeWidth: 2,
              },
            ]);
          }}
        >
          select canvas rectangle
        </button>
        <button
          type="button"
          data-testid="mock-move-selected-canvas-image"
          onClick={() => {
            props.onSelectionIntent?.("left");
            props.onViewportChange?.({
              scrollX: 0,
              scrollY: 0,
              zoom: 1,
            });
            props.onSelectionChange?.([
              {
                id: "image-1",
                type: "image",
                x: 320,
                y: 240,
                width: 240,
                height: 160,
                storageUrl:
                  "http://host.docker.internal:54321/storage/v1/object/public/assets/reference.png",
              },
            ]);
          }}
        >
          move selected canvas image
        </button>
        <button
          type="button"
          data-testid="mock-clear-selection"
          onClick={() => {
            props.onSelectionChange?.([]);
          }}
        >
          clear selection
        </button>
      </div>
    );
  },
}));

vi.mock("../src/components/canvas/canvas-context-menu", () => ({
  CanvasContextMenu: () => <div data-testid="canvas-context-menu" />,
}));

vi.mock("../src/components/canvas-empty-hint", () => ({
  CanvasEmptyHint: () => <div data-testid="canvas-empty-hint" />,
}));

vi.mock("../src/components/canvas-logo-menu", () => ({
  CanvasLogoMenu: () => <div data-testid="canvas-logo-menu" />,
}));

vi.mock("../src/components/editable-project-name", () => ({
  EditableProjectName: () => <div data-testid="editable-project-name" />,
}));

vi.mock("../src/components/chat-sidebar", () => ({
  buildArchitectureTemplateSuggestions: vi.fn(() => []),
  ChatSidebar: (props: any) => (
    <div
      data-testid="chat-sidebar"
      data-composer-type={props.composerCommand?.type ?? ""}
      data-composer-prompt={props.composerCommand?.prompt ?? ""}
      data-composer-attach-selection={String(
        props.composerCommand?.attachSelection ?? "",
      )}
    />
  ),
}));

import CanvasPage from "../src/app/canvas/page";

describe("CanvasPage selection action bar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchImageBlobWithFallbackMock.mockResolvedValue(
      new Blob(["image"], { type: "image/png" }),
    );
    fetchCanvasMock.mockResolvedValue({
      canvas: {
        id: "canvas-1",
        name: "Architecture Canvas",
        projectId: "project-1",
        content: {
          elements: [],
          appState: {},
          files: {},
        },
      },
    });
    fetchProjectMock.mockResolvedValue({
      project: {
        name: "Harbor Studio",
        brand_kit_id: null,
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the selected-image floating action bar and routes edit and tool actions through the existing page flow", async () => {
    const user = userEvent.setup();

    render(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await user.click(screen.getByTestId("mock-select-canvas-image"));

    expect(
      screen.getByRole("button", { name: "编辑" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "涂鸦" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "文字" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "查看大图" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "下载" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "编辑" }));
    expect(screen.getByTestId("chat-sidebar")).toHaveAttribute(
      "data-composer-type",
      "apply-template",
    );
    expect(screen.getByTestId("chat-sidebar")).toHaveAttribute(
      "data-composer-attach-selection",
      "true",
    );
    expect(screen.getByTestId("chat-sidebar")).toHaveAttribute(
      "data-composer-prompt",
      expect.stringContaining("当前选中图片"),
    );

    await user.click(screen.getByRole("button", { name: "涂鸦" }));
    expect(setActiveToolMock).toHaveBeenCalledWith({ type: "freedraw" });

    await user.click(screen.getByRole("button", { name: "文字" }));
    expect(setActiveToolMock).toHaveBeenCalledWith({ type: "text" });
  });

  it("shows the multi-selection top action bar for grouped image work", async () => {
    const user = userEvent.setup();

    render(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await user.click(screen.getByTestId("mock-select-multiple-canvas-images"));

    expect(
      screen.getByRole("button", { name: "创建编组" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "合并图层" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "发送至对话" }),
    ).toBeInTheDocument();
  });

  it("opens the architecture large-image viewer with the audited action cluster and immediate download drawer", async () => {
    const user = userEvent.setup();

    render(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await user.click(screen.getByTestId("mock-select-canvas-image"));
    await user.click(screen.getByRole("button", { name: "查看大图" }));

    expect(screen.getByRole("dialog", { name: "查看大图" })).toBeInTheDocument();
    expect(screen.getByAltText("画布参考图 image-1")).toHaveAttribute(
      "src",
      `http://${window.location.hostname}:54321/storage/v1/object/public/assets/reference.png`,
    );
    expect(
      screen.getByRole("button", { name: "逆时针旋转" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "顺时针旋转" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "放大" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "缩小" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "关闭查看大图" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "立即下载" })).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "左右翻转" })).toBeNull();
    expect(screen.queryByRole("button", { name: "上下翻转" })).toBeNull();
    expect(screen.queryByRole("button", { name: "重置" })).toBeNull();
  });

  it("enables zoom-out after zooming in and closes the architecture large-image viewer from the close icon", async () => {
    const user = userEvent.setup();

    render(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await user.click(screen.getByTestId("mock-select-canvas-image"));
    await user.click(screen.getByRole("button", { name: "查看大图" }));

    const zoomOut = screen.getByRole("button", { name: "缩小" });
    expect(zoomOut).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "放大" }));
    expect(zoomOut).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "关闭查看大图" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "查看大图" })).toBeNull();
    });
  });

  it("hides the image action bar after deselection and suppresses it for right-click selection", async () => {
    const user = userEvent.setup();

    render(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await user.click(screen.getByTestId("mock-select-canvas-image"));
    expect(
      screen.getByRole("button", { name: "编辑" }),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId("mock-clear-selection"));
    expect(
      screen.queryByRole("button", { name: "编辑" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByTestId("mock-select-canvas-image-via-context-menu"),
    );
    expect(
      screen.queryByRole("button", { name: "编辑" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("canvas-context-menu")).toBeInTheDocument();
  });

  it("does not reuse the image action bar when a rectangle shape is selected", async () => {
    const user = userEvent.setup();

    render(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await user.click(screen.getByTestId("mock-select-canvas-rectangle"));

    expect(
      screen.queryByRole("button", { name: "编辑" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "涂鸦" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "文字" }),
    ).not.toBeInTheDocument();
  });

  it("dismisses the selected-image floating action bar when the user presses Escape", async () => {
    const user = userEvent.setup();

    render(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await user.click(screen.getByTestId("mock-select-canvas-image"));
    expect(
      screen.getByRole("button", { name: "编辑" }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("button", { name: "编辑" }),
    ).not.toBeInTheDocument();
  });

  it("updates the floating action bar position when the selected image moves", async () => {
    const user = userEvent.setup();

    render(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await user.click(screen.getByTestId("mock-select-canvas-image"));

    const actionBar = screen.getByTestId("canvas-selection-action-bar");
    const initialLeft = actionBar.style.left;
    const initialTop = actionBar.style.top;

    await user.click(screen.getByTestId("mock-move-selected-canvas-image"));

    expect(actionBar.style.left).not.toBe(initialLeft);
    expect(actionBar.style.top).not.toBe(initialTop);
  });

  it("anchors the image floating action bar just above the native rotation handle clearance", async () => {
    const user = userEvent.setup();

    render(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await user.click(screen.getByTestId("mock-select-canvas-image"));

    const actionBar = screen.getByTestId("canvas-selection-action-bar");
    const top = Number.parseFloat(actionBar.style.top);
    expect(top).toBeGreaterThanOrEqual(80);
    expect(top).toBeLessThanOrEqual(88);
  });

  it("opens a browser-reachable fallback url when single-image download export fails", async () => {
    const user = userEvent.setup();
    const windowOpenSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null);

    fetchImageBlobWithFallbackMock.mockRejectedValueOnce(
      new Error("download failed"),
    );

    try {
      render(<CanvasPage />);

      await waitFor(() => {
        expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
      });

      await user.click(screen.getByTestId("mock-select-canvas-image"));
      await user.click(screen.getByRole("button", { name: "下载" }));

      await waitFor(() => {
        expect(fetchImageBlobWithFallbackMock).toHaveBeenCalledWith(
          "http://host.docker.internal:54321/storage/v1/object/public/assets/reference.png",
        );
      });

      expect(windowOpenSpy).toHaveBeenCalledWith(
        `http://${window.location.hostname}:54321/storage/v1/object/public/assets/reference.png`,
        "_blank",
        "noopener,noreferrer",
      );
    } finally {
      windowOpenSpy.mockRestore();
    }
  });
});
