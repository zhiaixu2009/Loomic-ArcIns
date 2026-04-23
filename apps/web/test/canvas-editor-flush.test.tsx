// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  apiState,
  excalidrawOnChangeRef,
  exportToBlobMock,
  mockExcalidrawApi,
  saveCanvasMock,
  uploadThumbnailMock,
} = vi.hoisted(() => {
  const state = {
    appState: {
      gridModeEnabled: false,
      selectedElementIds: {} as Record<string, boolean>,
      viewBackgroundColor: "#ffffff",
    },
    files: {} as Record<string, unknown>,
    sceneElements: [] as Record<string, unknown>[],
  };

  return {
    apiState: state,
    excalidrawOnChangeRef: {
      current: null as
        | ((
            elements: readonly Record<string, unknown>[],
            appState: Record<string, unknown>,
          ) => void)
        | null,
    },
    mockExcalidrawApi: {
      addFiles: vi.fn(),
      getAppState: vi.fn(() => state.appState),
      getFiles: vi.fn(() => state.files),
      getSceneElements: vi.fn(() => state.sceneElements),
      onChange: vi.fn(() => () => {}),
      updateScene: vi.fn(
        (scene: {
          appState?: Record<string, unknown>;
          elements?: Record<string, unknown>[];
        }) => {
          if (scene.elements) {
            state.sceneElements = [...scene.elements];
          }

          if (scene.appState) {
            state.appState = {
              ...state.appState,
              ...scene.appState,
            };
          }
        },
      ),
    },
    exportToBlobMock: vi.fn(() =>
      Promise.resolve(new Blob(["thumbnail"], { type: "image/webp" })),
    ),
    saveCanvasMock: vi.fn(() => Promise.resolve(undefined)),
    uploadThumbnailMock: vi.fn(() => Promise.resolve(undefined)),
  };
});

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
  }),
}));

vi.mock("next/dynamic", async () => {
  const React = await import("react");

  return {
    default: (
      loader: () =>
        Promise<
          { default?: React.ComponentType<any> } | React.ComponentType<any>
        >,
    ) => {
      return function DynamicComponent(props: Record<string, unknown>) {
        const [Component, setComponent] =
          React.useState<React.ComponentType<any> | null>(null);

        React.useEffect(() => {
          let cancelled = false;

          loader().then((mod) => {
            if (cancelled) {
              return;
            }

            const loadedComponent: React.ComponentType<any> | null =
              typeof mod === "function" ? mod : mod.default ?? null;
            setComponent(() => loadedComponent);
          });

          return () => {
            cancelled = true;
          };
        }, []);

        if (!Component) {
          return null;
        }

        return React.createElement(Component, props);
      };
    },
  };
});

vi.mock("@excalidraw/excalidraw", async () => {
  const React = await import("react");

  return {
    Excalidraw: ({
      excalidrawAPI,
      onChange,
    }: {
      excalidrawAPI?: (api: unknown) => void;
      onChange?: (
        elements: readonly Record<string, unknown>[],
        appState: Record<string, unknown>,
      ) => void;
    }) => {
      React.useEffect(() => {
        excalidrawAPI?.(mockExcalidrawApi);
      }, [excalidrawAPI]);

      React.useEffect(() => {
        excalidrawOnChangeRef.current = onChange ?? null;

        return () => {
          excalidrawOnChangeRef.current = null;
        };
      }, [onChange]);

      return React.createElement("div", {
        "data-testid": "mock-excalidraw-surface",
      });
    },
    exportToBlob: exportToBlobMock,
  };
});

vi.mock("../src/components/canvas-tool-menu", () => ({
  CanvasToolMenu: () => null,
}));

vi.mock("../src/components/error-boundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("../src/lib/canvas-normalize", () => ({
  normalizeCanvasElements: vi.fn(() => ({ changed: false })),
}));

vi.mock("../src/lib/server-api", () => ({
  saveCanvas: saveCanvasMock,
  uploadThumbnail: uploadThumbnailMock,
}));

import { CanvasEditor } from "../src/components/canvas-editor";

