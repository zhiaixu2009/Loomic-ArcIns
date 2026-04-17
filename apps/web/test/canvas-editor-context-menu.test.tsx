// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  apiState,
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
    mockExcalidrawApi: {
      addFiles: vi.fn(),
      getAppState: vi.fn(() => state.appState),
      getFiles: vi.fn(() => state.files),
      getSceneElements: vi.fn(() => state.sceneElements),
      onChange: vi.fn(() => () => {}),
      updateScene: vi.fn((scene: { appState?: Record<string, unknown>; elements?: Record<string, unknown>[] }) => {
        if (scene.elements) {
          state.sceneElements = [...scene.elements];
        }

        if (scene.appState) {
          state.appState = {
            ...state.appState,
            ...scene.appState,
          };
        }
      }),
    },
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
    default: (loader: () => Promise<{ default?: React.ComponentType<any> } | React.ComponentType<any>>) => {
      return function DynamicComponent(props: Record<string, unknown>) {
        const [Component, setComponent] = React.useState<React.ComponentType<any> | null>(null);

        React.useEffect(() => {
          let cancelled = false;

          loader().then((mod) => {
            if (cancelled) {
              return;
            }

            setComponent(() => ("default" in mod ? mod.default : mod));
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
    Excalidraw: ({ excalidrawAPI }: { excalidrawAPI?: (api: unknown) => void }) => {
      React.useEffect(() => {
        excalidrawAPI?.(mockExcalidrawApi);
      }, [excalidrawAPI]);

      return React.createElement("div", {
        "data-testid": "mock-excalidraw-surface",
      });
    },
    exportToBlob: vi.fn(),
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

describe("CanvasEditor context menu", () => {
  beforeEach(() => {
    Object.defineProperty(window, "PointerEvent", {
      configurable: true,
      value: MouseEvent,
      writable: true,
    });
    apiState.sceneElements = [];
    apiState.files = {};
    apiState.appState = {
      gridModeEnabled: false,
      selectedElementIds: {},
      viewBackgroundColor: "#ffffff",
    };
    delete (mockExcalidrawApi as Record<string, unknown>).__loomicProgrammaticSaveWrapped;
    mockExcalidrawApi.addFiles.mockClear();
    mockExcalidrawApi.getAppState.mockClear();
    mockExcalidrawApi.getFiles.mockClear();
    mockExcalidrawApi.getSceneElements.mockClear();
    mockExcalidrawApi.onChange.mockClear();
    mockExcalidrawApi.updateScene = vi.fn((scene: { appState?: Record<string, unknown>; elements?: Record<string, unknown>[] }) => {
      if (scene.elements) {
        apiState.sceneElements = [...scene.elements];
      }

      if (scene.appState) {
        apiState.appState = {
          ...apiState.appState,
          ...scene.appState,
        };
      }
    });
    saveCanvasMock.mockClear();
    uploadThumbnailMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("uses the live Excalidraw selection snapshot when opening the canvas context menu", async () => {
    apiState.sceneElements = [
      {
        id: "image-1",
        type: "image",
        x: 120,
        y: 80,
        width: 640,
        height: 480,
        fileId: "file-1",
        customData: {
          storageUrl: "https://example.com/runtime-reference.png",
        },
      },
    ];
    apiState.files = {
      "file-1": {
        dataURL: "data:image/png;base64,ZmFrZQ==",
      },
    };
    apiState.appState.selectedElementIds = {
      "image-1": true,
    };

    const onApiReady = vi.fn();
    const onContextMenuRequest = vi.fn();

    render(
      <CanvasEditor
        accessToken="token"
        canvasId="canvas-1"
        initialContent={{
          elements: [],
          appState: {},
          files: {},
        }}
        onApiReady={onApiReady}
        onContextMenuRequest={onContextMenuRequest}
        projectId="project-1"
      />,
    );

    const surface = await screen.findByTestId("mock-excalidraw-surface");
    const container = surface.parentElement as HTMLElement;
    await waitFor(() => expect(onApiReady).toHaveBeenCalledWith(mockExcalidrawApi));

    fireEvent(
      container,
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 2,
        buttons: 2,
        cancelable: true,
        clientX: 680,
        clientY: 448,
      }),
    );

    await waitFor(() => expect(onContextMenuRequest).toHaveBeenCalledTimes(1));
    expect(onContextMenuRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        clientX: 680,
        clientY: 448,
        selectedElements: [
          {
            id: "image-1",
            type: "image",
            x: 120,
            y: 80,
            width: 640,
            height: 480,
            fileId: "file-1",
            dataUrl: "data:image/png;base64,ZmFrZQ==",
            storageUrl: "https://example.com/runtime-reference.png",
          },
        ],
      }),
    );
  });

  it("persists programmatic scene updates that insert image elements", async () => {
    apiState.files = {
      "file-1": {
        created: 1710000000000,
        dataURL: "data:image/png;base64,ZmFrZTI=",
        id: "file-1",
        mimeType: "image/png",
      },
    };

    const onApiReady = vi.fn();

    render(
      <CanvasEditor
        accessToken="token"
        canvasId="canvas-1"
        initialContent={{
          elements: [],
          appState: {},
          files: {},
        }}
        onApiReady={onApiReady}
        projectId="project-1"
      />,
    );

    await screen.findByTestId("mock-excalidraw-surface");
    await waitFor(() => expect(onApiReady).toHaveBeenCalledWith(mockExcalidrawApi));
    await waitFor(() => expect(mockExcalidrawApi.getSceneElements).toHaveBeenCalled());

    const patchedApi = onApiReady.mock.calls[0]?.[0];
    patchedApi.updateScene({
      captureUpdate: "IMMEDIATELY",
      elements: [
        {
          id: "image-1",
          type: "image",
          x: 200,
          y: 120,
          width: 600,
          height: 400,
          fileId: "file-1",
          isDeleted: false,
        },
      ],
    });

    await waitFor(
      () =>
        expect(saveCanvasMock).toHaveBeenCalledWith(
          "token",
          "canvas-1",
          {
            elements: [
              {
                id: "image-1",
                type: "image",
                x: 200,
                y: 120,
                width: 600,
                height: 400,
                fileId: "file-1",
                isDeleted: false,
              },
            ],
            appState: {
              viewBackgroundColor: "#ffffff",
              gridModeEnabled: false,
            },
            files: {
              "file-1": {
                id: "file-1",
                dataURL: "data:image/png;base64,ZmFrZTI=",
                mimeType: "image/png",
                created: 1710000000000,
              },
            },
          },
        ),
      {
        timeout: 2500,
      },
    );
  });
});
