"use client";

import type { CanvasCollaborator } from "@loomic/shared";
import {
  Bot,
  Clapperboard,
  FolderKanban,
  ImageIcon,
  Layers3,
  Map,
  PanelsTopLeft,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  ARCHITECTURE_BOARD_KINDS,
  ARCHITECTURE_BOARD_TEMPLATES,
  type ArchitectureBoardKind,
  type ArchitectureContext,
} from "@/lib/architecture-canvas";
import { cn } from "@/lib/utils";
import {
  ArchitectureExportCard,
  type ArchitectureExportActionState,
} from "./architecture-export-card";
import { ArchitectureStudioCompactBar } from "./architecture-studio-compact-bar";

const BOARD_ICON_BY_KIND: Record<ArchitectureBoardKind, LucideIcon> = {
  reference_board: FolderKanban,
  site_analysis: Map,
  massing_options: Layers3,
  render_variations: ImageIcon,
  storyboard_shots: Clapperboard,
  video_output: Video,
};

const BOARD_STATUS_STYLES: Record<
  NonNullable<ArchitectureContext["boards"][number]["status"]>,
  string
> = {
  missing: "bg-muted text-muted-foreground",
  seeded: "bg-amber-100 text-amber-900",
  active: "bg-emerald-100 text-emerald-900",
};

type ArchitectureStudioRailProps = {
  architectureContext: ArchitectureContext;
  chatOpen: boolean;
  collaborators?: CanvasCollaborator[];
  filesOpen: boolean;
  initialPrompt?: string | undefined;
  layersOpen: boolean;
  onInsertBoard: (boardKind: ArchitectureBoardKind) => void;
  onInsertBoardStack: () => void;
  onDownloadExportManifest?: () => void;
  onDownloadReviewPackage?: () => void;
  onOpenChat: () => void;
  onShareSnapshot?: () => void;
  onSyncRemoteChanges?: () => void;
  onToggleFiles: () => void;
  onToggleLayers: () => void;
  exportActionState?: ArchitectureExportActionState;
  lastSnapshotUrl?: string | null;
  pendingRemoteMutation?: {
    collaborator: CanvasCollaborator;
    elementCount: number;
  } | null;
  projectName: string;
  remoteSelections?: Array<{
    collaborator: CanvasCollaborator;
    selectionCount: number;
  }>;
};

type ArchitectureStudioCompactBarProps = {
  collaborators?: CanvasCollaborator[];
  filesOpen: boolean;
  layersOpen: boolean;
  onInsertBoardStack: () => void;
  onOpenChat: () => void;
  onToggleFiles: () => void;
  onToggleLayers: () => void;
  projectName: string;
};

function summarizePrompt(initialPrompt?: string) {
  if (!initialPrompt?.trim()) {
    return "Start from a building brief, references, or a review goal. The studio keeps all boards in one living canvas scene.";
  }

  return initialPrompt.length > 160
    ? `${initialPrompt.slice(0, 157)}...`
    : initialPrompt;
}

function RailActionButton({
  active,
  label,
  onClick,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background/75 text-foreground hover:bg-background",
      )}
    >
      {label}
    </button>
  );
}

