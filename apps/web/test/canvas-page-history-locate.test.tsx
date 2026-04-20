// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithToast } from "./render-with-toast";

const {
  fetchCanvasMock,
  fetchProjectMock,
  replaceMock,
  updateSceneMock,
} = vi.hoisted(() => ({
  fetchCanvasMock: vi.fn(),
  fetchProjectMock: vi.fn(),
  replaceMock: vi.fn(),
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
    startRun: vi.fn(),
    cancelRun: vi.fn(),
    interruptRun: vi.fn(),
    resumeRun: vi.fn(),
    retryRun: vi.fn(),
    publishCanvasMutation: vi.fn(() => true),
    registerRPC: vi.fn(() => () => {}),
    resumeCanvas: vi.fn(),
    setPresence: vi.fn(() => true),
    updateCursor: vi.fn(() => true),
    updateSelection: vi.fn(() => true),
  }),
}));

vi.mock("../src/hooks/use-job-fallback-polling", () => ({
  useJobFallbackPolling: () => ({
    checkForTimedOutJobs: vi.fn(),
  }),
}));

vi.mock("../src/hooks/use-credits", () => ({
  useCredits: () => ({
    balance: 0,
    plan: "free",
    dailyClaimed: false,
    limits: null,
    loading: false,
    error: null,
    refresh: vi.fn(),
    claimDaily: vi.fn(),
  }),
}));

vi.mock("../src/lib/server-api", () => ({
  ApiAuthError: class ApiAuthError extends Error {},
  fetchCanvas: fetchCanvasMock,
  fetchProject: fetchProjectMock,
  uploadFile: vi.fn(),
}));

vi.mock("../src/lib/canvas-elements", () => ({
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
  LOAD_CANVAS_FAILED_MESSAGE: "加载画布失败",
  NO_CANVAS_ID_MESSAGE: "缺少画布 ID",
  UNTITLED_PROJECT_NAME: "未命名项目",
  getCanvasImageFallbackName: vi.fn((index: number) => `参考图 ${index}`),
  normalizeProjectDisplayName: vi.fn((name: string) => name || "未命名项目"),
}));

vi.mock("../src/lib/canvas-context-actions", () => ({
  deleteSelectedCanvasElements: vi.fn(),
  getCanvasContextMenuMode: vi.fn(() => "blank"),
  groupSelectedCanvasElements: vi.fn(() => ({
    groupId: "group-1",
    groupedElementIds: [],
  })),
  reorderSelectedCanvasElements: vi.fn(),
  toggleLockSelectedCanvasElements: vi.fn(),
  toggleVisibilitySelectedCanvasElements: vi.fn(),
  ungroupSelectedCanvasElements: vi.fn(),
}));

vi.mock("../src/components/loading-screen", () => ({
  LoadingScreen: () => <div>Loading</div>,
}));

vi.mock("../src/components/canvas-editor", () => ({
  CanvasEditor: (props: any) => {
    React.useEffect(() => {
      props.onApiReady?.({
        getSceneElements: () => [
          {
            id: "image-1",
            type: "image",
            x: 1200,
            y: 860,
            width: 240,
            height: 180,
            fileId: "file-1",
            isDeleted: false,
            customData: {
              storageUrl: "https://example.com/reference-1.png",
            },
          },
        ],
        getFiles: () => ({
          "file-1": {
            id: "file-1",
            dataURL: "data:image/png;base64,ZmFrZQ==",
            mimeType: "image/png",
            created: 1,
          },
        }),
        getAppState: () => ({
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {},
        }),
        onChange: () => () => {},
        updateScene: updateSceneMock,
      });
    }, [props.onApiReady]);

    return <div data-testid="canvas-editor" />;
  },
}));

vi.mock("../src/components/canvas/canvas-context-menu", () => ({
  CanvasContextMenu: () => null,
}));

vi.mock("../src/components/canvas-empty-hint", () => ({
  CanvasEmptyHint: () => null,
}));

vi.mock("../src/components/canvas-logo-menu", () => ({
  CanvasLogoMenu: () => null,
}));

vi.mock("../src/components/editable-project-name", () => ({
  EditableProjectName: () => <div data-testid="editable-project-name" />,
}));

vi.mock("../src/components/canvas-layers-panel", () => ({
  CanvasLayersPanel: () => null,
}));

vi.mock("../src/components/credits/credit-header-button", () => ({
  CreditHeaderButton: () => null,
}));

vi.mock("../src/components/chat-sidebar", () => ({
  buildArchitectureTemplateSuggestions: vi.fn(() => []),
  ChatSidebar: (props: { onLocateCanvasElement?: (assetId: string) => boolean }) => (
    <button
      type="button"
      onClick={() => props.onLocateCanvasElement?.("image-1")}
    >
      locate record image
    </button>
  ),
}));

import CanvasPage from "../src/app/canvas/page";

describe("CanvasPage record locate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("selects and scrolls to the requested canvas element when a record image is located", async () => {
    const user = userEvent.setup();

    renderWithToast(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    await user.click(screen.getByRole("button", { name: "locate record image" }));

    expect(updateSceneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({
          selectedElementIds: {
            "image-1": true,
          },
          scrollX: expect.any(Number),
          scrollY: expect.any(Number),
        }),
        captureUpdate: "NONE",
      }),
    );

    const latestCall = updateSceneMock.mock.calls.at(-1)?.[0];
    expect(latestCall?.appState?.scrollX).not.toBe(0);
    expect(latestCall?.appState?.scrollY).not.toBe(0);
  });
});
