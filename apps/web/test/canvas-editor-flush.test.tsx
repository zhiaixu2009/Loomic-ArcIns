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
});