export function ArchitectureStudioRail({
  architectureContext,
  chatOpen,
  collaborators = [],
  filesOpen,
  initialPrompt,
  layersOpen,
  onInsertBoard,
  onInsertBoardStack,
  onDownloadExportManifest,
  onDownloadReviewPackage,
  onOpenChat,
  onShareSnapshot,
  onSyncRemoteChanges,
  onToggleFiles,
  onToggleLayers,
  exportActionState,
  lastSnapshotUrl,
  pendingRemoteMutation,
  projectName,
  remoteSelections = [],
}: ArchitectureStudioRailProps) {
  const seededBoardCount = architectureContext.boards.filter(
    (board) => board.status !== "missing",
  ).length;
  const activeBoard = architectureContext.boards.find(
    (board) => board.status === "active",
  );

  return (
    <aside
      className="hidden h-screen w-[320px] shrink-0 border-r border-border/70 bg-[linear-gradient(180deg,rgba(245,241,234,0.96),rgba(252,249,244,0.9))] xl:flex xl:flex-col"
      data-testid="architecture-studio-rail"
    >
      <div className="border-b border-border/70 px-5 pb-5 pt-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          <PanelsTopLeft className="h-3.5 w-3.5 text-foreground" />
          Architecture Studio
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
          {projectName}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {summarizePrompt(initialPrompt)}
        </p>
      </div>

      <div className="border-b border-border/70 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <RailActionButton
            active={chatOpen}
            label={chatOpen ? "Agent open" : "Open agent"}
            onClick={onOpenChat}
          />
          <RailActionButton
            active={layersOpen}
            label={layersOpen ? "Layers open" : "Open layers"}
            onClick={onToggleLayers}
          />
          <RailActionButton
            active={filesOpen}
            label={filesOpen ? "Files open" : "Open files"}
            onClick={onToggleFiles}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Board stack
          </p>
          <span className="rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground">
            {seededBoardCount}/{ARCHITECTURE_BOARD_KINDS.length} seeded
          </span>
        </div>

        <div className="mb-4 space-y-2">
          <button
            type="button"
            onClick={onInsertBoardStack}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-border bg-background/80 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            Lay out studio
          </button>
          <p className="text-xs text-muted-foreground">
            {activeBoard
              ? `Active board: ${activeBoard.title}`
              : "Select a board element to make it active in context."}
          </p>
        </div>

        <div className="space-y-3">
          {architectureContext.boards.map((board) => {
            const template = ARCHITECTURE_BOARD_TEMPLATES[board.kind];
            const Icon = BOARD_ICON_BY_KIND[board.kind];
            const boardLabel = template.title.toLowerCase();

            return (
              <article
                key={board.kind}
                className="rounded-[22px] border border-border/60 bg-background/80 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {template.title}
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em]",
                      BOARD_STATUS_STYLES[board.status],
                    )}
                  >
                    {board.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {template.subtitle}
                </p>
                <button
                  type="button"
                  onClick={() => onInsertBoard(board.kind)}
                  aria-label={`Insert ${boardLabel}`}
                  className="mt-3 inline-flex min-h-9 items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {board.status === "missing" ? "Insert board" : "Insert again"}
                </button>
              </article>
            );
          })}
        </div>

        {onShareSnapshot && onDownloadReviewPackage && onDownloadExportManifest ? (
          <ArchitectureExportCard
            actionState={exportActionState ?? { status: "idle" }}
            lastSnapshotUrl={lastSnapshotUrl}
            onDownloadExportManifest={onDownloadExportManifest}
            onDownloadReviewPackage={onDownloadReviewPackage}
            onShareSnapshot={onShareSnapshot}
          />
        ) : null}

        <div className="mt-4 rounded-[22px] border border-border/60 bg-background/70 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Bot className="h-4 w-4 text-muted-foreground" />
              Live collaboration
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">
              {collaborators.length} live collaborators
            </span>
          </div>

          {pendingRemoteMutation ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-3 text-sm text-amber-950">
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                Remote changes available
              </p>
              <p className="font-medium">
                {pendingRemoteMutation.collaborator.displayName} synced{" "}
                {pendingRemoteMutation.elementCount} canvas items.
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-900/80">
                Pull the latest remote save when you are ready. Local unsynced edits stay in place until you sync.
              </p>
              {onSyncRemoteChanges ? (
                <button
                  type="button"
                  onClick={onSyncRemoteChanges}
                  className="mt-3 inline-flex items-center rounded-full border border-amber-300 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-amber-100/70"
                >
                  Sync now
                </button>
              ) : null}
            </div>
          ) : null}

          {collaborators.length > 0 ? (
            <div className="mt-3 space-y-2">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.connectionId}
                  className="flex items-center justify-between rounded-2xl border border-border/50 bg-card/70 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: collaborator.color }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {collaborator.displayName}
                    </span>
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    present
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              No other collaborators are on this canvas yet. Presence, selections, and remote saves will appear here live.
            </p>
          )}

          {remoteSelections.length > 0 ? (
            <div className="mt-3 space-y-2">
              {remoteSelections.map((entry) => (
                <div
                  key={entry.collaborator.connectionId}
                  className="rounded-2xl border border-dashed border-border bg-background/60 px-3 py-2"
                >
                  <p className="text-sm font-medium text-foreground">
                    {entry.collaborator.displayName}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    selecting {entry.selectionCount} canvas item{entry.selectionCount === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function LegacyArchitectureStudioCompactBar({
  collaborators = [],
  filesOpen,
  layersOpen,
  onInsertBoardStack,
  onOpenChat,
  onToggleFiles,
  onToggleLayers,
  projectName,
}: ArchitectureStudioCompactBarProps) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-20 w-[min(820px,calc(100%-10rem))] -translate-x-1/2 max-md:left-4 max-md:right-20 max-md:w-auto max-md:translate-x-0">
      <div className="pointer-events-auto rounded-[26px] border border-border/70 bg-card/88 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              建筑工作台
            </p>
            <p className="truncate text-sm font-medium text-foreground">
              {projectName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">
              {ARCHITECTURE_BOARD_KINDS.length} 个板块
            </span>
            <span className="rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground">
              {collaborators.length} 人在线
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <RailActionButton label="打开智能体" onClick={onOpenChat} />
          <RailActionButton label="铺开建筑板块" onClick={onInsertBoardStack} />
          <RailActionButton
            active={layersOpen}
            label={layersOpen ? "图层已开" : "图层"}
            onClick={onToggleLayers}
          />
          <RailActionButton
            active={filesOpen}
            label={filesOpen ? "文件已开" : "文件"}
            onClick={onToggleFiles}
          />
        </div>
      </div>
    </div>
  );
}

export { ArchitectureStudioCompactBar };

export function ArchitectureAgentHeader() {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
      <Bot className="h-3.5 w-3.5 text-foreground" />
      建筑上下文已接入
    </div>
  );
}