describe("CanvasEditor flush", () => {
  beforeEach(() => {
    apiState.sceneElements = [];
    apiState.files = {};
    apiState.appState = {
      gridModeEnabled: false,
      selectedElementIds: {},
      viewBackgroundColor: "#ffffff",
    };
    delete (mockExcalidrawApi as Record<string, unknown>)
      .__loomicProgrammaticSaveWrapped;
    mockExcalidrawApi.addFiles.mockClear();
    mockExcalidrawApi.getAppState.mockClear();
    mockExcalidrawApi.getFiles.mockClear();
    mockExcalidrawApi.getSceneElements.mockClear();
    mockExcalidrawApi.onChange.mockClear();
    excalidrawOnChangeRef.current = null;
    mockExcalidrawApi.updateScene = vi.fn(
      (scene: {
        appState?: Record<string, unknown>;
        elements?: Record<string, unknown>[];
      }) => {
        if (scene.elements) {
          apiState.sceneElements = [...scene.elements];
        }

        if (scene.appState) {
          apiState.appState = {
            ...apiState.appState,
            ...scene.appState,
          };
        }
      },
    );
    saveCanvasMock.mockClear();
    exportToBlobMock.mockClear();
    uploadThumbnailMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("exposes a flush callback that persists pending scene changes before navigation", async () => {
    const onFlushReady = vi.fn();

    render(
      <CanvasEditor
        accessToken="token"
        canvasId="canvas-1"
        initialContent={{
          elements: [],
          appState: {},
          files: {},
        }}
        onFlushReady={onFlushReady}
        projectId="project-1"
      />,
    );

    await screen.findByTestId("mock-excalidraw-surface");
    await waitFor(() => expect(onFlushReady).toHaveBeenCalled());

    apiState.sceneElements = [
      {
        id: "shape-1",
        type: "rectangle",
        x: 40,
        y: 50,
        width: 160,
        height: 120,
      },
    ];

    await act(async () => {
      excalidrawOnChangeRef.current?.(apiState.sceneElements, apiState.appState);
    });

    const flush = onFlushReady.mock.calls.at(-1)?.[0] as
      | (() => Promise<void>)
      | undefined;
    expect(flush).toBeTypeOf("function");

    await act(async () => {
      await flush?.();
    });

    expect(saveCanvasMock).toHaveBeenCalledWith(
      "token",
      "canvas-1",
      expect.objectContaining({
        elements: [
          expect.objectContaining({
            id: "shape-1",
            type: "rectangle",
          }),
        ],
      }),
    );
    expect(uploadThumbnailMock).toHaveBeenCalledWith(
      "token",
      "project-1",
      expect.any(Blob),
    );
  });

  it("uploads an initial blank thumbnail for a freshly created empty canvas", async () => {
    render(
      <CanvasEditor
        accessToken="token"
        canvasId="canvas-empty"
        initialContent={{
          elements: [],
          appState: {},
          files: {},
        }}
        projectId="project-empty"
      />,
    );

    await screen.findByTestId("mock-excalidraw-surface");

    await waitFor(() => {
      expect(uploadThumbnailMock).toHaveBeenCalledWith(
        "token",
        "project-empty",
        expect.any(Blob),
      );
    });
    expect(exportToBlobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: [],
      }),
    );
  });

  it("uploads a current-scene thumbnail on mount for an existing canvas so stale blank covers can self-heal", async () => {
    apiState.sceneElements = [
      {
        id: "existing-shape-1",
        type: "rectangle",
        x: 120,
        y: 90,
        width: 320,
        height: 240,
      },
    ];

    render(
      <CanvasEditor
        accessToken="token"
        canvasId="canvas-existing"
        initialContent={{
          elements: apiState.sceneElements,
          appState: {},
          files: {},
        }}
        projectId="project-existing"
      />,
    );

    await screen.findByTestId("mock-excalidraw-surface");

    await waitFor(() => {
      expect(uploadThumbnailMock).toHaveBeenCalledWith(
        "token",
        "project-existing",
        expect.any(Blob),
      );
    });
    expect(exportToBlobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: [
          expect.objectContaining({
            id: "existing-shape-1",
          }),
        ],
      }),
    );
  });

  it("flushes a fresh thumbnail after programmatic scene updates insert new canvas content", async () => {
    const onApiReady = vi.fn();
    const onFlushReady = vi.fn();

    render(
      <CanvasEditor
        accessToken="token"
        canvasId="canvas-programmatic"
        initialContent={{
          elements: [],
          appState: {},
          files: {},
        }}
        onApiReady={onApiReady}
        onFlushReady={onFlushReady}
        projectId="project-programmatic"
      />,
    );

    await screen.findByTestId("mock-excalidraw-surface");
    await waitFor(() => expect(onApiReady).toHaveBeenCalled());
    await waitFor(() =>
      expect(uploadThumbnailMock).toHaveBeenCalledWith(
        "token",
        "project-programmatic",
        expect.any(Blob),
      ),
    );

    uploadThumbnailMock.mockClear();
    exportToBlobMock.mockClear();

    const patchedApi = onApiReady.mock.calls.at(-1)?.[0] as
      | {
          updateScene: (scene: {
            captureUpdate?: string;
            elements?: Record<string, unknown>[];
          }) => void;
        }
      | undefined;
    const flush = onFlushReady.mock.calls.at(-1)?.[0] as
      | (() => Promise<void>)
      | undefined;

    expect(patchedApi?.updateScene).toBeTypeOf("function");
    expect(flush).toBeTypeOf("function");

    apiState.sceneElements = [
      {
        id: "programmatic-shape-1",
        type: "rectangle",
        x: 40,
        y: 50,
        width: 260,
        height: 180,
      },
    ];

    await act(async () => {
      patchedApi?.updateScene({
        captureUpdate: "IMMEDIATELY",
        elements: apiState.sceneElements,
      });
      await flush?.();
    });

    expect(uploadThumbnailMock).toHaveBeenCalledWith(
      "token",
      "project-programmatic",
      expect.any(Blob),
    );
    expect(exportToBlobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: [
          expect.objectContaining({
            id: "programmatic-shape-1",
          }),
        ],
      }),
    );
  });

  it("prioritizes thumbnail uploads immediately when the recent image focus set changes", async () => {
    render(
      <CanvasEditor
        accessToken="token"
        canvasId="canvas-image-priority"
        initialContent={{
          elements: [],
          appState: {},
          files: {},
        }}
        projectId="project-image-priority"
      />,
    );

    await screen.findByTestId("mock-excalidraw-surface");
    await waitFor(() => {
      expect(uploadThumbnailMock).toHaveBeenCalledWith(
        "token",
        "project-image-priority",
        expect.any(Blob),
      );
    });

    uploadThumbnailMock.mockClear();
    exportToBlobMock.mockClear();
    vi.useFakeTimers();

    apiState.sceneElements = [
      {
        id: "image-1",
        type: "image",
        fileId: "file-1",
        x: 40,
        y: 50,
        width: 260,
        height: 180,
      },
    ];

    await act(async () => {
      excalidrawOnChangeRef.current?.(apiState.sceneElements, apiState.appState);
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(uploadThumbnailMock).toHaveBeenCalledWith(
      "token",
      "project-image-priority",
      expect.any(Blob),
    );
    expect(exportToBlobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: [
          expect.objectContaining({
            id: "image-1",
          }),
        ],
      }),
    );
  });
});
