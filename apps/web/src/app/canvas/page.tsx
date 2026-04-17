"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense, type ChangeEvent } from "react";

import type {
  CanvasCollaboratorProfile,
  ImageArtifact,
  VideoArtifact,
} from "@loomic/shared";
import type { CanvasImageItem } from "../../components/canvas-image-picker";
import type {
  CanvasSelectedElement,
  CanvasViewportState,
} from "../../components/canvas-editor";
import { LoadingScreen } from "../../components/loading-screen";
import { useAuth } from "../../lib/auth-context";
import { useCanvasCollaboration } from "../../hooks/use-canvas-collaboration";
import { useCredits } from "../../hooks/use-credits";
import { useWebSocket } from "../../hooks/use-websocket";
import { useJobFallbackPolling } from "../../hooks/use-job-fallback-polling";
import { CanvasEditor } from "../../components/canvas-editor";
import { CanvasLayersPanel } from "../../components/canvas-layers-panel";
import { CanvasContextMenu, type CanvasContextMenuAction } from "../../components/canvas/canvas-context-menu";
import { CanvasSelectionActionBar } from "../../components/canvas/canvas-selection-action-bar";
import { ChatSidebar } from "../../components/chat-sidebar";
import { CanvasEmptyHint } from "../../components/canvas-empty-hint";
import { CanvasLogoMenu } from "../../components/canvas-logo-menu";
import { EditableProjectName } from "../../components/editable-project-name";
import {
  createExcalidrawImageElement,
  insertImageOnCanvas,
  insertVideoOnCanvas,
} from "../../lib/canvas-elements";
import {
  ApiAuthError,
  fetchCanvas,
  fetchProject,
  uploadFile,
} from "../../lib/server-api";
import { buildCanvasUrl, isArchitectureStudio } from "../../lib/studio-routes";
import {
  createEmptyArchitectureContext,
  deriveArchitectureContextFromScene,
  insertArchitectureBoardIntoScene,
  insertArchitectureBoardStackIntoScene,
  type ArchitectureBoardKind,
  type ArchitectureSceneElement,
} from "../../lib/architecture-canvas";
import {
  LOAD_CANVAS_FAILED_MESSAGE,
  NO_CANVAS_ID_MESSAGE,
  UNTITLED_PROJECT_NAME,
  getCanvasImageFallbackName,
  normalizeProjectDisplayName,
} from "../../lib/canvas-localization";
import {
  deleteSelectedCanvasElements,
  getCanvasContextMenuMode,
  groupSelectedCanvasElements,
  reorderSelectedCanvasElements,
  toggleLockSelectedCanvasElements,
  toggleVisibilitySelectedCanvasElements,
  ungroupSelectedCanvasElements,
  type CanvasSceneOrderDirection,
  type CanvasComposerCommand,
  type CanvasContextMenuMode,
} from "../../lib/canvas-context-actions";

type CanvasContextMenuState = {
  x: number;
  y: number;
  mode: CanvasContextMenuMode;
};

type CanvasComposerCommandRequest =
  | {
      type: "attach-selection";
    }
  | {
      type: "apply-template";
      prompt: string;
      attachSelection?: boolean;
    };

const CANVAS_ZOOM_STEP = 1.15;
const CANVAS_ZOOM_MIN = 0.1;
const CANVAS_ZOOM_MAX = 4;

function createUiCommandId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `ui-command-${Date.now()}`;
}

