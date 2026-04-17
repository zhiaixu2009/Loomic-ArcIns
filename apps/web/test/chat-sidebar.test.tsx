// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WebSocketHandle } from "../src/hooks/use-websocket";
import {
  buildArchitectureTemplateSuggestions,
  ChatSidebar,
} from "../src/components/chat-sidebar";

const {
  createSessionMock,
  deleteSessionMock,
  fetchMessagesMock,
  fetchSessionsMock,
  saveMessageMock,
  updateSessionTitleMock,
} = vi.hoisted(() => ({
  createSessionMock: vi.fn(),
  deleteSessionMock: vi.fn(),
  fetchMessagesMock: vi.fn(),
  fetchSessionsMock: vi.fn(),
  saveMessageMock: vi.fn(),
  updateSessionTitleMock: vi.fn(),
}));

vi.mock("../src/lib/server-api", () => ({
  createSession: createSessionMock,
  deleteSession: deleteSessionMock,
  fetchBrandKit: vi.fn(() => Promise.resolve({ assets: [] })),
  fetchImageModels: vi.fn(() => Promise.resolve({ models: [] })),
  fetchMessages: fetchMessagesMock,
  fetchModels: vi.fn(() => Promise.resolve({ models: [] })),
  fetchSessions: fetchSessionsMock,
  fetchWorkspaceSkills: vi.fn(() => Promise.resolve({ skills: [] })),
  saveMessage: saveMessageMock,
  updateSessionTitle: updateSessionTitleMock,
}));

vi.mock("../src/components/credits/tier-limit-toast", () => ({
  useTierLimitToast: () => ({
    showTierLimit: vi.fn(),
  }),
}));

vi.mock("../src/components/toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("../src/hooks/use-breakpoint", () => ({
  useBreakpoint: () => "desktop",
}));

function createMockWs(): WebSocketHandle {
  return {
    connected: true,
    startRun: vi.fn((payload, onAck) => {
      // Simulate server ack
      onAck?.({
        type: "command.ack",
        action: "agent.run",
        payload: { runId: "run_123" },
      });
    }),
    cancelRun: vi.fn(),
    interruptRun: vi.fn(),
    resumeRun: vi.fn(),
    retryRun: vi.fn(),
    onEvent: vi.fn(() => () => {}),
    publishCanvasMutation: vi.fn(() => true),
    registerRPC: vi.fn(() => () => {}),
    resumeCanvas: vi.fn(),
    setPresence: vi.fn(() => true),
    updateCursor: vi.fn(() => true),
    updateSelection: vi.fn(() => true),
  };
}

function createGeneratedFilesApi(
  elements: Array<Record<string, unknown>> = [],
  files: Record<string, unknown> = {},
) {
  let currentElements = elements;
  let changeHandler: (() => void) | null = null;

  return {
    getSceneElements: () => currentElements,
    getFiles: () => files,
    onChange: vi.fn((handler: () => void) => {
      changeHandler = handler;
      return () => {
        if (changeHandler === handler) {
          changeHandler = null;
        }
      };
    }),
    setSceneElements(nextElements: Array<Record<string, unknown>>) {
      currentElements = nextElements;
      changeHandler?.();
    },
  };
}

