// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArchitectureStudioEntry } from "../src/components/architecture/architecture-studio-entry";
import {
  ArchitectureAgentHeader,
  ArchitectureStudioCompactBar,
  ArchitectureStudioRail,
} from "../src/components/architecture/architecture-studio-rail";
import { ProjectList } from "../src/components/project-list";
import { deriveArchitectureContextFromScene, insertArchitectureBoardStackIntoScene } from "../src/lib/architecture-canvas";
import { buildCanvasUrl } from "../src/lib/studio-routes";

vi.mock("../src/hooks/use-delete-project", () => ({
  useDeleteProject: () => ({
    pendingId: null,
    deleting: false,
    requestDelete: vi.fn(),
    confirmDelete: vi.fn(),
    cancelDelete: vi.fn(),
  }),
}));

const workspace = {
  id: "w1",
  name: "Studio",
  type: "personal",
  ownerUserId: "u1",
} as const;

const project = {
  id: "p1",
  name: "Harbor Tower",
  slug: "harbor-tower",
  description: null,
  workspace,
  primaryCanvas: { id: "c1", name: "Main Canvas", isPrimary: true },
  createdAt: "2026-03-23T00:00:00Z",
  updatedAt: "2026-03-23T10:00:00Z",
};

describe("Architecture studio shell", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps architecture studio context when session-aware canvas urls are rebuilt", () => {
    const url = buildCanvasUrl("canvas-1", {
      prompt: "tower massing",
      sessionId: "session-1",
      studio: "architecture",
    });
    const parsed = new URL(url, "http://localhost");

    expect(parsed.pathname).toBe("/canvas");
    expect(parsed.searchParams.get("id")).toBe("canvas-1");
    expect(parsed.searchParams.get("prompt")).toBe("tower massing");
    expect(parsed.searchParams.get("session")).toBe("session-1");
    expect(parsed.searchParams.get("studio")).toBe("architecture");
  });

  it("renders the architecture entry card and fires the CTA", async () => {
    const onEnterStudio = vi.fn();
    render(
      <ArchitectureStudioEntry
        workspaceName="North Studio"
        onEnterStudio={onEnterStudio}
      />,
    );

    expect(screen.getByText(/architecture agent studio/i)).toBeInTheDocument();
    expect(screen.getByText(/reference board/i)).toBeInTheDocument();
    expect(screen.getByText(/workspace: North Studio/i)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /open architecture studio/i }),
    );

    expect(onEnterStudio).toHaveBeenCalledTimes(1);
  });

  it("renders the left rail with board stack and quick actions", async () => {
    const onOpenChat = vi.fn();
    const onToggleLayers = vi.fn();
    const onToggleFiles = vi.fn();
    const onSyncRemoteChanges = vi.fn();
    const onInsertBoard = vi.fn();
    const onInsertBoardStack = vi.fn();

    const seededScene = insertArchitectureBoardStackIntoScene({
      appState: {
        scrollX: 0,
        scrollY: 0,
        width: 1440,
        height: 900,
        zoom: { value: 1 },
      },
      elements: [],
    });
    const massingPlaceholder = seededScene.elements.find((element) => {
      const customData = element.customData as Record<string, unknown> | undefined;
      const architecture = customData?.architecture;
      if (!architecture || typeof architecture !== "object") return false;
      const metadata = architecture as Record<string, unknown>;
      return metadata.boardKind === "massing_options" && metadata.objectType === "massing_option";
    });
    const architectureContext = deriveArchitectureContextFromScene({
      elements: seededScene.elements,
      selectedElementIds: massingPlaceholder ? [massingPlaceholder.id] : [],
    });

    render(
      <ArchitectureStudioRail
        architectureContext={architectureContext}
        chatOpen={false}
        collaborators={[
          {
            connectionId: "conn-1",
            userId: "user-1",
            displayName: "Atlas Team",
            avatarUrl: null,
            color: "#CA8A04",
          },
          {
            connectionId: "conn-2",
            userId: "user-2",
            displayName: "Visualization Partner",
            avatarUrl: null,
            color: "#2563EB",
          },
          {
            connectionId: "conn-3",
            userId: "user-3",
            displayName: "Client Review",
            avatarUrl: null,
            color: "#16A34A",
          },
        ]}
        filesOpen={false}
        initialPrompt="Develop a waterfront mixed-use concept with a public podium."
        layersOpen={false}
        onInsertBoard={onInsertBoard}
        onInsertBoardStack={onInsertBoardStack}
        onOpenChat={onOpenChat}
        onSyncRemoteChanges={onSyncRemoteChanges}
        onToggleFiles={onToggleFiles}
        onToggleLayers={onToggleLayers}
        pendingRemoteMutation={{
          collaborator: {
            connectionId: "conn-1",
            userId: "user-1",
            displayName: "Atlas Team",
            avatarUrl: null,
            color: "#CA8A04",
          },
          elementCount: 4,
        }}
        projectName="Waterfront Studio"
        remoteSelections={[
          {
            collaborator: {
              connectionId: "conn-1",
              userId: "user-1",
              displayName: "Atlas Team",
              avatarUrl: null,
              color: "#CA8A04",
            },
            selectionCount: 2,
          },
        ]}
      />,
    );

    expect(screen.getByText("Waterfront Studio")).toBeInTheDocument();
    expect(screen.getByText(/site analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/video output/i)).toBeInTheDocument();
    expect(screen.getByText(/active board: massing options/i)).toBeInTheDocument();
    expect(screen.getByText(/3 live collaborators/i)).toBeInTheDocument();
    expect(screen.getByText(/remote changes available/i)).toBeInTheDocument();
    expect(screen.getByText(/atlas team synced 4 canvas items/i)).toBeInTheDocument();
    expect(screen.getByText(/selecting 2 canvas items/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /open agent/i }));
    await userEvent.click(screen.getByRole("button", { name: /open layers/i }));
    await userEvent.click(screen.getByRole("button", { name: /open files/i }));
    await userEvent.click(screen.getByRole("button", { name: /lay out studio/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /insert reference board/i }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /sync now/i }),
    );

    expect(onOpenChat).toHaveBeenCalledTimes(1);
    expect(onToggleLayers).toHaveBeenCalledTimes(1);
    expect(onToggleFiles).toHaveBeenCalledTimes(1);
    expect(onInsertBoardStack).toHaveBeenCalledTimes(1);
    expect(onInsertBoard).toHaveBeenCalledWith("reference_board");
    expect(onSyncRemoteChanges).toHaveBeenCalledTimes(1);
  });

  it("marks project links as architecture studio entries", () => {
    render(
      <ProjectList
        projects={[project]}
        onCreateClick={() => {}}
      />,
    );

    const projectLink = screen.getByRole("link", { name: /harbor tower/i });
    expect(projectLink).toHaveAttribute(
      "href",
      "/canvas?id=c1&studio=architecture",
    );
  });

  it("renders the compact agent header badge", () => {
    render(<ArchitectureAgentHeader />);

    expect(
      screen.getByText("\u5efa\u7b51\u4e0a\u4e0b\u6587\u5df2\u63a5\u5165"),
    ).toBeInTheDocument();
  });

  it("keeps the compact bar lightweight but exposes board stack insertion", async () => {
    const onInsertBoardStack = vi.fn();

    render(
      <ArchitectureStudioCompactBar
        collaborators={[]}
        filesOpen={false}
        layersOpen={false}
        onInsertBoardStack={onInsertBoardStack}
        onOpenChat={() => {}}
        onToggleFiles={() => {}}
        onToggleLayers={() => {}}
        projectName="Compact Studio"
      />,
    );

    expect(screen.getByText("建筑工作流")).toBeInTheDocument();
    expect(screen.queryByText("Compact Studio")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", {
        name: "\u63d2\u5165\u5efa\u7b51\u677f\u5757",
      }),
    );

    expect(onInsertBoardStack).toHaveBeenCalledTimes(1);
  });
});
