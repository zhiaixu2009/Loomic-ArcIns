"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { CanvasContextMenuMode } from "../../lib/canvas-context-actions";

export type CanvasContextMenuAction = {
  id: string;
  label: string;
  description?: string;
  danger?: boolean;
  dividerBefore?: boolean;
  onSelect: () => void;
};

type CanvasContextMenuProps = {
  open: boolean;
  mode: CanvasContextMenuMode;
  position: {
    x: number;
    y: number;
  };
  actions: CanvasContextMenuAction[];
  onClose: () => void;
};

const MODE_LABELS: Record<CanvasContextMenuMode, string> = {
  blank: "空白画布菜单",
  selection: "选区菜单",
  "single-image": "图片菜单",
  "multi-image": "多图菜单",
};

const ACTION_GROUP_BY_ID: Record<string, string> = {
  "copy-selection": "clipboard",
  "paste-selection": "clipboard",
  "move-forward": "layer",
  "move-backward": "layer",
  "move-front": "layer",
  "move-back": "layer",
  "attach-selection": "conversation",
  "group-selection": "composition",
  "ungroup-selection": "composition",
  "merge-selection": "composition",
  "toggle-visibility": "state",
  "lock-selection": "state",
  "unlock-selection": "state",
  "show-all-elements": "view",
  "export-canvas": "file",
  "import-canvas": "file",
  "export-selection": "file",
  "delete-selection": "destructive",
};

function getActionGroup(action: CanvasContextMenuAction) {
  if (action.danger) {
    return "destructive";
  }

  return ACTION_GROUP_BY_ID[action.id] ?? `action:${action.id}`;
}

function shouldRenderActionSeparator(
  action: CanvasContextMenuAction,
  previousAction?: CanvasContextMenuAction,
) {
  if (!previousAction) {
    return false;
  }

  if (action.dividerBefore) {
    return true;
  }

  return getActionGroup(action) !== getActionGroup(previousAction);
}

export function CanvasContextMenu({
  open,
  mode,
  position,
  actions,
  onClose,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [renderPosition, setRenderPosition] = useState(position);

  useLayoutEffect(() => {
    if (!open) {
      setRenderPosition(position);
      return;
    }

    if (typeof window === "undefined" || !menuRef.current) {
      return;
    }

    const rect = menuRef.current.getBoundingClientRect();
    const margin = 16;
    const halfWidth = rect.width / 2;
    const minLeft = margin + halfWidth;
    const maxLeft = Math.max(minLeft, window.innerWidth - margin - halfWidth);
    const maxTop = Math.max(margin, window.innerHeight - margin - rect.height);
    const nextPosition = {
      x: Math.min(Math.max(position.x, minLeft), maxLeft),
      y: Math.min(Math.max(position.y, margin), maxTop),
    };

    setRenderPosition((current) =>
      current.x === nextPosition.x && current.y === nextPosition.y
        ? current
        : nextPosition,
    );
  }, [actions.length, open, position.x, position.y]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="absolute z-30"
      style={{
        left: renderPosition.x,
        top: renderPosition.y,
      }}
    >
      <div
        ref={menuRef}
        role="menu"
        aria-label={MODE_LABELS[mode]}
        className="min-w-[220px] -translate-x-1/2 overflow-hidden rounded-[10px] border border-slate-200 bg-white/97 p-1.5 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur-xl"
        onContextMenu={(event) => event.preventDefault()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col">
          {actions.map((action, index) => (
            <Fragment key={action.id}>
              {shouldRenderActionSeparator(action, actions[index - 1]) ? (
                <div
                  data-testid="canvas-context-menu-separator"
                  className="mx-2 my-1 h-px bg-slate-200"
                />
              ) : null}
              <button
                type="button"
                className={`flex w-full items-center rounded-[10px] px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${
                  action.danger ? "text-[#c14d3b]" : "text-foreground"
                }`}
                onClick={() => {
                  action.onSelect();
                  onClose();
                }}
              >
                <span className="font-medium">{action.label}</span>
              </button>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
