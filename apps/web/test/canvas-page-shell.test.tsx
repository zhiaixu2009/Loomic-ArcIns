// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithToast } from "./render-with-toast";

const {
  fetchCanvasMock,
  fetchProjectMock,
  replaceMock,
} = vi.hoisted(() => ({
  fetchCanvasMock: vi.fn(),
  fetchProjectMock: vi.fn(),
  replaceMock: vi.fn(),
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
    collaborators: [],
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
  getCanvasContextMenuMode: vi.fn(() => "blank"),
  groupSelectedCanvasElements: vi.fn(() => ({
    groupId: "group-1",
    groupedElementIds: [],
  })),
}));

vi.mock("../src/components/loading-screen", () => ({
  LoadingScreen: () => <div>Loading</div>,
}));

vi.mock("../src/components/canvas-editor", () => ({
  CanvasEditor: (props: {
    leftPanelOpen?: boolean;
    onApiReady?: (api: {
      getSceneElements: () => never[];
      getFiles: () => Record<string, never>;
      getAppState: () => { selectedElementIds: Record<string, boolean> };
      onChange: () => () => void;
      updateScene: ReturnType<typeof vi.fn>;
    }) => void;
  }) => {
    React.useEffect(() => {
      props.onApiReady?.({
        getSceneElements: () => [],
        getFiles: () => ({}),
        getAppState: () => ({ selectedElementIds: {} }),
        onChange: () => () => {},
        updateScene: vi.fn(),
      });
    }, [props.onApiReady]);

    return (
      <div
        data-testid="canvas-editor"
        data-left-panel-open={String(Boolean(props.leftPanelOpen))}
      />
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

vi.mock("../src/components/brand-kit-selector", () => ({
  BrandKitSelector: () => <div data-testid="brand-kit-selector" />,
}));

vi.mock("../src/components/canvas-bottom-bar", () => ({
  CanvasBottomBar: () => <div data-testid="canvas-bottom-bar" />,
}));

vi.mock("../src/components/canvas-files-panel", () => ({
  CanvasFilesPanel: () => <div data-testid="canvas-files-panel" />,
}));

vi.mock("../src/components/canvas-layers-panel", () => ({
  CanvasLayersPanel: (props: { open: boolean; onClose: () => void }) =>
    props.open ? (
      <div data-testid="canvas-layers-panel">
        <div>图层面板已打开</div>
        <button type="button" onClick={props.onClose}>
          关闭图层面板
        </button>
      </div>
    ) : null,
}));

vi.mock("../src/components/architecture/architecture-studio-rail", () => ({
  ArchitectureAgentHeader: () => <div data-testid="architecture-agent-header" />,
  ArchitectureStudioCompactBar: () => (
    <div data-testid="architecture-studio-compact-bar" />
  ),
}));

vi.mock("../src/components/credits/credit-header-button", () => ({
  CreditHeaderButton: () => <div data-testid="credit-header-button" />,
}));

vi.mock("../src/components/chat-sidebar", () => ({
  buildArchitectureTemplateSuggestions: vi.fn(() => []),
  ChatSidebar: (props: { immersive?: boolean; open?: boolean; panelTitle?: string }) => (
    <div
      data-testid="chat-sidebar"
      data-immersive={String(Boolean(props.immersive))}
      data-open={String(Boolean(props.open))}
      data-panel-title={props.panelTitle ?? ""}
    />
  ),
}));

import CanvasPage from "../src/app/canvas/page";

describe("CanvasPage shell", () => {
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

  it("keeps the immersive shell simplified while leaving the layers panel collapsed by default", async () => {
    renderWithToast(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    expect(await screen.findByTestId("canvas-editor")).toBeTruthy();
    expect(screen.getByTestId("chat-sidebar").getAttribute("data-immersive")).toBe(
      "true",
    );
    expect(screen.getByTestId("chat-sidebar").getAttribute("data-open")).toBe(
      "false",
    );
    expect(
      screen.getByTestId("chat-sidebar").getAttribute("data-panel-title"),
    ).toBe("创作记录");
    expect(
      screen.getByTestId("canvas-editor").getAttribute("data-left-panel-open"),
    ).toBe("false");

    expect(
      screen.queryByTestId("architecture-studio-compact-bar"),
    ).toBeNull();
    expect(screen.queryByTestId("canvas-bottom-bar")).toBeNull();
    expect(screen.queryByTestId("canvas-layers-panel")).toBeNull();
    expect(screen.queryByTestId("canvas-files-panel")).toBeNull();
    expect(screen.queryByTestId("brand-kit-selector")).toBeNull();
    expect(screen.queryByTestId("credit-header-button")).toBeNull();
    expect(screen.getByRole("button", { name: "对话" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "缩小画布" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "放大画布" })).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByRole("button", { name: "充值" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "图层" })).toBeTruthy();
  });

  it("opens and closes the left layers panel from the bottom-left trigger", async () => {
    renderWithToast(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    const layersButton = screen.getByRole("button", { name: "图层" });
    expect(screen.queryByTestId("canvas-layers-panel")).toBeNull();

    await userEvent.click(layersButton);

    expect(screen.getByTestId("canvas-layers-panel")).toBeTruthy();
    expect(screen.getByText("图层面板已打开")).toBeTruthy();
    expect(
      screen.getByTestId("canvas-editor").getAttribute("data-left-panel-open"),
    ).toBe("true");

    await userEvent.click(
      screen.getByRole("button", { name: "关闭图层面板" }),
    );

    expect(screen.queryByTestId("canvas-layers-panel")).toBeNull();
    expect(
      screen.getByTestId("canvas-editor").getAttribute("data-left-panel-open"),
    ).toBe("false");
  });

  it("toggles the immersive record panel from the top-right trigger", async () => {
    renderWithToast(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    const recordButton = screen.getByRole("button", { name: "对话" });
    expect(recordButton.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("chat-sidebar").getAttribute("data-open")).toBe(
      "false",
    );

    await userEvent.click(recordButton);

    expect(recordButton.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("chat-sidebar").getAttribute("data-open")).toBe(
      "true",
    );

    await userEvent.click(recordButton);

    expect(recordButton.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("chat-sidebar").getAttribute("data-open")).toBe(
      "false",
    );
  });
});
