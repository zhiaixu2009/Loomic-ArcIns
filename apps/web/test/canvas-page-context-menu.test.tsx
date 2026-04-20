// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithToast } from "./render-with-toast";

const {
  fetchCanvasMock,
  fetchImageBlobWithFallbackMock,
  fetchProjectMock,
  replaceMock,
  resetMockCanvasApi,
  updateSceneMock,
} = vi.hoisted(() => ({
  fetchCanvasMock: vi.fn(),
  fetchImageBlobWithFallbackMock: vi.fn(),
  fetchProjectMock: vi.fn(),
  replaceMock: vi.fn(),
  resetMockCanvasApi: vi.fn(),
  updateSceneMock: vi.fn(),
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
    const sceneRef = React.useRef({
      appState: {
        selectedElementIds: {},
      } as Record<string, any>,
      elements: [
        {
          id: "image-1",
          type: "image",
          x: 10,
          y: 12,
          width: 120,
          height: 80,
          storageUrl: "https://example.com/reference-1.png",
          locked: false,
          isDeleted: false,
        },
        {
          id: "image-2",
          type: "image",
          x: 140,
          y: 16,
          width: 120,
          height: 80,
          storageUrl: "https://example.com/reference-2.png",
          locked: false,
          isDeleted: false,
        },
        {
          id: "image-locked",
          type: "image",
          x: 14,
          y: 18,
          width: 140,
          height: 96,
          storageUrl: "https://example.com/locked-reference.png",
          locked: true,
          isDeleted: false,
        },
      ] as Array<Record<string, any>>,
    });

    React.useEffect(() => {
      const reset = () => {
        sceneRef.current = {
          appState: {
            selectedElementIds: {},
          },
          elements: [
            {
              id: "image-1",
              type: "image",
              x: 10,
              y: 12,
              width: 120,
              height: 80,
              storageUrl: "https://example.com/reference-1.png",
              locked: false,
              isDeleted: false,
            },
            {
              id: "image-2",
              type: "image",
              x: 140,
              y: 16,
              width: 120,
              height: 80,
              storageUrl: "https://example.com/reference-2.png",
              locked: false,
              isDeleted: false,
            },
            {
              id: "image-locked",
              type: "image",
              x: 14,
              y: 18,
              width: 140,
              height: 96,
              storageUrl: "https://example.com/locked-reference.png",
              locked: true,
              isDeleted: false,
            },
          ],
        };
        updateSceneMock.mockClear();
      };

      resetMockCanvasApi.mockImplementation(reset);
      reset();

      props.onApiReady?.({
        getAppState: () => sceneRef.current.appState,
        getSceneElements: () => sceneRef.current.elements,
        getFiles: () => ({}),
        addFiles: vi.fn(),
        updateScene: updateSceneMock.mockImplementation((scene: any) => {
          if (scene.appState) {
            sceneRef.current.appState = {
              ...sceneRef.current.appState,
              ...scene.appState,
            };
          }

          if (scene.elements) {
            sceneRef.current.elements = scene.elements;
          }
        }),
      });
    }, [props.onApiReady]);

    return (
      <div data-testid="canvas-editor">
        <button
          type="button"
          data-testid="mock-open-blank-menu"
          onClick={() =>
            props.onContextMenuRequest?.({
              x: 24,
              y: 32,
              selectedElements: [],
            })
          }
        >
          open blank menu
        </button>
        <button
          type="button"
          data-testid="mock-open-single-image-menu"
          onClick={() =>
            props.onContextMenuRequest?.({
              x: 48,
              y: 56,
              selectedElements: [
                {
                  id: "image-1",
                  type: "image",
                  x: 10,
                  y: 12,
                  width: 120,
                  height: 80,
                  storageUrl: "https://example.com/reference.png",
                  locked: false,
                },
              ],
            })
          }
        >
          open single image menu
        </button>
        <button
          type="button"
          data-testid="mock-open-locked-image-menu"
          onClick={() =>
            props.onContextMenuRequest?.({
              x: 60,
              y: 64,
              selectedElements: [
                {
                  id: "image-locked",
                  type: "image",
                  x: 14,
                  y: 18,
                  width: 140,
                  height: 96,
                  storageUrl: "https://example.com/locked-reference.png",
                  locked: true,
                },
              ],
            })
          }
        >
          open locked image menu
        </button>
        <button
          type="button"
          data-testid="mock-open-multi-image-menu"
          onClick={() =>
            props.onContextMenuRequest?.({
              x: 72,
              y: 80,
              selectedElements: [
                {
                  id: "image-1",
                  type: "image",
                  x: 10,
                  y: 12,
                  width: 120,
                  height: 80,
                  storageUrl: "https://example.com/reference-1.png",
                  locked: false,
                },
                {
                  id: "image-2",
                  type: "image",
                  x: 140,
                  y: 16,
                  width: 120,
                  height: 80,
                  storageUrl: "https://example.com/reference-2.png",
                  locked: false,
                },
              ],
            })
          }
        >
          open multi image menu
        </button>
      </div>
    );
  },
}));

