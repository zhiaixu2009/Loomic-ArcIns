"use client";

import { useCallback, useEffect, useRef, useState, memo, type MouseEvent } from "react";

import {
  reorderCanvasElementsByLayerOrder,
  toggleLockCanvasElements,
  toggleVisibilityCanvasElements,
} from "../lib/canvas-context-actions";
import { getCanvasElementLabel } from "../lib/canvas-localization";

/* -- Types -- */
// biome-ignore lint/suspicious/noExplicitAny: Excalidraw element has no public type
type ExcalidrawEl = any;

export type CanvasLayersPanelProps = {
  // biome-ignore lint/suspicious/noExplicitAny: Excalidraw API has no public type definition
  excalidrawApi: any;
  open: boolean;
  onClose: () => void;
};

/* -- Throttle utility -- */
/** Simple trailing-edge throttle. Ensures fn fires at most once per `ms`. */
function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  const throttled = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) fn(...lastArgs);
      lastArgs = null;
    }, ms);
  }) as T & { cancel: () => void };
  throttled.cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    lastArgs = null;
  };
  return throttled;
}

/* -- Icon helpers -- */
const LockIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" className={className}>
    <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4S1.5 8 1.5 8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M3 5.4C4.2 4.2 5.8 3.5 8 3.5c4 0 6.5 4 6.5 4a13.82 13.82 0 0 1-2 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M12.7 12.1C11.5 13 10 13.5 8 13.5c-4 0-6.5-4-6.5-4S2.3 8.2 3.4 7.1" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

/* -- Element helpers -- */
function elLabel(el: ExcalidrawEl): string {
  return getCanvasElementLabel(el);
}

function isLayerLocked(el: ExcalidrawEl) {
  return Boolean(el.locked);
}

function isLayerHidden(el: ExcalidrawEl) {
  return el.opacity === 0 || el.customData?.hidden === true;
}

function elThumbnailIcon(el: ExcalidrawEl): string {
  if (el.customData?.type === "image-generator") return "\u2728";
  if (el.type === "text") return "T";
  if (el.type === "image") return "";
  if (el.type === "rectangle") return "\u25AD";
  if (el.type === "ellipse") return "\u25EF";
  if (el.type === "diamond") return "\u25C7";
  if (el.type === "line") return "\u2500";
  if (el.type === "arrow") return "\u2192";
  return "\u25C6";
}

/* -- Thumbnail component -- */
function LayerThumbnail({
  el,
  files,
}: {
  el: ExcalidrawEl;
  files: Record<string, any>;
}) {
  const icon = elThumbnailIcon(el);

  // For image elements, try to show a small preview
  if (el.type === "image" && el.fileId) {
    const file = files[el.fileId];
    if (file?.dataURL) {
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border bg-muted overflow-hidden">
          <img
            src={file.dataURL}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      );
    }
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border bg-muted text-[11px] leading-none text-muted-foreground">
      {icon}
    </div>
  );
}

