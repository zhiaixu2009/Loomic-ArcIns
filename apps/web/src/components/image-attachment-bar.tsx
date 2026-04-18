"use client";

import type { ImageAttachmentState } from "../hooks/use-image-attachments";
import { resolveBrowserAssetUrl } from "../lib/browser-asset-url";

type ImageAttachmentBarProps = {
  attachments: ImageAttachmentState[];
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  onMove?: (id: string, direction: "left" | "right") => void;
  variant?: "default" | "composer-inline";
};

export function ImageAttachmentBar({
  attachments,
  onRemove,
  onRetry,
  onMove,
  variant = "default",
}: ImageAttachmentBarProps) {
  if (attachments.length === 0) return null;

  const isComposerInline = variant === "composer-inline";
  const containerClassName = isComposerInline
    ? "flex items-start gap-2"
    : "flex items-center gap-2 overflow-x-auto px-2 py-1.5";
  const wrapperClassName = isComposerInline
    ? "group relative h-[68px] w-[68px] shrink-0 overflow-visible"
    : "group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted";
  const previewClassName = isComposerInline
    ? "relative h-[60px] w-[60px] overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50"
    : "relative h-full w-full overflow-hidden rounded-lg border border-border bg-muted";
  const removeButtonClassName = isComposerInline
    ? "absolute -right-1 -top-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/72 text-white transition-colors hover:bg-black/86"
    : "absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground group-hover:flex";
  const controlButtonClassName =
    "absolute bottom-1 inline-flex h-5 w-5 items-center justify-center rounded-[6px] bg-black/72 text-white transition-colors hover:bg-black/86 disabled:cursor-not-allowed disabled:bg-black/35 disabled:text-white/65";

  return (
    <div className={containerClassName}>
      {attachments.map((attachment, index) => {
        const previewSrc = resolveBrowserAssetUrl(
          attachment.url ?? attachment.preview,
        );
        const alt =
          attachment.name ??
          (attachment.source === "canvas-ref" ? "画布参考图" : "已上传图片");

        return (
          <div
            key={attachment.id}
            className={wrapperClassName}
            data-source={attachment.source}
          >
            <div className={previewClassName}>
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt={alt}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg
                    className="h-5 w-5 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                </div>
              )}

              {attachment.uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
              ) : null}

              {attachment.error ? (
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-red-500/20 ${
                    onRetry && attachment.file ? "cursor-pointer" : ""
                  }`}
                  onClick={
                    onRetry && attachment.file
                      ? () => onRetry(attachment.id)
                      : undefined
                  }
                  title={attachment.error}
                >
                  <svg
                    className="h-3.5 w-3.5 text-red-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 0 1 1 1v2.101a7.002 7.002 0 0 1 11.601 2.566 1 1 0 1 1-1.885.666A5.002 5.002 0 0 0 5.999 7H9a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm.008 9.057a1 1 0 0 1 1.276.61A5.002 5.002 0 0 0 14.001 13H11a1 1 0 1 1 0-2h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-2.101a7.002 7.002 0 0 1-11.601-2.566 1 1 0 0 1 .61-1.276Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {onRetry && attachment.file ? (
                    <span className="text-[9px] font-medium text-red-600">
                      重试
                    </span>
                  ) : null}
                </div>
              ) : null}

              {isComposerInline && onMove ? (
                <>
                  <button
                    type="button"
                    aria-label={`将参考图 ${index + 1} 向前移动`}
                    disabled={index === 0}
                    onClick={() => onMove(attachment.id, "left")}
                    className={`${controlButtonClassName} left-1`}
                  >
                    <svg
                      className="h-2.5 w-2.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label={`将参考图 ${index + 1} 向后移动`}
                    disabled={index === attachments.length - 1}
                    onClick={() => onMove(attachment.id, "right")}
                    className={`${controlButtonClassName} right-1`}
                  >
                    <svg
                      className="h-2.5 w-2.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </button>
                </>
              ) : null}

              <button
                type="button"
                aria-label={`移除参考图 ${index + 1}`}
                onClick={() => onRemove(attachment.id)}
                className={removeButtonClassName}
              >
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
