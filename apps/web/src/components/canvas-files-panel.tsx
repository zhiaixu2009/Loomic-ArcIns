"use client";

import { type RefObject, memo, useCallback, useEffect, useState } from "react";

import { MISSING_PREVIEW_LABEL } from "../lib/canvas-localization";

// biome-ignore lint/suspicious/noExplicitAny: Excalidraw API/element has no public type
type ExcalidrawEl = any;

export type CanvasFilesPanelProps = {
  // biome-ignore lint/suspicious/noExplicitAny: Excalidraw API has no public type definition
  excalidrawApi: any;
  open: boolean;
  onClose: () => void;
  variant?: "overlay" | "embedded" | "immersive" | "docked";
  sectionRef?: RefObject<HTMLDivElement | null>;
};

/* -- Throttle utility -- */
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

const CloseIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" fillOpacity={0.9} className={className}>
    <path d="M3 17.25v-2.5a.75.75 0 0 1 1.5 0v2.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-2.5a.75.75 0 0 1 1.5 0v2.5A3.75 3.75 0 0 1 17.25 21H6.75A3.75 3.75 0 0 1 3 17.25m8.25-13.5a.75.75 0 0 1 1.5 0v9.44l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22z" />
  </svg>
);

type ImageFile = { id: string; name: string; dataURL: string };