/* -- Layer row (memoized to prevent re-render when other rows' selection changes) -- */
const LayerRow = memo(function LayerRow({
  el,
  files,
  selected,
  dragging,
  dropTarget,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggleLock,
  onToggleVisibility,
}: {
  el: ExcalidrawEl;
  files: Record<string, any>;
  selected: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string, event: MouseEvent<HTMLDivElement>) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
  onToggleLock: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}) {
  const handleClick = useCallback(() => onSelect(el.id), [onSelect, el.id]);
  const handleDragStart = useCallback(() => onDragStart(el.id), [el.id, onDragStart]);
  const handleDragOver = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      onDragOver(el.id, event);
    },
    [el.id, onDragOver],
  );
  const handleDrop = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      onDrop(el.id);
    },
    [el.id, onDrop],
  );
  const handleToggleLock = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onToggleLock(el.id);
    },
    [el.id, onToggleLock],
  );
  const handleToggleVisibility = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onToggleVisibility(el.id);
    },
    [el.id, onToggleVisibility],
  );
  const locked = isLayerLocked(el);
  const hidden = isLayerHidden(el);
  const actionButtonBaseClass =
    "flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";
  const idleActionVisibilityClass = selected
    ? "visible"
    : "invisible group-hover/layer:visible focus-visible:visible";

  return (
    <div
      data-testid={`canvas-layer-row-${el.id}`}
      draggable
      className={`group/layer flex h-11 items-center gap-1 rounded-lg px-2 transition-colors ${
        dragging
          ? "bg-muted/70 opacity-70"
          : dropTarget
            ? "bg-muted ring-1 ring-border"
            : selected
              ? "bg-muted"
              : "hover:bg-muted"
      }`}
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 44px" }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        aria-current={selected ? "true" : undefined}
        onClick={handleClick}
      >
        <LayerThumbnail el={el} files={files} />
        <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
          {elLabel(el)}
        </span>
      </button>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className={`${actionButtonBaseClass} ${idleActionVisibilityClass} ${
            locked ? "bg-muted text-foreground" : "hover:text-foreground"
          }`}
          aria-label={locked ? "解锁图层" : "锁定图层"}
          aria-pressed={locked}
          onClick={handleToggleLock}
        >
          <LockIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${actionButtonBaseClass} ${idleActionVisibilityClass} ${
            hidden ? "bg-muted text-foreground" : "hover:text-foreground"
          }`}
          aria-label={hidden ? "显示图层" : "隐藏图层"}
          aria-pressed={hidden}
          onClick={handleToggleVisibility}
        >
          {hidden ? (
            <EyeOffIcon className="h-4 w-4" />
          ) : (
            <EyeIcon className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
});

/* ================================================================
   Main component
   ================================================================ */
export function CanvasLayersPanel({
  excalidrawApi,
  open,
  onClose,
}: CanvasLayersPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<ExcalidrawEl[]>([]);
  const [files, setFiles] = useState<Record<string, any>>({});
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dropTargetLayerId, setDropTargetLayerId] = useState<string | null>(null);

  /* -- Refresh elements on open + subscribe to changes -- */
  const refreshElements = useCallback(() => {
    if (!excalidrawApi) return;
    const all = excalidrawApi.getSceneElements() as ExcalidrawEl[];
    setElements(all.filter((el: ExcalidrawEl) => !el.isDeleted).reverse());
    setFiles(excalidrawApi.getFiles() ?? {});
    const state = excalidrawApi.getAppState();
    setSelectedIds(state.selectedElementIds ?? {});
  }, [excalidrawApi]);

  // Throttle refresh to avoid hammering React state on every drag frame.
  // 100ms gives smooth UI without excessive re-renders during drawing.
  useEffect(() => {
    if (!open || !excalidrawApi) return;
    // Initial refresh is immediate
    refreshElements();

    const throttledRefresh = throttle(refreshElements, 100);
    const unsubscribe = excalidrawApi.onChange(() => {
      throttledRefresh();
    });
    return () => {
      throttledRefresh.cancel();
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [open, excalidrawApi, refreshElements]);

  /* -- Escape to close -- */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  /* -- Select element on canvas -- */
  const selectElement = useCallback(
    (id: string) => {
      if (!excalidrawApi) {
        return;
      }

      excalidrawApi.updateScene({
        appState: {
          ...excalidrawApi.getAppState(),
          selectedElementIds: { [id]: true },
        },
      });
      setSelectedIds({ [id]: true });
      refreshElements();
    },
    [excalidrawApi, refreshElements],
  );

  const runLayerAction = useCallback(
    (id: string, action: (api: any) => unknown) => {
      if (!excalidrawApi) {
        return;
      }

      excalidrawApi.updateScene({
        appState: {
          ...excalidrawApi.getAppState(),
          selectedElementIds: { [id]: true },
        },
      });
      setSelectedIds({ [id]: true });
      action(excalidrawApi);
      refreshElements();
    },
    [excalidrawApi, refreshElements],
  );

  const toggleLayerLock = useCallback(
    (id: string) => {
      runLayerAction(id, (api) => toggleLockCanvasElements(api, [id]));
    },
    [runLayerAction],
  );

  const toggleLayerVisibility = useCallback(
    (id: string) => {
      runLayerAction(id, (api) => toggleVisibilityCanvasElements(api, [id]));
    },
    [runLayerAction],
  );

  const reorderLayers = useCallback(
    (draggedId: string, targetId: string) => {
      if (!excalidrawApi || draggedId === targetId) {
        return;
      }

      const currentLayerOrder = elements.map((element) => String(element.id));
      const draggedIndex = currentLayerOrder.indexOf(draggedId);
      const targetIndex = currentLayerOrder.indexOf(targetId);
      if (draggedIndex === -1 || targetIndex === -1) {
        return;
      }

      const nextLayerOrder = currentLayerOrder.slice();
      nextLayerOrder.splice(draggedIndex, 1);
      const adjustedTargetIndex = nextLayerOrder.indexOf(targetId);
      const insertionIndex =
        draggedIndex < targetIndex ? adjustedTargetIndex + 1 : adjustedTargetIndex;
      nextLayerOrder.splice(insertionIndex, 0, draggedId);

      reorderCanvasElementsByLayerOrder(excalidrawApi, nextLayerOrder);
      refreshElements();
    },
    [elements, excalidrawApi, refreshElements],
  );

  const handleDragStart = useCallback((id: string) => {
    setDraggedLayerId(id);
    setDropTargetLayerId(null);
  }, []);

  const handleDragOver = useCallback((id: string) => {
    if (!draggedLayerId || draggedLayerId === id) {
      return;
    }

    setDropTargetLayerId(id);
  }, [draggedLayerId]);

  const handleDrop = useCallback((id: string) => {
    if (!draggedLayerId || draggedLayerId === id) {
      setDraggedLayerId(null);
      setDropTargetLayerId(null);
      return;
    }

    reorderLayers(draggedLayerId, id);
    setDraggedLayerId(null);
    setDropTargetLayerId(null);
  }, [draggedLayerId, reorderLayers]);

  const handleDragEnd = useCallback(() => {
    setDraggedLayerId(null);
    setDropTargetLayerId(null);
  }, []);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="fixed left-0 top-0 z-30 flex h-full w-[280px] flex-col border-r border-border bg-card animate-in slide-in-from-left duration-200"
      onKeyDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Title bar */}
      <div className="flex h-11 shrink-0 items-center justify-between px-3">
        <span className="text-sm font-medium text-foreground">图层</span>
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          onClick={onClose}
          aria-label="关闭图层面板"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Separator */}
      <div className="h-px bg-border" />

      {/* Layer list -- uses content-visibility for large canvas performance */}
      <div className="flex-1 overflow-y-auto px-1 py-1" style={{ contain: "layout style" }}>
        {elements.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            画布为空
          </p>
        ) : (
          elements.map((el: ExcalidrawEl) => (
            <LayerRow
              key={el.id}
              el={el}
              files={files}
              selected={!!selectedIds[el.id]}
              dragging={draggedLayerId === el.id}
              dropTarget={dropTargetLayerId === el.id}
              onSelect={selectElement}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onToggleLock={toggleLayerLock}
              onToggleVisibility={toggleLayerVisibility}
            />
          ))
        )}
      </div>
    </div>
  );
}
