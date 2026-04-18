import type { CanvasSelectedElement } from "../components/canvas-editor";

type SceneElementLike = {
  id: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  locked?: boolean;
  text?: string;
  fileId?: string;
  isDeleted?: boolean;
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  customData?: {
    storageUrl?: string;
  };
};

type ExcalidrawFileLike = {
  dataURL?: string;
  storageUrl?: string;
};

export function extractSelectedCanvasElements(options: {
  elements: readonly SceneElementLike[];
  files?: Record<string, ExcalidrawFileLike | undefined>;
  initialFiles?: Record<string, ExcalidrawFileLike | undefined>;
  selectedElementIds?: Record<string, boolean>;
}): CanvasSelectedElement[] {
  const selectedElementIds = options.selectedElementIds ?? {};
  const selectedIds = Object.entries(selectedElementIds)
    .filter(([, selected]) => Boolean(selected))
    .map(([id]) => id);

  if (selectedIds.length === 0) {
    return [];
  }

  const selectedIdSet = new Set(selectedIds);
  const files = options.files ?? {};
  const initialFiles = options.initialFiles ?? {};

  return options.elements
    .filter((element) => selectedIdSet.has(element.id) && !element.isDeleted)
    .map((element) => {
      const base: CanvasSelectedElement = {
        id: element.id,
        type: element.type,
        x: element.x ?? 0,
        y: element.y ?? 0,
        width: element.width ?? 0,
        height: element.height ?? 0,
        ...(typeof element.locked === "boolean" ? { locked: element.locked } : {}),
        ...(typeof element.strokeColor === "string"
          ? { strokeColor: element.strokeColor }
          : {}),
        ...(typeof element.backgroundColor === "string"
          ? { backgroundColor: element.backgroundColor }
          : {}),
        ...(typeof element.strokeWidth === "number"
          ? { strokeWidth: element.strokeWidth }
          : {}),
      };

      if (element.type === "text" && element.text) {
        base.text = element.text;
      }

      if (element.type === "image" && element.fileId) {
        base.fileId = element.fileId;

        const file = files[element.fileId];
        if (file?.dataURL) {
          base.dataUrl = file.dataURL;
        }

        const storageUrl =
          file?.storageUrl ??
          element.customData?.storageUrl ??
          initialFiles[element.fileId]?.storageUrl;
        if (typeof storageUrl === "string" && storageUrl) {
          base.storageUrl = storageUrl;
        }
      }

      return base;
    });
}