/** Memoized file row to prevent re-renders when other files change */
const FileRow = memo(function FileRow({
  file,
  onDownload,
}: {
  file: ImageFile;
  onDownload: (file: ImageFile) => void;
}) {
  const handleDownload = useCallback(() => onDownload(file), [onDownload, file]);

  return (
    <div
      className="group flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-muted transition-colors"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 56px" }}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg shadow-subtle">
        {file.dataURL ? (
          <img
            alt={file.name}
            className="h-full w-full object-cover"
            draggable={false}
            src={file.dataURL}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-xs">
            {MISSING_PREVIEW_LABEL}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden text-sm leading-[22px] text-foreground min-w-0">
        <div className="overflow-hidden text-ellipsis whitespace-nowrap">{file.name}</div>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        className="flex h-4 w-4 shrink-0 items-center justify-center text-foreground hover:text-muted-foreground transition-colors"
        title="下载"
        aria-label={`\u4e0b\u8f7d ${file.name}`}
      >
        <DownloadIcon className="h-4 w-4" />
      </button>
    </div>
  );
});

export function CanvasFilesPanel({
  excalidrawApi,
  open,
  onClose,
  variant = "overlay",
  sectionRef,
}: CanvasFilesPanelProps) {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);

  const refreshFiles = useCallback(() => {
    if (!excalidrawApi) return;
    const allElements = excalidrawApi.getSceneElements() as ExcalidrawEl[];
    const files: Record<string, any> = excalidrawApi.getFiles() ?? {};
    const images: ImageFile[] = [];
    let idx = 0;
    for (const el of allElements) {
      if (el.isDeleted || el.type !== "image" || !el.fileId) continue;
      // Only show agent-generated outputs in the record panel.
      if (el.customData?.source !== "generated") continue;
      idx++;
      const file = files[el.fileId];
      const title =
        el.customData?.title || el.customData?.label || `\u56fe\u50cf ${idx}`;
      images.push({ id: el.id, name: title, dataURL: file?.dataURL ?? "" });
    }
    setImageFiles(images.reverse());
  }, [excalidrawApi]);

  // Throttle refresh to avoid excessive re-renders during canvas operations
  useEffect(() => {
    if (!open || !excalidrawApi) return;
    refreshFiles();
    const throttledRefresh = throttle(refreshFiles, 200);
    const unsubscribe = excalidrawApi.onChange(() => throttledRefresh());
    return () => {
      throttledRefresh.cancel();
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [open, excalidrawApi, refreshFiles]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const handleDownload = useCallback((file: ImageFile) => {
    if (!file.dataURL) return;
    const a = document.createElement("a");
    a.href = file.dataURL;
    a.download = `${file.name}.png`;
    a.click();
  }, []);

  if (!open) return null;

  if (variant === "embedded") {
    return (
      <div
        ref={sectionRef}
        className="scroll-mt-4 border-t border-border/70 px-4 py-4"
        data-testid="canvas-files-panel-embedded"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">生成文件列表</span>
          <span className="text-xs text-muted-foreground">
            {imageFiles.length === 0 ? "暂无文件" : `${imageFiles.length} 个结果`}
          </span>
        </div>

        <div className="max-h-56 overflow-y-auto pr-1">
          {imageFiles.length === 0 ? (
            <p className="rounded-[10px] bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
              暂无生成文件
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {imageFiles.map((file) => (
                <FileRow key={file.id} file={file} onDownload={handleDownload} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === "docked") {
    return (
      <div
        className="border-t border-border/70 bg-white/96 px-4 pb-4 pt-3"
        data-testid="canvas-files-panel-docked"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-foreground">生成文件列表</span>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="关闭生成文件列表"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3">
          {imageFiles.length === 0 ? (
            <div className="flex items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
              加载中...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {imageFiles.map((file) => (
                  <div
                    key={file.id}
                    className="overflow-hidden rounded-[10px] border border-slate-200 bg-white"
                  >
                    <div className="overflow-hidden bg-slate-100">
                      {file.dataURL ? (
                        <img
                          alt={file.name}
                          className="h-28 w-full object-cover"
                          draggable={false}
                          src={file.dataURL}
                        />
                      ) : (
                        <div className="flex h-28 w-full items-center justify-center text-xs text-muted-foreground">
                          {MISSING_PREVIEW_LABEL}
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2 text-xs text-foreground">
                      <div className="truncate">{file.name}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                没有更多了
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === "immersive") {
    return (
      <div
        className="flex h-full flex-col bg-white"
        data-testid="canvas-files-panel-immersive"
      >
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-4">
          <span className="text-sm font-semibold text-foreground">生成文件列表</span>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="关闭文件列表"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {imageFiles.length === 0 ? (
            <div className="rounded-[10px] border border-border/70 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              暂无生成文件
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {imageFiles.map((file) => (
                <div
                  key={file.id}
                  className="overflow-hidden rounded-[10px] border border-border/70 bg-white"
                >
                  <div className="overflow-hidden bg-muted/20">
                    {file.dataURL ? (
                      <img
                        alt={file.name}
                        className="h-28 w-full object-cover"
                        draggable={false}
                        src={file.dataURL}
                      />
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center text-xs text-muted-foreground">
                        {MISSING_PREVIEW_LABEL}
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2 text-xs text-foreground">
                    <div className="truncate">{file.name}</div>
                  </div>
                </div>
              ))}
              <p className="py-1 text-center text-sm text-muted-foreground">
                没有更多了
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed left-0 top-0 z-30 flex h-full w-[280px] flex-col border-r border-border bg-card animate-in slide-in-from-left duration-200"
      onKeyDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Title bar */}
      <div className="flex h-[50px] shrink-0 items-center justify-between px-4">
        <span className="text-base font-medium text-foreground">已生成文件列表</span>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onClick={onClose}
          aria-label="\u5173\u95ed\u6587\u4ef6\u9762\u677f"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* File list -- uses content-visibility and memoized rows for performance */}
      <div className="flex-1 overflow-y-auto px-2 pb-4" style={{ contain: "layout style" }}>
        {imageFiles.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">暂无生成文件</p>
        ) : (
          <div className="flex flex-col gap-1">
            {imageFiles.map((file) => (
              <FileRow key={file.id} file={file} onDownload={handleDownload} />
            ))}
            <p className="py-2 text-center text-sm text-muted-foreground">到底了</p>
          </div>
        )}
      </div>
    </div>
  );
}