function createSceneCloneId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `scene-clone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getBaseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim() || "参考图";
}

async function readImageFileDimensions(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const dimensions = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          resolve({
            width: image.naturalWidth || image.width,
            height: image.naturalHeight || image.height,
          });
        };
        image.onerror = () => reject(new Error("Failed to read image dimensions"));
        image.src = objectUrl;
      },
    );

    return dimensions;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadImageFromUrl(url: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Failed to load image asset"));
    image.src = url;
  });

  return image;
}

function downloadBlobFile(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

function downloadUrlFile(url: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function getSceneImageSource(
  element: Record<string, any>,
  files: Record<string, any>,
) {
  const file = element.fileId ? files[element.fileId] : null;
  return (
    file?.dataURL ??
    element.dataUrl ??
    element.storageUrl ??
    element.customData?.storageUrl ??
    element.link ??
    null
  );
}

function CanvasPageContent() {
  const searchParams = useSearchParams();
  const canvasId = searchParams.get("id");
  const initialSessionId = searchParams.get("session") ?? undefined;
  const architectureMode = isArchitectureStudio(searchParams.get("studio"));
  // Capture prompt once — router.replace will strip it from URL, but the
  // value must survive for the auto-send effect in ChatSidebar.
  const [initialPrompt] = useState(() => searchParams.get("prompt") ?? undefined);
  const { user, session, loading: authLoading, signOut } = useAuth();
  const { balance: creditBalance, loading: creditsLoading } = useCredits();
  const router = useRouter();

  const [canvasData, setCanvasData] = useState<{
    id: string;
    name: string;
    projectId: string;
    content: {
      elements: Record<string, unknown>[];
      appState: Record<string, unknown>;
      files: Record<string, Record<string, unknown>>;
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  // 建筑工作台默认收起右侧面板，优先呈现底部居中输入框；经典模式仍保留桌面默认展开。
  const [chatOpen, setChatOpen] = useState(() => {
    if (architectureMode) {
      return false;
    }

    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const [brandKitId, setBrandKitId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState(UNTITLED_PROJECT_NAME);
  const [selectedCanvasElements, setSelectedCanvasElements] = useState<CanvasSelectedElement[]>([]);
  const [selectionActionOrigin, setSelectionActionOrigin] = useState<"left" | "suppressed">(
    "suppressed",
  );
  const [canvasViewport, setCanvasViewport] = useState<CanvasViewportState>({
    scrollX: 0,
    scrollY: 0,
    zoom: 1,
  });
  const [architectureContext, setArchitectureContext] = useState(() =>
    createEmptyArchitectureContext(),
  );
  const [contextMenuState, setContextMenuState] = useState<CanvasContextMenuState | null>(null);
  const [composerCommand, setComposerCommand] = useState<CanvasComposerCommand | null>(null);
  const userId = user?.id;

  const excalidrawApiRef = useRef<any>(null);
  const [excalidrawApi, setExcalidrawApi] = useState<any>(null);
  const selectedElementIdsRef = useRef<string[]>([]);
  const referenceUploadInputRef = useRef<HTMLInputElement | null>(null);
  const canvasImportInputRef = useRef<HTMLInputElement | null>(null);
  const copiedSceneElementsRef = useRef<Record<string, any>[]>([]);
  const copiedSceneFilesRef = useRef<Record<string, any>>({});

  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;
  const routerRef = useRef(router);
  routerRef.current = router;

  // Stable callbacks for panel toggles to prevent re-renders of child components
  const handleOpenChat = useCallback(() => setChatOpen(true), []);
  const handleToggleChat = useCallback(() => setChatOpen((v) => !v), []);
  const handleApplyZoom = useCallback((nextZoom: number) => {
    const api = excalidrawApiRef.current;
    const clampedZoom = Math.min(Math.max(nextZoom, CANVAS_ZOOM_MIN), CANVAS_ZOOM_MAX);

    setCanvasViewport((current) => ({
      ...current,
      zoom: clampedZoom,
    }));

    if (!api?.updateScene) {
      return;
    }

    const currentAppState = api.getAppState?.() ?? {};
    api.updateScene({
      appState: {
        ...currentAppState,
        zoom: { value: clampedZoom },
      },
    });
  }, []);
  const handleZoomOut = useCallback(() => {
    const api = excalidrawApiRef.current;
    const currentZoom = api?.getAppState?.().zoom?.value ?? canvasViewport.zoom ?? 1;
    handleApplyZoom(currentZoom / CANVAS_ZOOM_STEP);
  }, [canvasViewport.zoom, handleApplyZoom]);
  const handleZoomIn = useCallback(() => {
    const api = excalidrawApiRef.current;
    const currentZoom = api?.getAppState?.().zoom?.value ?? canvasViewport.zoom ?? 1;
    handleApplyZoom(currentZoom * CANVAS_ZOOM_STEP);
  }, [canvasViewport.zoom, handleApplyZoom]);
  const handleOpenRecharge = useCallback(() => {
    router.push("/pricing");
  }, [router]);
  const handleToggleLayersPanel = useCallback(() => {
    setLayersPanelOpen((current) => {
      const nextOpen = !current;
      console.log("[canvas-page] toggled layers panel", {
        nextOpen,
      });
      return nextOpen;
    });
  }, []);
  const handleCloseLayersPanel = useCallback(() => {
    console.log("[canvas-page] closed layers panel");
    setLayersPanelOpen(false);
  }, []);
  const handleCloseContextMenu = useCallback(() => setContextMenuState(null), []);

  const accessToken = session?.access_token;
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;

  const getToken = useCallback(() => accessTokenRef.current ?? null, []);
  const ws = useWebSocket(getToken);
  const localCollaboratorProfile = useMemo<CanvasCollaboratorProfile | null>(() => {
    if (!user) return null;

    const metadata = user.user_metadata ?? {};
    const displayName =
      (typeof metadata.displayName === "string" && metadata.displayName) ||
      (typeof metadata.display_name === "string" && metadata.display_name) ||
      (typeof metadata.name === "string" && metadata.name) ||
      user.email?.split("@")[0] ||
      "Collaborator";
    const avatarUrl =
      typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

    return {
      avatarUrl,
      displayName,
    };
  }, [user]);
  const {
    clearPendingRemoteMutation,
    pendingRemoteMutation,
    remoteCursors,
    remoteSelections,
    reportCursor,
    reportSelection,
  } = useCanvasCollaboration({
    canvasId: canvasData?.id ?? null,
    enabled: Boolean(canvasData?.id),
    localUserId: userId ?? null,
    profile: localCollaboratorProfile,
    ws,
  });

  const handleApiReady = useCallback((api: any) => {
    excalidrawApiRef.current = api;
    setExcalidrawApi(api);
  }, []);

  const syncArchitectureContext = useCallback(
    (sceneElements: readonly ArchitectureSceneElement[] | null = null) => {
      if (!architectureMode) {
        setArchitectureContext(createEmptyArchitectureContext(selectedElementIdsRef.current));
        return;
      }

      const api = excalidrawApiRef.current;
      const liveElements =
        sceneElements ??
        ((api?.getSceneElements?.() as ArchitectureSceneElement[] | undefined) ?? []);
      const nextContext = deriveArchitectureContextFromScene({
        elements: liveElements,
        selectedElementIds: selectedElementIdsRef.current,
      });
      setArchitectureContext(nextContext);
    },
    [architectureMode],
  );

  const handleInsertArchitectureBoard = useCallback(
    (boardKind: ArchitectureBoardKind) => {
      const api = excalidrawApiRef.current;
      if (!api) {
        console.warn("[canvas-page] excalidraw API unavailable, cannot insert board");
        return;
      }

      const insertion = insertArchitectureBoardIntoScene({
        appState: api.getAppState(),
        boardKind,
        elements: api.getSceneElements() as ArchitectureSceneElement[],
      });

      const selectedElementIds =
        insertion.insertedRootElementId
          ? { [insertion.insertedRootElementId]: true }
          : undefined;
      const appState = api.getAppState();

      api.updateScene({
        elements: insertion.elements,
        appState: selectedElementIds
          ? { ...appState, selectedElementIds }
          : appState,
        captureUpdate: "IMMEDIATELY",
      });

      if (insertion.inserted) {
        console.log("[canvas-page] Inserted architecture board", {
          boardId: insertion.boardId,
          boardKind,
        });
      } else {
        console.log("[canvas-page] Architecture board already present", {
          boardId: insertion.boardId,
          boardKind,
        });
      }

      syncArchitectureContext(insertion.elements);
    },
    [syncArchitectureContext],
  );

  const handleInsertArchitectureBoardStack = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (!api) {
      console.warn("[canvas-page] excalidraw API unavailable, cannot seed board stack");
      return;
    }

    const insertion = insertArchitectureBoardStackIntoScene({
      appState: api.getAppState(),
      elements: api.getSceneElements() as ArchitectureSceneElement[],
    });

    const selectedElementIds =
      insertion.insertedRootElementId
        ? { [insertion.insertedRootElementId]: true }
        : undefined;
    const appState = api.getAppState();

    api.updateScene({
      elements: insertion.elements,
      appState: selectedElementIds
        ? { ...appState, selectedElementIds }
        : appState,
      captureUpdate: "IMMEDIATELY",
    });

    console.log("[canvas-page] Seeded architecture board stack", {
      insertedKinds: insertion.insertedKinds,
      insertedCount: insertion.insertedKinds.length,
    });

    syncArchitectureContext(insertion.elements);
  }, [syncArchitectureContext]);

  const handleGroupSelectedImages = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (!api) {
      console.warn("[canvas-page] excalidraw API unavailable, cannot group selection");
      return;
    }

    const result = groupSelectedCanvasElements(api);
    console.log("[canvas-page] grouped selected canvas elements", result);
    syncArchitectureContext(api.getSceneElements() as ArchitectureSceneElement[]);
  }, [syncArchitectureContext]);

  const handleDispatchComposerCommand = useCallback(
    (command: CanvasComposerCommandRequest) => {
      console.log("[canvas-page] dispatching composer command", {
        commandType: command.type,
        selectedCount: selectedCanvasElements.length,
        chatOpen,
      });

      if (command.type === "attach-selection") {
        setComposerCommand({
          id: createUiCommandId(),
          type: "attach-selection",
        });
        return;
      }

      setComposerCommand({
        id: createUiCommandId(),
        type: "apply-template",
        prompt: command.prompt,
        ...(command.attachSelection !== undefined
          ? { attachSelection: command.attachSelection }
          : {}),
      });
    },
    [chatOpen, selectedCanvasElements.length],
  );

  const handleComposerCommandHandled = useCallback((commandId: string) => {
    setComposerCommand((current) =>
      current?.id === commandId ? null : current,
    );
  }, []);

  const handleRequestContextMenu = useCallback(
    (payload: { x: number; y: number; selectedElements: CanvasSelectedElement[] }) => {
      const selectionSnapshot = payload.selectedElements;
      const mode = getCanvasContextMenuMode(selectionSnapshot);
      const api = excalidrawApiRef.current;
      if (api?.getAppState && api?.updateScene) {
        const nextSelectedElementIds = selectionSnapshot.reduce<Record<string, boolean>>(
          (accumulator, element) => {
            accumulator[element.id] = true;
            return accumulator;
          },
          {},
        );
        const currentAppState = api.getAppState();
        const currentSelectedElementIds = currentAppState?.selectedElementIds ?? {};
        const selectionChanged =
          Object.keys(currentSelectedElementIds).length !==
            Object.keys(nextSelectedElementIds).length ||
          Object.entries(nextSelectedElementIds).some(
            ([id, selected]) => currentSelectedElementIds[id] !== selected,
          );

        if (selectionChanged) {
          api.updateScene({
            appState: {
              ...currentAppState,
              selectedElementIds: nextSelectedElementIds,
            },
            captureUpdate: "NONE",
          });
        }
      }
      setSelectionActionOrigin("suppressed");
      setSelectedCanvasElements(selectionSnapshot);
      console.log("[canvas-page] opening canvas context menu", {
        x: payload.x,
        y: payload.y,
        selectedCount: selectionSnapshot.length,
        mode,
      });
      setContextMenuState({
        x: payload.x,
        y: payload.y,
        mode,
      });
    },
    [],
  );

  useEffect(() => {
    if (!contextMenuState) {
      return;
    }

    const nextMode = getCanvasContextMenuMode(selectedCanvasElements);
    if (contextMenuState.mode !== nextMode) {
      setContextMenuState({
        ...contextMenuState,
        mode: nextMode,
      });
    }
  }, [contextMenuState, selectedCanvasElements]);

  const handleReferenceUploadChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []).filter((file) =>
        file.type.startsWith("image/"),
      );
      event.target.value = "";

      if (files.length === 0) {
        return;
      }

      const api = excalidrawApiRef.current;
      const token = accessTokenRef.current;
      if (!api || !token || !canvasData) {
        console.warn("[canvas-page] cannot upload references into canvas", {
          hasApi: Boolean(api),
          hasToken: Boolean(token),
          hasCanvasData: Boolean(canvasData),
        });
        return;
      }

      for (const file of files) {
        try {
          const [uploadResponse, dimensions] = await Promise.all([
            uploadFile(token, file, canvasData.projectId),
            readImageFileDimensions(file),
          ]);

          await insertImageOnCanvas(api, {
            type: "image",
            title: getBaseName(file.name),
            url: uploadResponse.url,
            mimeType: file.type || "image/png",
            width: dimensions.width,
            height: dimensions.height,
          });
        } catch (error) {
          console.error("[canvas-page] failed to upload reference image", {
            fileName: file.name,
            error,
          });
        }
      }
    },
    [canvasData],
  );

  const selectedCanvasImage = useMemo(() => {
    if (selectedCanvasElements.length !== 1) {
      return null;
    }

    const [element] = selectedCanvasElements;
    if (
      element.type !== "image" ||
      (!element.storageUrl && !element.dataUrl)
    ) {
      return null;
    }

    return element;
  }, [selectedCanvasElements]);
  const selectionFullyLocked = useMemo(
    () =>
      selectedCanvasElements.length > 0 &&
      selectedCanvasElements.every((element) => element.locked),
    [selectedCanvasElements],
  );
  const multiSelectedCanvasImages = useMemo(
    () =>
      selectedCanvasElements.filter(
        (element) =>
          element.type === "image" && Boolean(element.storageUrl || element.dataUrl),
      ),
    [selectedCanvasElements],
  );
  const showMultiImageSelectionActionBar =
    selectionActionOrigin === "left" && multiSelectedCanvasImages.length > 1;

  const handleCanvasSelectionIntent = useCallback((intent: "left" | "right") => {
    setSelectionActionOrigin(intent === "left" ? "left" : "suppressed");
  }, []);

  const handleSelectedCanvasElementsChange = useCallback(
    (nextSelection: CanvasSelectedElement[]) => {
      setSelectedCanvasElements(nextSelection);
      if (nextSelection.length === 0) {
        setSelectionActionOrigin("suppressed");
      }
    },
    [],
  );

  const handleClearCanvasSelection = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (api?.getAppState && api?.updateScene) {
      api.updateScene({
        appState: {
          ...api.getAppState(),
          selectedElementIds: {},
        },
        captureUpdate: "NONE",
      });
    }

    setContextMenuState(null);
    setSelectionActionOrigin("suppressed");
    setSelectedCanvasElements([]);
  }, []);

  useEffect(() => {
    if (selectedCanvasElements.length === 0 && !contextMenuState) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      handleClearCanvasSelection();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenuState, handleClearCanvasSelection, selectedCanvasElements.length]);

  const selectedImageActionBarPosition = useMemo(() => {
    const actionBarElements =
      selectionActionOrigin === "left" &&
      (selectedCanvasImage || showMultiImageSelectionActionBar)
        ? selectedCanvasElements
        : [];
    if (actionBarElements.length === 0) {
      return null;
    }

    const bounds = actionBarElements.reduce(
      (accumulator, element) => ({
        minX: Math.min(accumulator.minX, element.x),
        minY: Math.min(accumulator.minY, element.y),
        maxX: Math.max(accumulator.maxX, element.x + element.width),
        maxY: Math.max(accumulator.maxY, element.y + element.height),
      }),
      {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      },
    );

    return {
      left: Math.max(
        ((bounds.minX + bounds.maxX) / 2 + canvasViewport.scrollX) *
          canvasViewport.zoom,
        120,
      ),
      top: Math.max(
        (bounds.minY + canvasViewport.scrollY) * canvasViewport.zoom,
        88,
      ),
    };
  }, [
    canvasViewport,
    selectedCanvasElements,
    selectedCanvasImage,
    selectionActionOrigin,
    showMultiImageSelectionActionBar,
  ]);

  const handleEditSelectedCanvasImage = useCallback(() => {
    if (!selectedCanvasImage) {
      return;
    }

    console.log("[canvas-page] quick editing selected canvas image", {
      elementId: selectedCanvasImage.id,
    });
    setContextMenuState(null);
    handleDispatchComposerCommand({
      type: "apply-template",
      prompt:
        "请基于当前选中图片继续定向编辑，优先保留主体体量、视角与构图，并明确你想调整的建筑材质、光线、氛围或细部。",
      attachSelection: true,
    });
  }, [handleDispatchComposerCommand, selectedCanvasImage]);

  const handleActivateSelectionTool = useCallback(
    (tool: "freedraw" | "text") => {
      console.log("[canvas-page] activating selected-image quick tool", {
        tool,
      });
      setContextMenuState(null);
      excalidrawApiRef.current?.setActiveTool?.({ type: tool });
    },
    [],
  );
  const handleSendSelectionToChat = useCallback(() => {
    setContextMenuState(null);
    handleDispatchComposerCommand({
      type: "attach-selection",
    });
  }, [handleDispatchComposerCommand]);

  const handleReorderSelectedElements = useCallback(
    (direction: CanvasSceneOrderDirection) => {
      const api = excalidrawApiRef.current;
      if (!api) {
        console.warn("[canvas-page] excalidraw API unavailable, cannot reorder selection", {
          direction,
        });
        return;
      }

      const result = reorderSelectedCanvasElements(api, direction);
      console.log("[canvas-page] reordered selected canvas elements", {
        direction,
        ...result,
      });
      setContextMenuState(null);
      syncArchitectureContext(api.getSceneElements() as ArchitectureSceneElement[]);
    },
    [syncArchitectureContext],
  );

  const handleToggleLockedSelection = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (!api) {
      console.warn("[canvas-page] excalidraw API unavailable, cannot toggle selection lock");
      return;
    }

    const result = toggleLockSelectedCanvasElements(api);
    console.log("[canvas-page] toggled selected canvas element lock state", result);
    setContextMenuState(null);
    syncArchitectureContext(api.getSceneElements() as ArchitectureSceneElement[]);
  }, [syncArchitectureContext]);

  const handleDeleteSelection = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (!api) {
      console.warn("[canvas-page] excalidraw API unavailable, cannot delete selection");
      return;
    }

    const result = deleteSelectedCanvasElements(api);
    console.log("[canvas-page] deleted selected canvas elements", result);
    setContextMenuState(null);
    syncArchitectureContext(api.getSceneElements() as ArchitectureSceneElement[]);
  }, [syncArchitectureContext]);

  const handleCopySelection = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (!api) {
      console.warn("[canvas-page] excalidraw API unavailable, cannot copy selection");
      return;
    }

    const selectedIds = Object.entries(api.getAppState().selectedElementIds ?? {})
      .filter(([, selected]: [string, unknown]) => Boolean(selected))
      .map(([id]: [string, unknown]) => id);
    const selectedIdSet = new Set(selectedIds);
    const selectedSceneElements = (api.getSceneElements() as Record<string, any>[]).filter(
      (element) => !element.isDeleted && selectedIdSet.has(String(element.id)),
    );

    copiedSceneElementsRef.current = selectedSceneElements.map((element) =>
      JSON.parse(JSON.stringify(element)),
    );

    const nextCopiedFiles: Record<string, any> = {};
    const files = api.getFiles?.() ?? {};
    selectedSceneElements.forEach((element) => {
      if (element.fileId && files[element.fileId]) {
        nextCopiedFiles[element.fileId] = JSON.parse(
          JSON.stringify(files[element.fileId]),
        );
      }
    });
    copiedSceneFilesRef.current = nextCopiedFiles;

    console.log("[canvas-page] copied selected canvas elements", {
      copiedCount: copiedSceneElementsRef.current.length,
    });
    setContextMenuState(null);
  }, []);

  const handlePasteSelection = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (!api) {
      console.warn("[canvas-page] excalidraw API unavailable, cannot paste selection");
      return;
    }

    if (copiedSceneElementsRef.current.length === 0) {
      console.log("[canvas-page] paste ignored because clipboard is empty");
      setContextMenuState(null);
      return;
    }

    const offset = 24;
    const nextSelectedElementIds: Record<string, boolean> = {};
    const pastedElements = copiedSceneElementsRef.current.map((element) => {
      const nextId = createSceneCloneId();
      nextSelectedElementIds[nextId] = true;
      return {
        ...JSON.parse(JSON.stringify(element)),
        id: nextId,
        x: (element.x ?? 0) + offset,
        y: (element.y ?? 0) + offset,
        version: typeof element.version === "number" ? element.version + 1 : 1,
        versionNonce: Math.floor(Math.random() * 2_000_000_000),
        updated: Date.now(),
        isDeleted: false,
      };
    });

    const copiedFiles = Object.entries(copiedSceneFilesRef.current).map(
      ([id, file]) => ({
        id,
        dataURL: file.dataURL,
        mimeType: file.mimeType ?? "image/png",
        created: file.created ?? Date.now(),
      }),
    );

    if (copiedFiles.length > 0) {
      api.addFiles?.(copiedFiles);
    }

    api.updateScene({
      elements: [...api.getSceneElements(), ...pastedElements],
      appState: {
        ...api.getAppState(),
        selectedElementIds: nextSelectedElementIds,
      },
      captureUpdate: "IMMEDIATELY",
    });

    console.log("[canvas-page] pasted canvas clipboard", {
      pastedCount: pastedElements.length,
    });
    setContextMenuState(null);
    syncArchitectureContext(api.getSceneElements() as ArchitectureSceneElement[]);
  }, [syncArchitectureContext]);

  const handleUngroupSelection = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (!api) {
      console.warn("[canvas-page] excalidraw API unavailable, cannot ungroup selection");
      return;
    }

    const result = ungroupSelectedCanvasElements(api);
    console.log("[canvas-page] ungrouped selected canvas elements", result);
    setContextMenuState(null);
    syncArchitectureContext(api.getSceneElements() as ArchitectureSceneElement[]);
  }, [syncArchitectureContext]);

  const handleToggleSelectionVisibility = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (!api) {
      console.warn("[canvas-page] excalidraw API unavailable, cannot toggle selection visibility");
      return;
    }

    const result = toggleVisibilitySelectedCanvasElements(api);
    console.log("[canvas-page] toggled selected canvas element visibility", result);
    setContextMenuState(null);
    syncArchitectureContext(api.getSceneElements() as ArchitectureSceneElement[]);
  }, [syncArchitectureContext]);

  const handleShowAllCanvasElements = useCallback(() => {
    excalidrawApiRef.current?.scrollToContent?.();
    setContextMenuState(null);
  }, []);

  const handleExportCanvas = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (!api || !canvasData) {
      return;
    }

    const payload = {
      id: canvasData.id,
      name: canvasData.name,
      content: {
        elements: api.getSceneElements(),
        appState: api.getAppState(),
        files: api.getFiles?.() ?? {},
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${canvasData.name || "canvas"}.json`;
    anchor.rel = "noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setContextMenuState(null);
  }, [canvasData]);

  const handleImportCanvasChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      const api = excalidrawApiRef.current;
      if (!api) {
        return;
      }

      try {
        const raw = await file.text();
        const parsed = JSON.parse(raw) as {
          content?: {
            elements?: Record<string, any>[];
            appState?: Record<string, unknown>;
            files?: Record<string, { dataURL: string; mimeType?: string; created?: number }>;
          };
        };
        const content = parsed.content ?? parsed;
        const files = Object.entries(content.files ?? {}).map(([id, value]) => ({
          id,
          dataURL: value.dataURL,
          mimeType: value.mimeType ?? "image/png",
          created: value.created ?? Date.now(),
        }));

        if (files.length > 0) {
          api.addFiles?.(files);
        }

        api.updateScene({
          elements: content.elements ?? [],
          appState: {
            ...api.getAppState(),
            ...(content.appState ?? {}),
          },
          captureUpdate: "IMMEDIATELY",
        });

        console.log("[canvas-page] imported canvas scene", {
          elementCount: content.elements?.length ?? 0,
        });
      } catch (importError) {
        console.error("[canvas-page] failed to import canvas scene", importError);
      }
    },
    [],
  );

  const handleMergeSelection = useCallback(async () => {
    const api = excalidrawApiRef.current;
    if (!api) {
      console.warn("[canvas-page] excalidraw API unavailable, cannot merge selection");
      return;
    }

    const selectedIds = Object.entries(api.getAppState().selectedElementIds ?? {})
      .filter(([, selected]: [string, unknown]) => Boolean(selected))
      .map(([id]: [string, unknown]) => id);
    const selectedIdSet = new Set(selectedIds);
    const sceneElements = api.getSceneElements() as Record<string, any>[];
    const selectedImages = sceneElements.filter(
      (element) =>
        !element.isDeleted &&
        selectedIdSet.has(String(element.id)) &&
        element.type === "image" &&
        element.fileId,
    );

    if (selectedImages.length < 2) {
      console.log("[canvas-page] merge ignored because fewer than two images are selected");
      setContextMenuState(null);
      return;
    }

    try {
      const files = api.getFiles?.() ?? {};
      const loadedImages = await Promise.all(
        selectedImages.map(async (element) => {
          const file = element.fileId ? files[element.fileId] : null;
          const source =
            file?.dataURL ??
            element.customData?.storageUrl ??
            element.link ??
            null;
          if (!source) {
            throw new Error(`Missing image source for ${element.id}`);
          }

          return {
            element,
            image: await loadImageFromUrl(source),
          };
        }),
      );

      const minX = Math.min(...selectedImages.map((element) => element.x ?? 0));
      const minY = Math.min(...selectedImages.map((element) => element.y ?? 0));
      const maxX = Math.max(
        ...selectedImages.map((element) => (element.x ?? 0) + (element.width ?? 0)),
      );
      const maxY = Math.max(
        ...selectedImages.map((element) => (element.y ?? 0) + (element.height ?? 0)),
      );

      const width = Math.max(1, Math.round(maxX - minX));
      const height = Math.max(1, Math.round(maxY - minY));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Cannot create merge canvas context");
      }

      loadedImages.forEach(({ element, image }) => {
        context.drawImage(
          image,
          (element.x ?? 0) - minX,
          (element.y ?? 0) - minY,
          element.width ?? image.naturalWidth,
          element.height ?? image.naturalHeight,
        );
      });

      const mergedFileId = createSceneCloneId();
      const mergedDataUrl = canvas.toDataURL("image/png");
      api.addFiles?.([
        {
          id: mergedFileId,
          dataURL: mergedDataUrl,
          mimeType: "image/png",
          created: Date.now(),
        },
      ]);

      const updatedAt = Date.now();
      const nextElements = sceneElements.map((element) => {
        if (!selectedIdSet.has(String(element.id))) {
          return element;
        }

        return {
          ...element,
          isDeleted: true,
          version: typeof element.version === "number" ? element.version + 1 : 1,
          versionNonce: Math.floor(Math.random() * 2_000_000_000),
          updated: updatedAt,
        };
      });

      const mergedElement = createExcalidrawImageElement({
        fileId: mergedFileId,
        x: minX,
        y: minY,
        width,
        height,
        title: "合并图层",
        source: "uploaded",
      }) as Record<string, any>;

      api.updateScene({
        elements: [...nextElements, mergedElement],
        appState: {
          ...api.getAppState(),
          selectedElementIds: { [mergedElement.id as string]: true },
        },
        captureUpdate: "IMMEDIATELY",
      });

      console.log("[canvas-page] merged selected image layers", {
        mergedCount: selectedImages.length,
        mergedElementId: mergedElement.id,
      });
    } catch (mergeError) {
      console.error("[canvas-page] failed to merge selected images", mergeError);
    } finally {
      setContextMenuState(null);
      syncArchitectureContext(api.getSceneElements() as ArchitectureSceneElement[]);
    }
  }, [syncArchitectureContext]);

  const handleExportSelectedCanvasImage = useCallback(() => {
    if (!selectedCanvasImage) {
      return;
    }

    const imageUrl = selectedCanvasImage.storageUrl ?? selectedCanvasImage.dataUrl;
    if (!imageUrl) {
      return;
    }

    downloadUrlFile(imageUrl, `canvas-export-${selectedCanvasImage.id}.png`);
    setContextMenuState(null);
  }, [selectedCanvasImage]);

  const handleExportSelection = useCallback(async () => {
    if (selectedCanvasImage) {
      handleExportSelectedCanvasImage();
      return;
    }

    const api = excalidrawApiRef.current;
    if (!api) {
      console.warn("[canvas-page] excalidraw API unavailable, cannot export selection");
      return;
    }

    const selectedIds = Object.entries(api.getAppState().selectedElementIds ?? {})
      .filter(([, selected]: [string, unknown]) => Boolean(selected))
      .map(([id]: [string, unknown]) => id);
    const selectedIdSet = new Set(selectedIds);
    const sceneElements = api.getSceneElements() as Record<string, any>[];
    const files = api.getFiles?.() ?? {};
    const selectedImages = sceneElements.filter(
      (element) =>
        !element.isDeleted &&
        selectedIdSet.has(String(element.id)) &&
        element.type === "image",
    );

    if (selectedImages.length === 0) {
      console.warn("[canvas-page] selection export ignored because no image nodes are selected");
      return;
    }

    try {
      const loadedImages = await Promise.all(
        selectedImages.map(async (element) => {
          const source = getSceneImageSource(element, files);
          if (!source) {
            throw new Error(`Missing image source for ${element.id}`);
          }

          return {
            element,
            image: await loadImageFromUrl(source),
          };
        }),
      );

      const minX = Math.min(...selectedImages.map((element) => element.x ?? 0));
      const minY = Math.min(...selectedImages.map((element) => element.y ?? 0));
      const maxX = Math.max(
        ...selectedImages.map((element) => (element.x ?? 0) + (element.width ?? 0)),
      );
      const maxY = Math.max(
        ...selectedImages.map((element) => (element.y ?? 0) + (element.height ?? 0)),
      );

      const width = Math.max(1, Math.round(maxX - minX));
      const height = Math.max(1, Math.round(maxY - minY));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Cannot create selection export canvas context");
      }

      loadedImages.forEach(({ element, image }) => {
        context.drawImage(
          image,
          (element.x ?? 0) - minX,
          (element.y ?? 0) - minY,
          element.width ?? image.naturalWidth,
          element.height ?? image.naturalHeight,
        );
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((nextBlob) => {
          if (!nextBlob) {
            reject(new Error("Selection export produced an empty blob"));
            return;
          }

          resolve(nextBlob);
        }, "image/png");
      });

      downloadBlobFile(blob, "canvas-selection-export.png");
      console.log("[canvas-page] exported selected canvas images", {
        exportedCount: selectedImages.length,
        width,
        height,
      });
    } catch (exportError) {
      console.error("[canvas-page] failed to export selected canvas images", exportError);
    } finally {
      setContextMenuState(null);
    }
  }, [handleExportSelectedCanvasImage, selectedCanvasImage]);

  const contextMenuActions = useMemo<CanvasContextMenuAction[]>(() => {
    if (!contextMenuState) {
      return [];
    }

    if (contextMenuState.mode === "blank") {
      return [
        {
          id: "paste-selection",
          label: "粘贴",
          onSelect: handlePasteSelection,
        },
        {
          id: "show-all-elements",
          label: "显示画布所有元素",
          onSelect: handleShowAllCanvasElements,
        },
        {
          id: "export-canvas",
          label: "导出画布",
          onSelect: handleExportCanvas,
        },
        {
          id: "import-canvas",
          label: "导入画布",
          onSelect: () => canvasImportInputRef.current?.click(),
        },
      ];
    }

    if (contextMenuState.mode === "single-image") {
      return [
        {
          id: "copy-selection",
          label: "复制",
          onSelect: handleCopySelection,
        },
        {
          id: "paste-selection",
          label: "粘贴",
          onSelect: handlePasteSelection,
        },
        {
          id: "move-forward",
          label: "上移一层",
          onSelect: () => handleReorderSelectedElements("forward"),
        },
        {
          id: "move-backward",
          label: "下移一层",
          onSelect: () => handleReorderSelectedElements("backward"),
        },
        {
          id: "move-front",
          label: "移到顶层",
          onSelect: () => handleReorderSelectedElements("front"),
        },
        {
          id: "move-back",
          label: "移到底层",
          onSelect: () => handleReorderSelectedElements("back"),
        },
        {
          id: "attach-selection",
          label: "发送至对话",
          onSelect: () =>
            handleDispatchComposerCommand({
              type: "attach-selection",
            }),
        },
        {
          id: "group-selection",
          label: "创建编组",
          onSelect: handleGroupSelectedImages,
        },
        {
          id: "ungroup-selection",
          label: "解除编组",
          onSelect: handleUngroupSelection,
        },
        {
          id: "merge-selection",
          label: "合并图层",
          onSelect: handleMergeSelection,
        },
        {
          id: "toggle-visibility",
          label: "显示/隐藏",
          onSelect: handleToggleSelectionVisibility,
        },
        {
          id: selectionFullyLocked ? "unlock-selection" : "lock-selection",
          label: selectionFullyLocked ? "解锁" : "锁定",
          onSelect: handleToggleLockedSelection,
        },
        {
          id: "export-selection",
          label: "导出",
          onSelect: handleExportSelectedCanvasImage,
        },
        {
          id: "delete-selection",
          label: "删除",
          danger: true,
          dividerBefore: true,
          onSelect: handleDeleteSelection,
        },
      ];
    }

    if (contextMenuState.mode === "multi-image") {
      return [
        {
          id: "attach-selection",
          label: "发送至对话",
          onSelect: () =>
            handleDispatchComposerCommand({
              type: "attach-selection",
            }),
        },
        {
          id: "group-selection",
          label: "创建编组",
          onSelect: handleGroupSelectedImages,
        },
        {
          id: "ungroup-selection",
          label: "解除编组",
          onSelect: handleUngroupSelection,
        },
        {
          id: "merge-selection",
          label: "合并图层",
          onSelect: handleMergeSelection,
        },
        {
          id: "toggle-visibility",
          label: "显示/隐藏",
          onSelect: handleToggleSelectionVisibility,
        },
        {
          id: selectionFullyLocked ? "unlock-selection" : "lock-selection",
          label: selectionFullyLocked ? "解锁" : "锁定",
          onSelect: handleToggleLockedSelection,
        },
        {
          id: "export-selection",
          label: "导出",
          onSelect: handleExportSelection,
        },
        {
          id: "delete-selection",
          label: "删除",
          danger: true,
          dividerBefore: true,
          onSelect: handleDeleteSelection,
        },
      ];
    }

    return [
      {
        id: "copy-selection",
        label: "复制",
        onSelect: handleCopySelection,
      },
      {
        id: "paste-selection",
        label: "粘贴",
        onSelect: handlePasteSelection,
      },
      {
        id: "move-forward",
        label: "上移一层",
        onSelect: () => handleReorderSelectedElements("forward"),
      },
      {
        id: "move-backward",
        label: "下移一层",
        onSelect: () => handleReorderSelectedElements("backward"),
      },
      {
        id: "move-front",
        label: "移到顶层",
        onSelect: () => handleReorderSelectedElements("front"),
      },
      {
        id: "move-back",
        label: "移到底层",
        onSelect: () => handleReorderSelectedElements("back"),
      },
      {
        id: "group-selection",
        label: "创建编组",
        onSelect: handleGroupSelectedImages,
      },
      {
        id: "ungroup-selection",
        label: "解除编组",
        onSelect: handleUngroupSelection,
      },
      {
        id: "toggle-visibility",
        label: "显示/隐藏",
        onSelect: handleToggleSelectionVisibility,
      },
      {
        id: selectionFullyLocked ? "unlock-selection" : "lock-selection",
        label: selectionFullyLocked ? "解锁" : "锁定",
        onSelect: handleToggleLockedSelection,
      },
      {
        id: "delete-selection",
        label: "删除",
        danger: true,
        dividerBefore: true,
        onSelect: handleDeleteSelection,
      },
    ];
  }, [
    contextMenuState,
    handleDeleteSelection,
    handleDispatchComposerCommand,
    handleCopySelection,
    handleExportSelectedCanvasImage,
    handleExportSelection,
    handleGroupSelectedImages,
    handleMergeSelection,
    handlePasteSelection,
    handleReorderSelectedElements,
    handleShowAllCanvasElements,
    handleToggleSelectionVisibility,
    handleToggleLockedSelection,
    handleUngroupSelection,
    handleExportCanvas,
    selectionFullyLocked,
  ]);

  const handleImageGenerated = useCallback((artifact: ImageArtifact) => {
    const api = excalidrawApiRef.current;
    if (!api) return;
    insertImageOnCanvas(api, artifact).catch((err) => {
      console.warn("Failed to insert image on canvas:", err);
    });
  }, []);

  const handleVideoGenerated = useCallback((artifact: VideoArtifact) => {
    const api = excalidrawApiRef.current;
    if (!api) return;
    insertVideoOnCanvas(api, artifact).catch((err) => {
      console.warn("Failed to insert video on canvas:", err);
    });
  }, []);

  // Must be defined BEFORE useJobFallbackPolling which references it
  const handleCanvasSync = useCallback(async () => {
    const api = excalidrawApiRef.current;
    const token = accessTokenRef.current;
    if (!api || !token || !canvasData) return;
    try {
      const { canvas } = await fetchCanvas(token, canvasData.id);
      const elements = canvas.content.elements ?? [];
      const files = (canvas.content as Record<string, unknown>).files as
        Record<string, { id: string; dataURL: string; mimeType: string; created: number }> | undefined;

      // Sync files (base64 dataURLs from backend-inserted images) into Excalidraw
      if (files && Object.keys(files).length > 0) {
        api.addFiles(Object.values(files));
      }

      api.updateScene({ elements, captureUpdate: "IMMEDIATELY" });
    } catch (err) {
      console.warn("Failed to sync canvas:", err);
    }
  }, [canvasData]);
  const handleSyncRemoteChanges = useCallback(async () => {
    await handleCanvasSync();
    clearPendingRemoteMutation();
  }, [clearPendingRemoteMutation, handleCanvasSync]);

  // Fallback polling for timed-out generation jobs.
  // When the agent's tool times out but the worker eventually succeeds,
  // the backend will have already inserted the element into the canvas.
  // This hook detects completion and triggers a canvas re-fetch.
  const { checkForTimedOutJobs } = useJobFallbackPolling({
    accessTokenRef,
    onJobSucceeded: useCallback((_jobId: string, _jobType: string) => {
      // Element was inserted by backend — just refresh the canvas
      handleCanvasSync();
    }, [handleCanvasSync]),
  });

  const handleSessionChange = useCallback(
    (sessionId: string) => {
      if (!canvasId) return;
      // Update URL: set session param, remove prompt param to prevent re-send on refresh
      routerRef.current.replace(
        buildCanvasUrl(canvasId, {
          sessionId,
          studio: architectureMode ? "architecture" : "classic",
        }),
      );
    },
    [architectureMode, canvasId],
  );

  const handleRequestCanvasImages = useCallback((): CanvasImageItem[] => {
    const api = excalidrawApiRef.current;
    if (!api) return [];
    const elements: any[] = api.getSceneElements() ?? [];
    const files: Record<string, any> = api.getFiles() ?? {};
    let idx = 0;
    return elements
      .filter((el: any) => el.type === "image" && !el.isDeleted && el.fileId)
      .map((el: any) => {
        idx++;
        const file = files[el.fileId];
        const dataURL = file?.dataURL ?? "";
        const title =
          el.customData?.title ||
          el.customData?.label ||
          getCanvasImageFallbackName(idx);
        return {
          kind: "canvas-image",
          id: el.id,
          name: title,
          thumbnailUrl: dataURL,
          assetId: el.id,
          url: dataURL,
          mimeType: file?.mimeType ?? "image/png",
        };
      });
  }, []);
  const architectureZoomLabel = `${Math.round((canvasViewport.zoom || 1) * 100)}%`;
  const architectureCreditsLabel = creditsLoading
    ? "--次"
    : `${Math.max(0, Math.round(creditBalance))}次`;

  useEffect(() => {
    selectedElementIdsRef.current = selectedCanvasElements.map((element) => element.id);
    reportSelection(
      selectedElementIdsRef.current,
    );
    syncArchitectureContext();
  }, [reportSelection, selectedCanvasElements, syncArchitectureContext]);

  useEffect(() => {
    if (!architectureMode || !excalidrawApi?.onChange) return;

    const unsubscribe = excalidrawApi.onChange((elements: readonly ArchitectureSceneElement[]) => {
      syncArchitectureContext(elements);
    });

    return unsubscribe;
  }, [architectureMode, excalidrawApi, syncArchitectureContext]);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      routerRef.current.replace("/login");
      return;
    }
    const token = accessTokenRef.current;
    if (!canvasId || !token) return;

    setPageLoading(true);
    fetchCanvas(token, canvasId)
      .then((data) => {
        const c = data.canvas;
        setCanvasData({
          id: c.id,
          name: c.name,
          projectId: c.projectId,
          content: {
            elements: c.content.elements ?? [],
            appState: c.content.appState ?? {},
            files: (c.content as any).files ?? {},
          },
        });
        setPageLoading(false);
        // Fetch project to get brand_kit_id and name
        fetchProject(token, c.projectId)
          .then((projectData) => {
            setBrandKitId(projectData.project.brand_kit_id);
            setProjectName(normalizeProjectDisplayName(projectData.project.name));
          })
          .catch((err) => console.warn("Failed to fetch project for brand kit:", err));
      })
      .catch((err) => {
        if (err instanceof ApiAuthError) {
          signOutRef.current().then(() => routerRef.current.replace("/login"));
          return;
        }
        setError(LOAD_CANVAS_FAILED_MESSAGE);
        setPageLoading(false);
      });
    // Intentionally omitting accessTokenRef (stable ref) and signOutRef/routerRef
    // (ref wrappers) from deps — only re-run when auth resolves, user changes, or
    // canvasId changes. Token refresh (e.g. tab switch) must NOT trigger a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId, canvasId]);

  if (!canvasId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">{NO_CANVAS_ID_MESSAGE}</p>
      </div>
    );
  }

  if (authLoading || pageLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!canvasData || !accessToken) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <div className="flex-1 relative min-w-0 overflow-hidden">
        <div className="absolute left-4 top-4 z-20 flex items-center gap-3 rounded-[10px] border border-slate-200 bg-white/96 px-3 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
          <CanvasLogoMenu
            accessToken={accessToken}
            projectId={canvasData.projectId}
            canvasId={canvasData.id}
            excalidrawApi={excalidrawApi}
          />
          <EditableProjectName
            accessToken={accessToken}
            projectId={canvasData.projectId}
            initialName={projectName}
          />
        </div>
        {architectureMode ? (
          <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-[10px] border border-slate-200 bg-white/96 p-1 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
              <button
                type="button"
                aria-label="缩小画布"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-700 transition-colors hover:bg-slate-100"
                onClick={handleZoomOut}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M7 12h10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <div className="min-w-[52px] text-center text-sm font-medium text-slate-900">
                {architectureZoomLabel}
              </div>
              <button
                type="button"
                aria-label="放大画布"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-700 transition-colors hover:bg-slate-100"
                onClick={handleZoomIn}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 7v10M7 12h10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="inline-flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white/96 px-2 py-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
              <span className="text-sm font-medium text-slate-900">
                {architectureCreditsLabel}
              </span>
              <button
                type="button"
                className="inline-flex h-8 items-center rounded-[8px] border border-slate-300 bg-slate-100 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                onClick={handleOpenRecharge}
              >
                充值
              </button>
            </div>
            <button
              type="button"
              onClick={handleToggleChat}
              className={`inline-flex items-center gap-2 rounded-[10px] border px-3 py-2 text-sm font-medium shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition-colors ${
                chatOpen
                  ? "border-slate-300 bg-white text-slate-900"
                  : "border-slate-200 bg-white/96 text-slate-700 hover:bg-white"
              }`}
              aria-pressed={chatOpen}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5.75 4A3.75 3.75 0 0 0 2 7.75v7.5A3.75 3.75 0 0 0 5.75 19h2.97c.14 0 .28.05.39.14l2.42 1.95c.28.22.67.22.95 0l2.42-1.95c.11-.09.25-.14.39-.14h2.97A3.75 3.75 0 0 0 22 15.25v-7.5A3.75 3.75 0 0 0 18.25 4z"
                  fill="currentColor"
                />
                <circle cx="8.25" cy="11.5" r="1" fill="#fff" />
                <circle cx="12" cy="11.5" r="1" fill="#fff" />
                <circle cx="15.75" cy="11.5" r="1" fill="#fff" />
              </svg>
              <span>对话</span>
            </button>
          </div>
        ) : null}
        <CanvasEditor
          canvasId={canvasData.id}
          projectId={canvasData.projectId}
          accessToken={accessToken}
          immersiveArchitecture={architectureMode}
          initialContent={canvasData.content}
          onApiReady={handleApiReady}
          onInsertReferenceBoard={() =>
            handleInsertArchitectureBoard("reference_board")
          }
          onPointerChange={reportCursor}
          onSeedArchitectureBoardStack={handleInsertArchitectureBoardStack}
          remoteCursors={remoteCursors}
          ws={ws}
          leftPanelOpen={layersPanelOpen}
          onSelectionChange={handleSelectedCanvasElementsChange}
          onViewportChange={setCanvasViewport}
          onContextMenuRequest={handleRequestContextMenu}
          onSelectionIntent={handleCanvasSelectionIntent}
          onUploadReference={() => referenceUploadInputRef.current?.click()}
        />
        {architectureMode ? (
          <>
            <CanvasLayersPanel
              excalidrawApi={excalidrawApi}
              open={layersPanelOpen}
              onClose={handleCloseLayersPanel}
            />
            <button
              type="button"
              aria-pressed={layersPanelOpen}
              aria-label="图层"
              className={`absolute bottom-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-[10px] border shadow-[0_18px_40px_rgba(15,23,42,0.12)] transition-[left,background-color,border-color,color] duration-200 ${
                layersPanelOpen
                  ? "border-slate-300 bg-white text-slate-900"
                  : "border-slate-200 bg-white/96 text-slate-700 hover:bg-white"
              }`}
              style={{ left: layersPanelOpen ? 296 : 16 }}
              onClick={handleToggleLayersPanel}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 6.75A1.75 1.75 0 0 1 5.75 5h12.5A1.75 1.75 0 0 1 20 6.75v1.5A1.75 1.75 0 0 1 18.25 10H5.75A1.75 1.75 0 0 1 4 8.25zM4 15.75A1.75 1.75 0 0 1 5.75 14h12.5A1.75 1.75 0 0 1 20 15.75v1.5A1.75 1.75 0 0 1 18.25 19H5.75A1.75 1.75 0 0 1 4 17.25z"
                  fill="currentColor"
                />
              </svg>
              <span className="sr-only">图层</span>
            </button>
          </>
        ) : null}
        {architectureMode &&
        selectedImageActionBarPosition &&
        (selectedCanvasImage || showMultiImageSelectionActionBar) ? (
          <CanvasSelectionActionBar
            selection={selectedCanvasElements}
            position={selectedImageActionBarPosition}
            mode={showMultiImageSelectionActionBar ? "multi-image" : "single-image"}
            onSendToChat={handleSendSelectionToChat}
            onGroup={handleGroupSelectedImages}
            onMerge={handleMergeSelection}
            onEdit={handleEditSelectedCanvasImage}
            onDoodle={() => handleActivateSelectionTool("freedraw")}
            onText={() => handleActivateSelectionTool("text")}
          />
        ) : null}
        <CanvasContextMenu
          open={Boolean(contextMenuState)}
          mode={contextMenuState?.mode ?? "blank"}
          position={{
            x: contextMenuState?.x ?? 0,
            y: contextMenuState?.y ?? 0,
          }}
          actions={contextMenuActions}
          onClose={handleCloseContextMenu}
        />
        {architectureMode ? null : (
          <CanvasEmptyHint
            excalidrawApi={excalidrawApi}
            onOpenChat={handleOpenChat}
          />
        )}
        <ChatSidebar
          accessToken={accessToken}
          canvasId={canvasData.id}
          collapsedLabel="对话"
          {...(architectureMode
            ? {
                architectureContext,
                immersive: true,
                panelTitle: "创作记录",
              }
            : {})}
          open={chatOpen}
          onToggle={handleToggleChat}
          onImageGenerated={handleImageGenerated}
          onVideoGenerated={handleVideoGenerated}
          onCanvasSync={handleCanvasSync}
          onStreamEvent={checkForTimedOutJobs}
          initialPrompt={initialPrompt}
          initialSessionId={initialSessionId}
          onSessionChange={handleSessionChange}
          onRequestCanvasImages={handleRequestCanvasImages}
          currentBrandKitId={brandKitId}
          ws={ws}
          selectedCanvasElements={selectedCanvasElements}
          generatedFilesApi={excalidrawApi}
          composerCommand={composerCommand}
          onComposerCommandHandled={handleComposerCommandHandled}
        />
        <input
          ref={referenceUploadInputRef}
          hidden
          type="file"
          accept="image/*"
          multiple
          onChange={handleReferenceUploadChange}
        />
        <input
          ref={canvasImportInputRef}
          hidden
          type="file"
          accept="application/json,.json"
          onChange={handleImportCanvasChange}
        />
      </div>
    </div>
  );
}

export default function CanvasPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CanvasPageContent />
    </Suspense>
  );
}
