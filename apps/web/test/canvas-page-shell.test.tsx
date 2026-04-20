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
  searchParamsValue,
} = vi.hoisted(() => ({
  fetchCanvasMock: vi.fn(),
  fetchProjectMock: vi.fn(),
  replaceMock: vi.fn(),
  searchParamsValue: {
    current: "id=canvas-1&studio=architecture",
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(searchParamsValue.current),
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
  LOAD_CANVAS_FAILED_MESSAGE: "鍔犺浇鐢诲竷澶辫触",
  NO_CANVAS_ID_MESSAGE: "缂哄皯鐢诲竷 ID",
  UNTITLED_PROJECT_NAME: "鏈懡鍚嶉」鐩?",
  getCanvasImageFallbackName: vi.fn((index: number) => `鍙傝€冨浘 ${index}`),
  normalizeProjectDisplayName: vi.fn((name: string) => name || "鏈懡鍚嶉」鐩?"),
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
  EditableProjectName: (props: { initialName?: string }) => (
    <div data-testid="editable-project-name" data-initial-name={props.initialName ?? ""} />
  ),
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
        <div>鍥惧眰闈㈡澘宸叉墦寮€</div>
        <button type="button" onClick={props.onClose}>
          鍏抽棴鍥惧眰闈㈡澘
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
  ChatSidebar: (props: {
    initialPrompt?: string;
    immersive?: boolean;
    open?: boolean;
    panelTitle?: string;
    currentBrandKitId?: string | null;
  }) =>
    props.immersive && !props.open ? (
      <div
        data-testid="chat-sidebar-collapsed-composer"
        data-immersive={String(Boolean(props.immersive))}
        data-open={String(Boolean(props.open))}
        data-has-initial-prompt={String(Boolean(props.initialPrompt))}
      />
    ) : (
      <div
        data-testid="chat-sidebar"
        data-immersive={String(Boolean(props.immersive))}
        data-open={String(Boolean(props.open))}
        data-panel-title={props.panelTitle ?? ""}
        data-brand-kit-id={props.currentBrandKitId ?? ""}
      />
    ),
}));

import CanvasPage from "../src/app/canvas/page";

describe("CanvasPage shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsValue.current = "id=canvas-1&studio=architecture";
    fetchCanvasMock.mockResolvedValue({
      canvas: {
        id: "canvas-1",
        name: "Architecture Canvas",
        projectId: "project-1",
        project: {
          id: "project-1",
          name: "Harbor Studio",
          brandKitId: "brand-kit-1",
        },
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
    expect(fetchProjectMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("chat-sidebar")).toBeNull();
    expect(
      screen.getByTestId("chat-sidebar-collapsed-composer"),
    ).toBeTruthy();
    expect(
      screen.getByTestId("chat-sidebar-collapsed-composer"),
    ).toBeTruthy();
    expect(
      screen.getByTestId("canvas-editor").getAttribute("data-left-panel-open"),
    ).toBe("false");
    expect(
      screen.getByTestId("editable-project-name").getAttribute("data-initial-name"),
    ).toBe("Harbor Studio");

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
    expect(screen.getByText("鍥惧眰闈㈡澘宸叉墦寮€")).toBeTruthy();
    expect(
      screen.getByTestId("canvas-editor").getAttribute("data-left-panel-open"),
    ).toBe("true");

    await userEvent.click(
      screen.getByRole("button", { name: "鍏抽棴鍥惧眰闈㈡澘" }),
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
    expect(screen.queryByTestId("chat-sidebar")).toBeNull();

    await userEvent.click(recordButton);

    const chatSidebar = await screen.findByTestId("chat-sidebar");
    expect(recordButton.getAttribute("aria-pressed")).toBe("true");
    expect(chatSidebar.getAttribute("data-open")).toBe("true");
    expect(chatSidebar.getAttribute("data-immersive")).toBe("true");
    expect(chatSidebar.getAttribute("data-panel-title")).toBe("创作记录");
    expect(chatSidebar.getAttribute("data-brand-kit-id")).toBe("brand-kit-1");

    await userEvent.click(recordButton);

    expect(recordButton.getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByTestId("chat-sidebar")).toBeNull();
    expect(
      screen.getByTestId("chat-sidebar-collapsed-composer").getAttribute(
        "data-open",
      ),
    ).toBe("false");
  });

  it("mounts the chat sidebar immediately when the canvas URL carries an initial prompt", async () => {
    searchParamsValue.current =
      "id=canvas-1&studio=architecture&prompt=%E7%AB%8B%E5%8D%B3%E7%94%9F%E6%88%90";

    renderWithToast(<CanvasPage />);

    await waitFor(() => {
      expect(fetchCanvasMock).toHaveBeenCalledWith("token-canvas", "canvas-1");
    });

    const chatSidebar = await screen.findByTestId(
      "chat-sidebar-collapsed-composer",
    );
    expect(chatSidebar.getAttribute("data-open")).toBe("false");
    expect(chatSidebar.getAttribute("data-immersive")).toBe("true");
    expect(chatSidebar.getAttribute("data-has-initial-prompt")).toBe("true");
    expect(fetchProjectMock).not.toHaveBeenCalled();
  });
});