describe("ChatSidebar", () => {
  let mockWs: WebSocketHandle;
  const architectureContext = {
    studio: "architecture",
    boards: [
      {
        boardId: "board_ref",
        kind: "reference_board",
        title: "Reference board",
        status: "active",
        elementIds: ["element_ref_1"],
        anchor: {
          x: 120,
          y: 80,
          width: 960,
          height: 540,
        },
        objectTypes: ["site_analysis"],
      },
    ],
    activeBoardId: "board_ref",
    selectedElementIds: ["element_ref_1"],
    objectTypesInSelection: ["site_analysis"],
    strategyOptions: [
      {
        optionId: "strategy_a",
        title: "Terraced podium",
        summary: "Use a public terrace to connect the street edge and tower lobby.",
        disposition: "selected",
      },
    ],
  };

  beforeEach(() => {
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    mockWs = createMockWs();
    createSessionMock.mockReset();
    createSessionMock.mockResolvedValue({
      session: {
        id: "session-created",
        title: "New Chat",
        updatedAt: "2026-03-24T00:00:00.000Z",
      },
    });
    deleteSessionMock.mockReset();
    fetchMessagesMock.mockReset();
    fetchMessagesMock.mockResolvedValue({ messages: [] });
    fetchSessionsMock.mockReset();
    fetchSessionsMock.mockResolvedValue({
      sessions: [
        {
          id: "session-real",
          title: "Existing Chat",
          updatedAt: "2026-03-24T00:00:00.000Z",
        },
      ],
    });
    saveMessageMock.mockReset();
    saveMessageMock.mockResolvedValue(undefined);
    updateSessionTitleMock.mockReset();
    updateSessionTitleMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("starts runs via WebSocket with the active real session id", async () => {
    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        open
        onToggle={() => {}}
        ws={mockWs}
      />,
    );

    const input = await screen.findByLabelText("输入消息");
    await userEvent.type(input, "hello loom{Enter}");

    await waitFor(() =>
      expect(mockWs.startRun).toHaveBeenCalledWith(
        expect.objectContaining({
          architectureContext,
          sessionId: "session-real",
          conversationId: "canvas-1",
          prompt: "hello loom",
          canvasId: "canvas-1",
        }),
        expect.any(Function),
      ),
    );
    expect(mockWs.startRun).not.toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-canvas-1",
      }),
      expect.anything(),
    );
  });

  it("includes the stored image output preference when starting an immersive run", async () => {
    localStorage.setItem(
      "loomic:image-output-preference",
      JSON.stringify({
        aspectRatio: "16:9",
        resolution: "4K",
      }),
    );

    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        ws={mockWs}
      />,
    );

    const input = await screen.findByLabelText("输入消息");
    await userEvent.type(input, "请生成黄昏鸟瞰图{Enter}");

    await waitFor(() =>
      expect(mockWs.startRun).toHaveBeenCalledWith(
        expect.objectContaining({
          imageOutputPreference: {
            aspectRatio: "16:9",
            resolution: "4K",
          },
        }),
        expect.any(Function),
      ),
    );
  });

  it("uses the caller-provided collapsed label when the sidebar is closed", () => {
    render(
      <ChatSidebar
        accessToken="token_abc"
        canvasId="canvas-1"
        open={false}
        collapsedLabel="Agent"
        onToggle={() => {}}
        ws={mockWs}
      />,
    );

    expect(
      screen.getByRole("button", { name: /agent/i }),
    ).toBeInTheDocument();
  });

  it("renders a bottom-floating composer shell when the immersive sidebar is collapsed on desktop", async () => {
    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open={false}
        onToggle={() => {}}
        panelTitle="创作记录"
        ws={mockWs}
      />,
    );

    expect(
      await screen.findByTestId("chat-sidebar-collapsed-composer"),
    ).toHaveAttribute("data-layout", "immersive-collapsed");
    expect(
      screen.getByTestId("chat-sidebar-collapsed-composer"),
    ).toHaveAttribute("data-composer-placement", "centered-bottom");
    expect(screen.getByLabelText("输入消息")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Banana Pro/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "创作记录" }),
    ).not.toBeInTheDocument();
  });

  it("preserves the immersive composer draft when toggling between collapsed and docked layouts", async () => {
    const { rerender } = render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open={false}
        onToggle={() => {}}
        panelTitle="鍒涗綔璁板綍"
        ws={mockWs}
      />,
    );

    const collapsedInput = await screen.findByLabelText(
      "\u8f93\u5165\u6d88\u606f",
    );
    await userEvent.type(collapsedInput, "保留这段创作草稿");
    expect(collapsedInput).toHaveValue("保留这段创作草稿");

    rerender(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        panelTitle="鍒涗綔璁板綍"
        ws={mockWs}
      />,
    );

    expect(
      await screen.findByLabelText("\u8f93\u5165\u6d88\u606f"),
    ).toHaveValue(
      "保留这段创作草稿",
    );

    rerender(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open={false}
        onToggle={() => {}}
        panelTitle="鍒涗綔璁板綍"
        ws={mockWs}
      />,
    );

    expect(
      await screen.findByLabelText("\u8f93\u5165\u6d88\u606f"),
    ).toHaveValue(
      "保留这段创作草稿",
    );
  });

  it("renders the architecture record shell instead of the legacy helper copy when the immersive panel is open", async () => {
    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        panelTitle="创作记录"
        ws={mockWs}
      />,
    );

    expect(await screen.findByText("创作记录")).toBeInTheDocument();
    expect(
      screen.getByText("个人创作记录只保留30天"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/围绕当前画布继续对话/),
    ).not.toBeInTheDocument();
  });

  it("renders and dismisses the immersive record notice without affecting the docked composer", async () => {
    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        panelTitle="创作记录"
        ws={mockWs}
      />,
    );

    expect(
      await screen.findByText(/由于使用稳定的 Banana Pro 服务成本持续提升/),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", {
        name: "我知道了",
      }),
    );

    expect(
      screen.queryByText(/由于使用稳定的 Banana Pro 服务成本持续提升/),
    ).not.toBeInTheDocument();
    expect(screen.getByText("创作记录")).toBeInTheDocument();
    expect(
      screen.getByTestId("chat-sidebar-docked-composer"),
    ).toHaveAttribute("data-composer-placement", "panel-bottom");
  });

  it("renders an immersive record card for attached canvas references and applies quick drafts", async () => {
    const onComposerCommandHandled = vi.fn();
    const generatedFilesApi = createGeneratedFilesApi();

    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        panelTitle="创作记录"
        composerCommand={{
          id: "command-record-card-attach-1",
          type: "attach-selection",
        }}
        onComposerCommandHandled={onComposerCommandHandled}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            storageUrl: "https://example.com/reference-1.png",
          },
        ]}
        generatedFilesApi={generatedFilesApi}
        ws={mockWs}
      />,
    );

    await waitFor(() =>
      expect(onComposerCommandHandled).toHaveBeenCalledWith(
        "command-record-card-attach-1",
      ),
    );

    const recordCard = await screen.findByTestId("chat-sidebar-record-card");
    expect(recordCard).toBeInTheDocument();
    expect(screen.getByText("画布参考图 1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "改为夜景" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "重新描述" }),
    ).toBeInTheDocument();
    expect(screen.getByText("图片生成：Banana Pro")).toBeInTheDocument();
    expect(within(recordCard).getByText("生成文件列表")).toBeInTheDocument();
    expect(within(recordCard).getByText("加载中...")).toBeInTheDocument();
    expect(
      screen.queryByTestId("canvas-files-panel-embedded"),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "改为夜景" }));

    await waitFor(() =>
      expect(
        (screen.getByLabelText("输入消息") as HTMLTextAreaElement).value,
      ).toContain("夜景"),
    );
  });

  it("creates a persistent immersive record entry after sending selected references and marks it completed once generated files arrive", async () => {
    const generatedFilesApi = createGeneratedFilesApi();
    const selectedCanvasElements = [
      {
        id: "image-1",
        type: "image" as const,
        x: 0,
        y: 0,
        width: 640,
        height: 480,
        fileId: "file-1",
        storageUrl: "https://example.com/reference-1.png",
      },
    ];
    const { rerender } = render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        panelTitle="鍒涗綔璁板綍"
        selectedCanvasElements={selectedCanvasElements}
        generatedFilesApi={generatedFilesApi}
        ws={mockWs}
      />,
    );

    const input = await screen.findByLabelText("\u8f93\u5165\u6d88\u606f");
    await userEvent.type(input, "请基于参考图改为夜景效果图{Enter}");

    await waitFor(() => expect(mockWs.startRun).toHaveBeenCalled());

    expect(await screen.findByTestId("chat-sidebar-record-item")).toBeInTheDocument();
    expect(screen.getByText("待生成")).toBeInTheDocument();
    expect(
      screen.getAllByText("请基于参考图改为夜景效果图").length,
    ).toBeGreaterThan(0);

    rerender(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        panelTitle="鍒涗綔璁板綍"
        selectedCanvasElements={[]}
        generatedFilesApi={generatedFilesApi}
        ws={mockWs}
      />,
    );

    expect(await screen.findByTestId("chat-sidebar-record-item")).toBeInTheDocument();
    expect(screen.getByText("待生成")).toBeInTheDocument();

    generatedFilesApi.setSceneElements([
      {
        id: "generated-1",
        type: "image",
        isDeleted: false,
        customData: { source: "generated" },
      },
    ]);

    await waitFor(() => {
      const recordItem = screen.getByTestId("chat-sidebar-record-item");
      expect(within(recordItem).getAllByText("已生成 1 个文件")).toHaveLength(2);
    });
  });

  it("keeps the collapsed immersive composer reactive to attach-selection commands", async () => {
    const onComposerCommandHandled = vi.fn();

    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open={false}
        onToggle={() => {}}
        panelTitle="创作记录"
        composerCommand={{
          id: "command-collapsed-attach-1",
          type: "attach-selection",
        }}
        onComposerCommandHandled={onComposerCommandHandled}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            storageUrl: "https://example.com/reference-1.png",
          },
        ]}
        ws={mockWs}
      />,
    );

    await waitFor(() =>
      expect(onComposerCommandHandled).toHaveBeenCalledWith(
        "command-collapsed-attach-1",
      ),
    );

    expect(
      await screen.findByPlaceholderText(
        "已接入对话参考图，继续描述希望保留或改动的内容",
      ),
    ).toBeInTheDocument();
  });

  it("renders as an immersive overlay on desktop when requested", async () => {
    render(
      <ChatSidebar
        accessToken="token_abc"
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        ws={mockWs}
      />,
    );

    expect(await screen.findByTestId("chat-sidebar-panel")).toHaveAttribute(
      "data-layout",
      "immersive",
    );
    expect(
      screen.getByTestId("chat-sidebar-docked-composer"),
    ).toHaveAttribute("data-composer-placement", "panel-bottom");
    expect(
      screen.queryByRole("separator", { name: /resize chat panel/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps pending canvas refs transient until the composer input is focused", async () => {
    const { rerender } = render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            storageUrl: "https://example.com/reference-1.png",
          },
          {
            id: "image-2",
            type: "image",
            x: 40,
            y: 20,
            width: 640,
            height: 480,
            fileId: "file-2",
            storageUrl: "https://example.com/reference-2.png",
          },
        ]}
        ws={mockWs}
      />,
    );

    expect(
      await screen.findByAltText("参考图 1"),
    ).toBeInTheDocument();
    expect(screen.queryByAltText("画布参考图 1")).not.toBeInTheDocument();

    rerender(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        selectedCanvasElements={[]}
        ws={mockWs}
      />,
    );

    expect(
      screen.queryByAltText("参考图 1"),
    ).not.toBeInTheDocument();
  });

  it("confirms selected canvas refs on input focus and keeps them until manually removed", async () => {
    const { rerender } = render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            storageUrl: "https://example.com/reference-1.png",
          },
        ]}
        ws={mockWs}
      />,
    );

    await userEvent.click(await screen.findByLabelText("\u8f93\u5165\u6d88\u606f"));

    expect(
      await screen.findByPlaceholderText(
        "\u5df2\u63a5\u5165\u5bf9\u8bdd\u53c2\u8003\u56fe\uff0c\u7ee7\u7eed\u63cf\u8ff0\u5e0c\u671b\u4fdd\u7559\u6216\u6539\u52a8\u7684\u5185\u5bb9",
      ),
    ).toBeInTheDocument();
    expect(screen.getByAltText("画布参考图 1")).toBeInTheDocument();

    rerender(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        selectedCanvasElements={[]}
        ws={mockWs}
      />,
    );

    expect(screen.getByAltText("画布参考图 1")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "移除附件 1" }),
    );

    expect(screen.queryByAltText("画布参考图 1")).not.toBeInTheDocument();
  });

  it("reorders the selected multi-image references before sending so AI receives the adjusted input order", async () => {
    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        open
        onToggle={() => {}}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            storageUrl: "https://example.com/reference-1.png",
          },
          {
            id: "image-2",
            type: "image",
            x: 40,
            y: 20,
            width: 640,
            height: 480,
            fileId: "file-2",
            storageUrl: "https://example.com/reference-2.png",
          },
        ]}
        ws={mockWs}
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", {
        name: "\u5c06\u53c2\u8003\u56fe 1 \u5411\u540e\u79fb\u52a8",
      }),
    );

    await userEvent.type(
      screen.getByLabelText("\u8f93\u5165\u6d88\u606f"),
      "\u8bf7\u63d0\u70bc\u8fd9\u7ec4\u65b9\u6848\u7684\u7acb\u9762\u5171\u540c\u8bed\u8a00{Enter}",
    );

    await waitFor(() => expect(mockWs.startRun).toHaveBeenCalled());

    expect(
      mockWs.startRun.mock.calls.at(-1)?.[0]?.attachments?.map(
        (attachment: { assetId: string }) => attachment.assetId,
      ),
    ).toEqual(["image-2", "image-1"]);
  });

  it("lets the user dismiss one pending selected ref without clearing the remaining canvas-input order", async () => {
    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        open
        onToggle={() => {}}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            storageUrl: "https://example.com/reference-1.png",
          },
          {
            id: "image-2",
            type: "image",
            x: 40,
            y: 20,
            width: 640,
            height: 480,
            fileId: "file-2",
            storageUrl: "https://example.com/reference-2.png",
          },
        ]}
        ws={mockWs}
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", {
        name: "\u79fb\u9664\u5f85\u9009\u53c2\u8003\u56fe 1",
      }),
    );

    expect(screen.getAllByAltText(/参考图 /i)).toHaveLength(1);

    await userEvent.type(
      screen.getByLabelText("\u8f93\u5165\u6d88\u606f"),
      "\u53ea\u4f7f\u7528\u5269\u4f59\u53c2\u8003\u56fe\u751f\u6210{Enter}",
    );

    await waitFor(() => expect(mockWs.startRun).toHaveBeenCalled());

    expect(
      mockWs.startRun.mock.calls.at(-1)?.[0]?.attachments?.map(
        (attachment: { assetId: string }) => attachment.assetId,
      ),
    ).toEqual(["image-2"]);
  });

  it("consumes an external attach-selection command and keeps the confirmed refs after deselection", async () => {
    const onComposerCommandHandled = vi.fn();
    const { rerender } = render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        composerCommand={{
          id: "command-attach-1",
          type: "attach-selection",
        }}
        onComposerCommandHandled={onComposerCommandHandled}
        open
        onToggle={() => {}}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            storageUrl: "https://example.com/reference-1.png",
          },
          {
            id: "image-2",
            type: "image",
            x: 40,
            y: 20,
            width: 640,
            height: 480,
            fileId: "file-2",
            storageUrl: "https://example.com/reference-2.png",
          },
        ]}
        ws={mockWs}
      />,
    );

    await waitFor(() =>
      expect(onComposerCommandHandled).toHaveBeenCalledWith("command-attach-1"),
    );

    rerender(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        open
        onToggle={() => {}}
        selectedCanvasElements={[]}
        ws={mockWs}
      />,
    );

    expect(
      screen.getByPlaceholderText(
        "\u5df2\u63a5\u5165\u5bf9\u8bdd\u53c2\u8003\u56fe\uff0c\u7ee7\u7eed\u63cf\u8ff0\u5e0c\u671b\u4fdd\u7559\u6216\u6539\u52a8\u7684\u5185\u5bb9",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByAltText(/画布参考图/i).length).toBeGreaterThan(0);
  });

  it("consumes an external apply-template command and injects the draft into the input", async () => {
    const onComposerCommandHandled = vi.fn();

    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        composerCommand={{
          id: "command-template-1",
          type: "apply-template",
          prompt:
            "\u8bf7\u57fa\u4e8e\u8fd9\u7ec4\u53c2\u8003\u56fe\u63d0\u70bc\u5171\u540c\u7684\u7acb\u9762\u8bed\u8a00\uff0c\u8f93\u51fa\u4e00\u4efd\u5408\u5e76\u63d0\u793a\u3002",
          attachSelection: true,
        }}
        onComposerCommandHandled={onComposerCommandHandled}
        open
        onToggle={() => {}}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            storageUrl: "https://example.com/reference-1.png",
          },
        ]}
        ws={mockWs}
      />,
    );

    expect(
      await screen.findByDisplayValue(
        "\u8bf7\u57fa\u4e8e\u8fd9\u7ec4\u53c2\u8003\u56fe\u63d0\u70bc\u5171\u540c\u7684\u7acb\u9762\u8bed\u8a00\uff0c\u8f93\u51fa\u4e00\u4efd\u5408\u5e76\u63d0\u793a\u3002",
      ),
    ).toBeInTheDocument();
    expect(onComposerCommandHandled).toHaveBeenCalledWith("command-template-1");
  });

  it("shows architecture-specific quick actions in the empty state", async () => {
    render(
      <ChatSidebar
        accessToken="token_abc"
        canvasId="canvas-1"
        open
        onToggle={() => {}}
        ws={mockWs}
      />,
    );

    expect(
      await screen.findByText("\u8bd5\u8bd5\u8fd9\u4e9b\u5efa\u7b51\u521b\u4f5c\u6377\u5f84"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "\u573a\u5730\u5206\u6790" }),
    ).toBeInTheDocument();
  });

  it("renders the latest agent plan above the transcript and retries from it", async () => {
    fetchMessagesMock.mockResolvedValue({
      messages: [
        {
          id: "message-user-1",
          role: "user",
          content: "Create an architectural concept board",
          contentBlocks: [
            {
              type: "text",
              text: "Create an architectural concept board",
            },
          ],
          createdAt: "2026-04-13T06:00:00.000Z",
        },
        {
          id: "message-assistant-1",
          role: "assistant",
          content: "",
          contentBlocks: [
            {
              type: "agent-plan",
              plan: {
                planId: "plan_123",
                runId: "run_plan_123",
                goal: "Create an architectural concept board",
                status: "interrupted",
                availableActions: ["resume", "retry"],
                updatedAt: "2026-04-13T06:00:03.000Z",
                steps: [
                  {
                    stepId: "step_1",
                    title: "Review canvas context",
                    status: "completed",
                    toolCallIds: ["tool_1"],
                    artifactCount: 0,
                    lastUpdatedAt: "2026-04-13T06:00:01.000Z",
                  },
                  {
                    stepId: "step_2",
                    title: "Generate first facade direction",
                    status: "interrupted",
                    toolCallIds: ["tool_2"],
                    artifactCount: 1,
                    lastUpdatedAt: "2026-04-13T06:00:03.000Z",
                  },
                ],
              },
              interrupt: {
                runId: "run_plan_123",
                reason: "user",
                message: "Paused by designer",
                interruptedAt: "2026-04-13T06:00:03.000Z",
              },
            },
          ],
          createdAt: "2026-04-13T06:00:03.000Z",
        },
      ],
    });

    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        open
        onToggle={() => {}}
        ws={mockWs}
      />,
    );

    expect(
      await screen.findByText(/review canvas context/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/generate first facade direction/i),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(mockWs.retryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        architectureContext,
        sourceRunId: "run_plan_123",
        sessionId: "session-real",
        conversationId: "canvas-1",
        canvasId: "canvas-1",
        prompt: expect.any(String),
      }),
      expect.any(Function),
    );
  });

  it("interrupts the active plan from the panel", async () => {
    fetchMessagesMock.mockResolvedValue({
      messages: [
        {
          id: "message-user-1",
          role: "user",
          content: "Create an architectural concept board",
          contentBlocks: [
            {
              type: "text",
              text: "Create an architectural concept board",
            },
          ],
          createdAt: "2026-04-13T06:00:00.000Z",
        },
        {
          id: "message-assistant-1",
          role: "assistant",
          content: "",
          contentBlocks: [
            {
              type: "agent-plan",
              plan: {
                planId: "plan_running_123",
                runId: "run_running_123",
                goal: "Create an architectural concept board",
                status: "running",
                availableActions: ["interrupt"],
                updatedAt: "2026-04-13T06:00:03.000Z",
                steps: [
                  {
                    stepId: "step_1",
                    title: "Review canvas context",
                    status: "completed",
                    toolCallIds: ["tool_1"],
                    artifactCount: 0,
                    lastUpdatedAt: "2026-04-13T06:00:01.000Z",
                  },
                  {
                    stepId: "step_2",
                    title: "Generate first facade direction",
                    status: "running",
                    toolCallIds: ["tool_2"],
                    artifactCount: 1,
                    lastUpdatedAt: "2026-04-13T06:00:03.000Z",
                  },
                ],
              },
            },
          ],
          createdAt: "2026-04-13T06:00:03.000Z",
        },
      ],
    });

    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        open
        onToggle={() => {}}
        ws={mockWs}
      />,
    );

    expect(
      await screen.findByText(/generate first facade direction/i),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /interrupt/i }));

    expect(mockWs.interruptRun).toHaveBeenCalledWith("run_running_123");
  });

  it("resumes the interrupted plan from the panel", async () => {
    fetchMessagesMock.mockResolvedValue({
      messages: [
        {
          id: "message-user-1",
          role: "user",
          content: "Create an architectural concept board",
          contentBlocks: [
            {
              type: "text",
              text: "Create an architectural concept board",
            },
          ],
          createdAt: "2026-04-13T06:00:00.000Z",
        },
        {
          id: "message-assistant-1",
          role: "assistant",
          content: "",
          contentBlocks: [
            {
              type: "agent-plan",
              plan: {
                planId: "plan_resume_123",
                runId: "run_resume_123",
                goal: "Create an architectural concept board",
                status: "interrupted",
                availableActions: ["resume", "retry"],
                updatedAt: "2026-04-13T06:00:03.000Z",
                steps: [
                  {
                    stepId: "step_1",
                    title: "Review canvas context",
                    status: "completed",
                    toolCallIds: ["tool_1"],
                    artifactCount: 0,
                    lastUpdatedAt: "2026-04-13T06:00:01.000Z",
                  },
                  {
                    stepId: "step_2",
                    title: "Generate first facade direction",
                    status: "interrupted",
                    toolCallIds: ["tool_2"],
                    artifactCount: 1,
                    lastUpdatedAt: "2026-04-13T06:00:03.000Z",
                  },
                ],
              },
              interrupt: {
                runId: "run_resume_123",
                reason: "user",
                message: "Paused by designer",
                interruptedAt: "2026-04-13T06:00:03.000Z",
              },
            },
          ],
          createdAt: "2026-04-13T06:00:03.000Z",
        },
      ],
    });

    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        open
        onToggle={() => {}}
        ws={mockWs}
      />,
    );

    expect(
      await screen.findByText(/review canvas context/i),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /resume/i }));

    expect(mockWs.resumeRun).toHaveBeenCalledWith(
      expect.objectContaining({
        architectureContext,
        sourceRunId: "run_resume_123",
        sessionId: "session-real",
        conversationId: "canvas-1",
        canvasId: "canvas-1",
        prompt: expect.any(String),
        plan: expect.objectContaining({
          planId: "plan_resume_123",
          runId: "run_resume_123",
        }),
      }),
      expect.any(Function),
    );
  });
  it("renders a visible collapse control in the immersive record header", async () => {
    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        panelTitle="创作记录"
        ws={mockWs}
      />,
    );

    expect(
      await screen.findByRole("button", { name: "收起" }),
    ).toBeInTheDocument();
  });

  it("renders the audited icon-only header cluster in the immersive record panel", async () => {
    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        panelTitle="创作记录"
        generatedFilesApi={createGeneratedFilesApi()}
        ws={mockWs}
      />,
    );

    expect(
      await screen.findByRole("button", { name: "\u6dfb\u52a0\u5bf9\u8bdd" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "\u5386\u53f2\u5bf9\u8bdd" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "\u6587\u4ef6\u5217\u8868" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "\u6536\u8d77" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("\u6536\u8d77")).not.toBeInTheDocument();
  });

  it("renders the audited history popover in the immersive record header", async () => {
    fetchSessionsMock.mockResolvedValueOnce({
      sessions: [
        {
          id: "session-night",
          title: "改为夜景",
          updatedAt: "2026-03-24T00:00:00.000Z",
        },
        {
          id: "session-day",
          title: "日景方案",
          updatedAt: "2026-03-23T00:00:00.000Z",
        },
      ],
    });

    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        panelTitle="创作记录"
        generatedFilesApi={createGeneratedFilesApi()}
        ws={mockWs}
      />,
    );

    const historyButton = await screen.findByRole("button", {
      name: "\u5386\u53f2\u5bf9\u8bdd",
    });
    await userEvent.hover(historyButton);

    const popover = await screen.findByRole("tooltip");
    expect(within(popover).getByText("\u5386\u53f2\u5bf9\u8bdd")).toBeInTheDocument();
    expect(within(popover).getByText("\u6539\u4e3a\u591c\u666f")).toBeInTheDocument();
  });

  it("switches the immersive record body into the audited welcome empty state after add dialog", async () => {
    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        panelTitle="创作记录"
        generatedFilesApi={createGeneratedFilesApi()}
        ws={mockWs}
      />,
    );

    expect(
      screen.queryByText("在下方输入你的创意来生成图片吧"),
    ).not.toBeInTheDocument();

    await userEvent.click(
      await screen.findByRole("button", { name: "添加对话" }),
    );

    expect(createSessionMock).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText("在下方输入你的创意来生成图片吧"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("chat-sidebar-docked-composer")).toBeInTheDocument();
  });

  it("opens the audited generated-file dock without replacing the immersive record panel", async () => {
    render(
      <ChatSidebar
        accessToken="token_abc"
        architectureContext={architectureContext as any}
        canvasId="canvas-1"
        immersive
        open
        onToggle={() => {}}
        panelTitle="创作记录"
        generatedFilesApi={createGeneratedFilesApi(
          [
            {
              id: "generated-1",
              type: "image",
              fileId: "file-generated-1",
              isDeleted: false,
              customData: {
                source: "generated",
                title: "夜景效果图",
              },
            },
          ],
          {
            "file-generated-1": {
              dataURL: "data:image/png;base64,generated-file-1",
            },
          },
        )}
        ws={mockWs}
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "\u6587\u4ef6\u5217\u8868" }),
    );

    expect(
      await screen.findByTestId("canvas-files-panel-docked"),
    ).toBeInTheDocument();
    expect(screen.getByText("\u751f\u6210\u6587\u4ef6\u5217\u8868")).toBeInTheDocument();
    expect(screen.getByText("\u6ca1\u6709\u66f4\u591a\u4e86")).toBeInTheDocument();
    expect(screen.getByText("\u591c\u666f\u6548\u679c\u56fe")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭生成文件列表" })).toBeInTheDocument();
    expect(screen.getByTestId("chat-sidebar-docked-composer")).toBeInTheDocument();
    expect(screen.queryByTestId("chat-sidebar-floating-composer")).not.toBeInTheDocument();
  });

  it("does not double count an already attached canvas reference when building architecture templates", () => {
    const suggestions = buildArchitectureTemplateSuggestions({
      architectureContext: architectureContext as any,
      selectedCanvasElements: [
        {
          id: "image-1",
          type: "image",
          x: 0,
          y: 0,
          width: 640,
          height: 480,
          fileId: "file-1",
          storageUrl: "https://example.com/reference-1.png",
        },
      ],
      attachments: [
        {
          assetId: "image-1",
          url: "https://example.com/reference-1.png",
          mimeType: "image/png",
          source: "canvas-ref",
          name: "reference-1.png",
        },
      ],
    });

    expect(suggestions[0]?.id).toBe("reference-extract");
    expect(suggestions[0]?.categoryLabel).toBe("\u6548\u679c\u6e32\u67d3");
  });
});
