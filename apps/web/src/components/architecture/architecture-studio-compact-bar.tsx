"use client";

import type { CanvasCollaborator } from "@loomic/shared";

import { ARCHITECTURE_BOARD_KINDS } from "@/lib/architecture-canvas";
import { cn } from "@/lib/utils";

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

function CompactActionButton({
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

export function ArchitectureStudioCompactBar({
  collaborators = [],
  filesOpen,
  layersOpen,
  onInsertBoardStack,
  onOpenChat,
  onToggleFiles,
  onToggleLayers,
  projectName: _projectName,
}: ArchitectureStudioCompactBarProps) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-20 w-[min(860px,calc(100%-8rem))] -translate-x-1/2 max-md:left-4 max-md:right-20 max-md:w-auto max-md:translate-x-0">
      <div className="pointer-events-auto rounded-[28px] border border-border/70 bg-card/82 p-3 shadow-[0_24px_72px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              建筑工作流
            </p>
            <p className="text-xs text-muted-foreground">
              让板块、图层与智能体围绕同一张画布协同推进
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
          <CompactActionButton label="打开智能体" onClick={onOpenChat} />
          <CompactActionButton
            label="插入建筑板块"
            onClick={onInsertBoardStack}
          />
          <CompactActionButton
            active={layersOpen}
            label={layersOpen ? "图层已开" : "图层"}
            onClick={onToggleLayers}
          />
          <CompactActionButton
            active={filesOpen}
            label={filesOpen ? "文件已开" : "文件"}
            onClick={onToggleFiles}
          />
        </div>
      </div>
    </div>
  );
}