vi.mock("../src/components/canvas/canvas-context-menu", () => ({
  CanvasContextMenu: (props: {
    mode: string;
    open: boolean;
    actions: Array<{ id: string; label: string; onSelect: () => void }>;
  }) =>
    props.open ? (
      <div data-testid="canvas-context-menu">
        <div data-testid="canvas-context-menu-mode">{props.mode}</div>
        {props.actions.map((action) => (
          <button
            key={action.id}
            type="button"
            data-action-id={action.id}
            onClick={action.onSelect}
          >
            {action.label}
          </button>
        ))}
      </div>
    ) : null,
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
      data-open={String(props.open)}
      data-composer-type={props.composerCommand?.type ?? ""}
    />
  ),
}));

import CanvasPage from "../src/app/canvas/page";

describe("CanvasPage context menu mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchImageBlobWithFallbackMock.mockResolvedValue(
      new Blob(["image"], { type: "image/png" }),
    );
    resetMockCanvasApi();
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

  it("uses the live right-click payload instead of falling back to stale selected state", async () => {
    renderWithToast(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await userEvent.click(screen.getByTestId("mock-open-blank-menu"));

    expect(screen.getByTestId("canvas-context-menu-mode")).toHaveTextContent("blank");
    expect(
      within(screen.getByTestId("canvas-context-menu"))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["粘贴", "显示画布所有元素", "导出画布", "导入画布"]);
  });

  it("exposes scene-organization actions in the single-image menu", async () => {
    renderWithToast(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await userEvent.click(screen.getByTestId("mock-open-single-image-menu"));

    expect(screen.getByTestId("canvas-context-menu-mode")).toHaveTextContent("single-image");
    expect(
      within(screen.getByTestId("canvas-context-menu"))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([
      "复制",
      "粘贴",
      "上移一层",
      "下移一层",
      "移到顶层",
      "移到底层",
      "发送至对话",
      "创建编组",
      "解除编组",
      "合并图层",
      "显示/隐藏",
      "锁定",
      "导出",
      "删除",
    ]);
  });

  it("switches the lock action label when the selected image is already locked", async () => {
    renderWithToast(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await userEvent.click(screen.getByTestId("mock-open-locked-image-menu"));

    expect(screen.getByTestId("canvas-context-menu-mode")).toHaveTextContent("single-image");
    expect(screen.getByText("解锁")).toBeInTheDocument();
  });

  it("uses the real multi-image inventory when multiple images are selected", async () => {
    renderWithToast(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await userEvent.click(screen.getByTestId("mock-open-multi-image-menu"));

    expect(screen.getByTestId("canvas-context-menu-mode")).toHaveTextContent("multi-image");
    expect(
      within(screen.getByTestId("canvas-context-menu"))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([
      "发送至对话",
      "创建编组",
      "解除编组",
      "合并图层",
      "显示/隐藏",
      "锁定",
      "导出",
      "删除",
    ]);
  });

  it("exports the current multi-image selection as a combined PNG instead of falling back to canvas export", async () => {
    const user = userEvent.setup();
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectUrlMock = vi.fn(() => "blob:canvas-selection-export");
    const revokeObjectUrlMock = vi.fn();
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const originalCreateElement = document.createElement.bind(document);
    const drawImageMock = vi.fn();
    const clickedAnchors: HTMLAnchorElement[] = [];
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation(((tagName: string) => {
        const element = originalCreateElement(tagName);

        if (tagName === "canvas") {
          vi.spyOn(element as HTMLCanvasElement, "getContext").mockReturnValue({
            drawImage: drawImageMock,
          } as unknown as CanvasRenderingContext2D);
          vi.spyOn(element as HTMLCanvasElement, "toBlob").mockImplementation(
            ((callback: BlobCallback, type?: string) => {
              callback?.(new Blob(["selection"], { type: type ?? "image/png" }));
            }) as HTMLCanvasElement["toBlob"],
          );
        }

        if (tagName === "a") {
          clickedAnchors.push(element as HTMLAnchorElement);
          vi.spyOn(element as HTMLAnchorElement, "click").mockImplementation(() => {});
        }

        return element;
      }) as typeof document.createElement);

    const OriginalImage = global.Image;
    class MockImage {
      naturalWidth = 120;
      naturalHeight = 80;
      onerror: null | (() => void) = null;
      onload: null | (() => void) = null;

      set src(_value: string) {
        queueMicrotask(() => {
          this.onload?.();
        });
      }
    }

    // @ts-expect-error test double is sufficient for the export path.
    global.Image = MockImage;
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrlMock,
      writable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrlMock,
      writable: true,
    });

    try {
      renderWithToast(<CanvasPage />);

      await waitFor(() => {
        expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
      });

      await user.click(screen.getByTestId("mock-open-multi-image-menu"));
      await user.click(
        within(screen.getByTestId("canvas-context-menu")).getByRole("button", {
          name: "导出",
        }),
      );

      await waitFor(() => {
        expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
      });

      expect(fetchImageBlobWithFallbackMock).toHaveBeenNthCalledWith(
        1,
        "https://example.com/reference-1.png",
      );
      expect(fetchImageBlobWithFallbackMock).toHaveBeenNthCalledWith(
        2,
        "https://example.com/reference-2.png",
      );
      expect(drawImageMock).toHaveBeenCalledTimes(2);
      expect(clickedAnchors).toHaveLength(1);
      expect(clickedAnchors[0]?.download).toBe("canvas-selection-export.png");
      const firstCreateObjectUrlCall = createObjectUrlMock.mock.calls.at(0);
      expect(firstCreateObjectUrlCall).toBeDefined();
      const [firstBlobArg] = firstCreateObjectUrlCall as unknown as [Blob];
      expect(firstBlobArg.type).toBe("image/png");
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("multi-selection export is not implemented yet"),
      );
    } finally {
      global.Image = OriginalImage;
      createElementSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectURL,
        writable: true,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectURL,
        writable: true,
      });
    }
  });

  it("wires blank-menu import to the hidden canvas import input", async () => {
    renderWithToast(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    const importInput = document.querySelector(
      'input[accept="application/json,.json"]',
    ) as HTMLInputElement | null;
    expect(importInput).not.toBeNull();
    const clickSpy = vi.spyOn(importInput!, "click");

    await userEvent.click(screen.getByTestId("mock-open-blank-menu"));
    await userEvent.click(
      within(screen.getByTestId("canvas-context-menu")).getByRole("button", {
        name: "导入画布",
      }),
    );

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("routes send-to-chat into the composer command without forcing the right panel open", async () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 768,
      writable: true,
    });

    try {
      renderWithToast(<CanvasPage />);

      await waitFor(() => {
        expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
      });

      expect(screen.getByTestId("chat-sidebar")).toHaveAttribute("data-open", "false");

      await userEvent.click(screen.getByTestId("mock-open-single-image-menu"));
      await userEvent.click(
        within(screen.getByTestId("canvas-context-menu")).getByRole("button", {
          name: "发送至对话",
        }),
      );

      expect(screen.getByTestId("chat-sidebar")).toHaveAttribute(
        "data-composer-type",
        "attach-selection",
      );
      expect(screen.getByTestId("chat-sidebar")).toHaveAttribute("data-open", "false");
    } finally {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalInnerWidth,
        writable: true,
      });
    }
  });

  it("preserves the attach-selection composer command after the user opens the record panel", async () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 768,
      writable: true,
    });

    try {
      renderWithToast(<CanvasPage />);

      await waitFor(() => {
        expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
      });

      await userEvent.click(screen.getByTestId("mock-open-single-image-menu"));
      await userEvent.click(
        within(screen.getByTestId("canvas-context-menu")).getByRole("button", {
          name: "发送至对话",
        }),
      );

      expect(screen.getByTestId("chat-sidebar")).toHaveAttribute(
        "data-composer-type",
        "attach-selection",
      );
      expect(screen.getByTestId("chat-sidebar")).toHaveAttribute("data-open", "false");

      await userEvent.click(screen.getByRole("button", { name: "对话" }));

      expect(screen.getByTestId("chat-sidebar")).toHaveAttribute(
        "data-composer-type",
        "attach-selection",
      );
      expect(screen.getByTestId("chat-sidebar")).toHaveAttribute("data-open", "true");
    } finally {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalInnerWidth,
        writable: true,
      });
    }
  });

  it("syncs the context-menu selection into the live canvas selection before mutating it", async () => {
    renderWithToast(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await userEvent.click(screen.getByTestId("mock-open-single-image-menu"));
    await userEvent.click(
      within(screen.getByTestId("canvas-context-menu")).getByRole("button", {
        name: "删除",
      }),
    );

    expect(updateSceneMock).toHaveBeenCalled();
    expect(updateSceneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({
          selectedElementIds: { "image-1": true },
        }),
      }),
    );
    expect(updateSceneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({
            id: "image-1",
            isDeleted: true,
          }),
        ]),
      }),
    );
  });
});
