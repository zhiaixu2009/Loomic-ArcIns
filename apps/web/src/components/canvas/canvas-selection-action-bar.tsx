"use client";

import {
  Download,
  Image as ImageIcon,
  Pencil,
  Shapes,
  Sparkles,
  Send,
  Type,
} from "lucide-react";
import {
  useCallback,
  useMemo,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { resolveBrowserAssetUrl } from "../../lib/browser-asset-url";
import type { CanvasSelectedElement } from "../canvas-editor";
import { ImageLightbox } from "../chat/image-lightbox";

type CanvasSelectionActionBarProps = {
  mode: "single-image" | "multi-image";
  selection: CanvasSelectedElement[];
  position: {
    left: number;
    top: number;
  };
  previewSrc?: string | null;
  previewAlt?: string | null;
  onSendToChat: () => void;
  onGroup: () => void;
  onMerge: () => void;
  onEdit: () => void;
  onDoodle: () => void;
  onText: () => void;
  onDownload?: () => void;
};

type ActionButtonProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onSelect: () => void;
};

function activateWithoutStealingFocus(
  event: MouseEvent<HTMLButtonElement>,
  action: () => void,
) {
  event.preventDefault();
  action();
}

function activateWithKeyboard(
  event: KeyboardEvent<HTMLButtonElement>,
  action: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function ActionButton({ icon: Icon, label, onSelect }: ActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onKeyDown={(event) => activateWithKeyboard(event, onSelect)}
      onMouseDown={(event) => activateWithoutStealingFocus(event, onSelect)}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

export function CanvasSelectionActionBar({
  mode,
  selection,
  position,
  previewSrc,
  previewAlt,
  onSendToChat,
  onGroup,
  onMerge,
  onEdit,
  onDoodle,
  onText,
  onDownload,
}: CanvasSelectionActionBarProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const image = selection[0];
  const toolbarOffset = 36;

  if (!image) {
    return null;
  }

  const imageUrl = useMemo(
    () =>
      resolveBrowserAssetUrl(
        previewSrc ?? image.storageUrl ?? image.dataUrl ?? "",
      ) || null,
    [image.dataUrl, image.storageUrl, previewSrc],
  );
  const imageAlt = useMemo(
    () => previewAlt ?? `画布参考图 ${image.id}`,
    [image.id, previewAlt],
  );

  const handlePreview = useCallback(() => {
    if (!imageUrl) {
      return;
    }

    setLightboxOpen(true);
  }, [imageUrl]);

  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload();
      return;
    }

    if (!imageUrl) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = imageUrl;
    anchor.download = `${imageAlt}.png`;
    anchor.rel = "noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, [imageAlt, imageUrl, onDownload]);

  return (
    <>
      <div
        data-testid="canvas-selection-action-bar"
        className="pointer-events-none absolute z-[26] -translate-x-1/2 -translate-y-full px-2"
        style={{
          left: position.left,
          top: Math.max(position.top - toolbarOffset, 24),
        }}
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-[10px] border border-slate-200 bg-white/96 p-1 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur">
          {mode === "single-image" ? (
            <>
              <ActionButton icon={Sparkles} label="编辑" onSelect={onEdit} />
              <ActionButton icon={Pencil} label="涂鸦" onSelect={onDoodle} />
              <ActionButton icon={Type} label="文字" onSelect={onText} />
              <ActionButton icon={ImageIcon} label="查看大图" onSelect={handlePreview} />
              <ActionButton icon={Download} label="下载" onSelect={handleDownload} />
            </>
          ) : (
            <>
              <ActionButton icon={Shapes} label="创建编组" onSelect={onGroup} />
              <ActionButton icon={ImageIcon} label="合并图层" onSelect={onMerge} />
              <button
                type="button"
                aria-label="发送至对话"
                className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-foreground transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onKeyDown={(event) => activateWithKeyboard(event, onSendToChat)}
                onMouseDown={(event) => activateWithoutStealingFocus(event, onSendToChat)}
              >
                <Send className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {lightboxOpen && imageUrl ? (
        <ImageLightbox
          src={imageUrl}
          alt={imageAlt}
          onClose={() => setLightboxOpen(false)}
          variant="architecture-canvas"
        />
      ) : null}
    </>
  );
}
