"use client";

import "@excalidraw/excalidraw/index.css";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState, memo, type PointerEvent as ReactPointerEvent } from "react";

import type { CanvasCollaborator, CanvasCursor } from "@loomic/shared";
import type { WebSocketHandle } from "../hooks/use-websocket";
import { getServerBaseUrl } from "../lib/env";
import { saveCanvas, uploadThumbnail } from "../lib/server-api";
import { VideoCanvasElement } from "./canvas/video-canvas-element";
import { isVideoUrl } from "../lib/canvas-elements";
import { CanvasToolMenu } from "./canvas-tool-menu";
import { normalizeCanvasElements } from "../lib/canvas-normalize";
import { ErrorBoundary } from "./error-boundary";
import { extractSelectedCanvasElements } from "../lib/canvas-selection";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  { ssr: false },
);

// Safari <16.4 does not support requestIdleCallback — provide a fallback
// that defers via setTimeout(cb, 1) to approximate idle scheduling.
const ric: typeof requestIdleCallback =
  typeof window !== "undefined" && window.requestIdleCallback
    ? window.requestIdleCallback.bind(window)
    : ((cb: IdleRequestCallback) => setTimeout(cb, 1) as unknown as number);
const cic: typeof cancelIdleCallback =
  typeof window !== "undefined" && window.cancelIdleCallback
    ? window.cancelIdleCallback.bind(window)
    : clearTimeout;

// Memoize CanvasToolMenu to prevent re-renders when parent state changes
// (e.g. selection changes in the editor don't need to re-render the toolbar)
const MemoizedCanvasToolMenu = memo(CanvasToolMenu);

export type CanvasSelectedElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  locked?: boolean;
  text?: string;
  fileId?: string;
  dataUrl?: string;
  /** Supabase storage public URL -- prefer over dataUrl for message attachments */
  storageUrl?: string;
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
};

export type CanvasViewportState = {
  scrollX: number;
  scrollY: number;
  zoom: number;
};

export type RemoteCanvasCursor = {
  collaborator: CanvasCollaborator;
  cursor: CanvasCursor;
};

type CanvasEditorProps = {
  canvasId: string;
  projectId: string;
  accessToken: string;
  immersiveArchitecture?: boolean;
  initialContent: {
    elements: Record<string, unknown>[];
    appState: Record<string, unknown>;
    files: Record<string, Record<string, unknown>>;
  };
  onApiReady?: (api: any) => void;
  ws?: WebSocketHandle;
  leftPanelOpen?: boolean;
  onSelectionChange?: (elements: CanvasSelectedElement[]) => void;
  onViewportChange?: (viewport: CanvasViewportState) => void;
  onPointerChange?: (cursor: CanvasCursor | null) => void;
  onInsertReferenceBoard?: () => void;
  onSeedArchitectureBoardStack?: () => void;
  remoteCursors?: RemoteCanvasCursor[];
  onContextMenuRequest?: (payload: {
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    selectedElements: CanvasSelectedElement[];
  }) => void;
  onSelectionIntent?: (intent: "left" | "right") => void;
  onUploadReference?: () => void;
};

const SAVE_DEBOUNCE_MS = 1500;
const THUMBNAIL_DEBOUNCE_MS = 10_000;
const THUMBNAIL_MAX_SIZE = 400;

function serializeCanvasContent(options: {
  api: {
    getFiles?: () => Record<string, any>;
  };
  appState: any;
  elements: readonly any[];
}) {
  const files: Record<string, Record<string, unknown>> = {};
  const rawFiles = options.api.getFiles?.() as Record<string, any> | undefined;

  for (const [id, file] of Object.entries(rawFiles ?? {})) {
    files[id] = {
      id: file.id,
      dataURL: file.dataURL,
      mimeType: file.mimeType,
      created: file.created,
    };
  }

  return {
    elements: options.elements.filter(
      (element: any) => !element.isDeleted,
    ) as Record<string, unknown>[],
    appState: {
      viewBackgroundColor: options.appState.viewBackgroundColor,
      gridModeEnabled: options.appState.gridModeEnabled,
    },
    files,
  };
}

function isContextMenuTargetBlocked(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) {
    return false;
  }

  return Boolean(
    element.closest(
      "button, input, textarea, [role='menu'], [role='dialog'], [contenteditable='true']",
    ),
  );
}

export function CanvasEditor({
  canvasId,
  projectId,
  accessToken,
  immersiveArchitecture = false,
  initialContent,
  onApiReady,
  ws,
  leftPanelOpen,
  onSelectionChange,
  onViewportChange,
  onPointerChange,
  onInsertReferenceBoard,
  onSeedArchitectureBoardStack,
  remoteCursors = [],
  onContextMenuRequest,
  onSelectionIntent,
  onUploadReference,
}: CanvasEditorProps) {
  const { resolvedTheme } = useTheme();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbnailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;
  const canvasIdRef = useRef(canvasId);
  canvasIdRef.current = canvasId;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const excalidrawApiRef = useRef<any>(null);
  const rightClickInterceptedRef = useRef(false);
  const [excalidrawApi, setExcalidrawApi] = useState<any>(null);
  const prevSelectedIdsRef = useRef<string>("");
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;
  const onPointerChangeRef = useRef(onPointerChange);
  onPointerChangeRef.current = onPointerChange;
  const prevViewportKeyRef = useRef("");
  // Tracks whether the one-time normalization pass has already run
  const normalizedRef = useRef(false);

  // Guard: prevent auto-save until Excalidraw has fully hydrated with initial data.
  // Without this, a page reload can fire onChange with empty elements before
  // initialData is applied, causing a FULL REPLACE that wipes existing content.
  const hydratedRef = useRef(false);
  const initialElementCountRef = useRef(initialContent.elements.filter((e) => !e.isDeleted).length);

  // Track pending save payload so we can flush on tab close / unmount
  const pendingSaveRef = useRef<{
    elements: Record<string, unknown>[];
    appState: Record<string, unknown>;
    files: Record<string, Record<string, unknown>>;
  } | null>(null);

  // Ref to hold initialContent.files for storageUrl lookup in handleChange
  // without adding the full initialContent to the dependency array.
  const initialFilesRef = useRef(initialContent.files);
  initialFilesRef.current = initialContent.files;

  const queueCanvasSave = useCallback(
    (options: {
      api?: any;
      appState?: any;
      elements?: readonly any[];
      source: "change" | "programmatic";
    }) => {
      if (!hydratedRef.current) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      pendingSaveRef.current = { elements: [] as any, appState: {}, files: {} };

      saveTimerRef.current = setTimeout(() => {
        const api = options.api ?? excalidrawApiRef.current;
        if (!api) {
          return;
        }

        const content = serializeCanvasContent({
          api,
          appState: options.appState ?? api.getAppState(),
          elements: options.elements ?? api.getSceneElements(),
        });
        pendingSaveRef.current = content;

        saveCanvas(accessTokenRef.current, canvasIdRef.current, content)
          .then(() => {
            if (pendingSaveRef.current === content) {
              pendingSaveRef.current = null;
            }
            console.log("[canvas-editor] save persisted", {
              canvasId: canvasIdRef.current,
              elementCount: content.elements.length,
              source: options.source,
            });
          })
          .catch((err) => console.error("[canvas-editor] save failed:", err));
      }, SAVE_DEBOUNCE_MS);
    },
    [],
  );

  // Separate inline files (ready) from storage URLs (need async fetch)
  const { inlineFiles, pendingUrls } = useMemo(() => {
    const inline: Record<string, Record<string, unknown>> = {};
    const pending: Array<{ fileId: string; url: string; meta: Record<string, unknown> }> = [];
    for (const [fileId, fileData] of Object.entries(initialContent.files)) {
      if (typeof fileData.storageUrl === "string" && fileData.storageUrl) {
        pending.push({ fileId, url: fileData.storageUrl, meta: fileData });
      } else {
        inline[fileId] = fileData;
      }
    }
    return { inlineFiles: inline, pendingUrls: pending };
  }, [initialContent.files]);

  // Lazily resolve storage URLs and inject into Excalidraw
  useEffect(() => {
    if (!excalidrawApi || pendingUrls.length === 0) return;
    let cancelled = false;

    async function resolveFiles() {
      const resolved: Record<string, any> = {};
      await Promise.all(
        pendingUrls.map(async ({ fileId, url, meta }) => {
          try {
            const resp = await fetch(url);
            if (!resp.ok) {
              console.warn(`[canvas-editor] Failed to fetch file ${fileId}: ${resp.status}`);
              return;
            }
            const blob = await resp.blob();
            const reader = new FileReader();
            const dataURL = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            resolved[fileId] = {
              id: meta.id ?? fileId,
              mimeType: meta.mimeType ?? blob.type,
              created: meta.created ?? Date.now(),
              dataURL,
            };
          } catch (err) {
            console.warn(`[canvas-editor] Failed to resolve file ${fileId}:`, err);
          }
        }),
      );
      if (!cancelled && Object.keys(resolved).length > 0) {
        excalidrawApi.addFiles(Object.values(resolved));
        console.log(`[canvas-editor] Resolved ${Object.keys(resolved).length} storage files`);
      }
    }

    resolveFiles();
    return () => { cancelled = true; };
  }, [excalidrawApi, pendingUrls]);

  const syncViewport = useCallback((appState: any) => {
    const nextViewport = {
      scrollX: appState?.scrollX ?? 0,
      scrollY: appState?.scrollY ?? 0,
      zoom: appState?.zoom?.value ?? 1,
    };
    const nextViewportKey = `${nextViewport.scrollX}:${nextViewport.scrollY}:${nextViewport.zoom}`;

    if (nextViewportKey === prevViewportKeyRef.current) {
      return;
    }

    prevViewportKeyRef.current = nextViewportKey;
    onViewportChangeRef.current?.(nextViewport);
  }, []);

  const handleExcalidrawApi = useCallback(
    (api: any) => {
      const patchedApi = api as any;
      if (!patchedApi.__loomicProgrammaticSaveWrapped) {
        const originalUpdateScene = api.updateScene.bind(api);
        patchedApi.__loomicProgrammaticSaveWrapped = true;
        patchedApi.updateScene = (scene: any) => {
          originalUpdateScene(scene);

          if (
            hydratedRef.current &&
            Array.isArray(scene?.elements) &&
            scene.captureUpdate !== "NONE"
          ) {
            queueCanvasSave({
              api: patchedApi,
              source: "programmatic",
            });
          }
        };
      }

      excalidrawApiRef.current = patchedApi;
      setExcalidrawApi(patchedApi);
      syncViewport(patchedApi.getAppState?.());
      onApiReady?.(patchedApi);
    },
    [onApiReady, queueCanvasSave, syncViewport],
  );

  // Normalize agent-created elements on initial load.
  // Uses DOM text measurement to fix server-side approximation errors.
  useEffect(() => {
    if (!excalidrawApi || normalizedRef.current) return;
    normalizedRef.current = true;

    if (initialElementCountRef.current === 0 && pendingUrls.length === 0) {
      hydratedRef.current = true;
    }

    // Run normalization after Excalidraw has loaded fonts.
    // Store the handle so we can cancel on unmount to prevent memory leaks.
    const idleHandle = ric(() => {
      try {
        const sceneElements = excalidrawApi.getSceneElements();
        // Create mutable copies for normalization
        const mutableElements = sceneElements.map((el: any) => ({ ...el }));
        const { changed } = normalizeCanvasElements(mutableElements);

        if (changed) {
          console.log("[canvas-editor] normalized agent-created elements");
          excalidrawApi.updateScene({
            elements: mutableElements,
            captureUpdate: "NONE",
          });
          // Persist normalized elements to DB
          const files: Record<string, Record<string, unknown>> = {};
          const rawFiles = excalidrawApi.getFiles() as Record<string, any>;
          for (const [id, file] of Object.entries(rawFiles)) {
            files[id] = { id: file.id, dataURL: file.dataURL, mimeType: file.mimeType, created: file.created };
          }
          const appState = excalidrawApi.getAppState();
          saveCanvas(accessTokenRef.current, canvasIdRef.current, {
            elements: mutableElements.filter((el: any) => !el.isDeleted),
            appState: { viewBackgroundColor: appState.viewBackgroundColor, gridModeEnabled: appState.gridModeEnabled },
            files,
          }).catch((err: Error) => console.warn("[canvas-editor] normalization save failed:", err));
        }
      } catch (err) {
        console.warn("[canvas-editor] normalization failed:", err);
      }

      // Mark hydrated after normalization — auto-save is now safe.
      // Before this point, onChange may fire with incomplete element lists
      // during Excalidraw's internal initialization, which would cause a
      // FULL REPLACE with empty content and silently wipe existing data.
      hydratedRef.current = true;
    });
    return () => cic(idleHandle);
  }, [excalidrawApi]);

  const handleChange = useCallback(
    (elements: readonly any[], appState: any) => {
      syncViewport(appState);

      // Skip auto-save until Excalidraw has fully hydrated with initial data.
      // During initialization, onChange may fire with empty/partial elements
      // which would wipe the persisted canvas via FULL REPLACE.
      if (!hydratedRef.current) return;

      // --- 1. Debounced save ---
      queueCanvasSave({
        api: excalidrawApiRef.current ?? excalidrawApi,
        appState,
        elements,
        source: "change",
      });

      // --- 2. Debounced thumbnail (runs much less frequently than save) ---
      if (thumbnailTimerRef.current) clearTimeout(thumbnailTimerRef.current);
      thumbnailTimerRef.current = setTimeout(async () => {
        if (!excalidrawApi) return;
        try {
          const { exportToBlob } = await import("@excalidraw/excalidraw");
          const sceneElements = excalidrawApi.getSceneElements();
          const sceneFiles = excalidrawApi.getFiles();
          if (!sceneElements.length) return;

          const blob = await exportToBlob({
            elements: sceneElements,
            appState: { exportBackground: true },
            files: sceneFiles,
            mimeType: "image/webp",
            quality: 0.8,
            maxWidthOrHeight: THUMBNAIL_MAX_SIZE,
          });

          console.log("[canvas-editor] uploading thumbnail, blob size:", blob.size);
          await uploadThumbnail(accessTokenRef.current, projectId, blob);
          console.log("[canvas-editor] thumbnail uploaded OK");
        } catch (err) {
          console.warn("[canvas-editor] thumbnail generation/upload failed:", err);
        }
      }, THUMBNAIL_DEBOUNCE_MS);

      // --- 3. Selection change detection ---
      // Cheap string comparison avoids unnecessary downstream re-renders.
      const selectedIds = appState.selectedElementIds
        ? Object.keys(appState.selectedElementIds as Record<string, boolean>).filter(
            (id) => (appState.selectedElementIds as Record<string, boolean>)[id],
          ).sort().join(",")
        : "";

      if (selectedIds !== prevSelectedIdsRef.current) {
        prevSelectedIdsRef.current = selectedIds;
        if (onSelectionChangeRef.current) {
          if (!selectedIds) {
            onSelectionChangeRef.current([]);
          } else {
            const selected = extractSelectedCanvasElements({
              elements,
              files: excalidrawApi?.getFiles() ?? {},
              initialFiles: initialFilesRef.current,
              selectedElementIds: appState.selectedElementIds ?? {},
            });
            onSelectionChangeRef.current(selected);
          }
        }
      }
    },
    [projectId, excalidrawApi, queueCanvasSave, syncViewport],
  );

  // Register screenshot RPC handler so the server can request canvas captures
  useEffect(() => {
    if (!ws || !excalidrawApi) return;

    const cleanup = ws.registerRPC(
      "canvas.screenshot",
      async (params) => {
        const { mode, region, max_dimension = 1024 } = params as {
          mode: string;
          region?: { x: number; y: number; width: number; height: number };
          max_dimension?: number;
        };

        const allElements = excalidrawApi
          .getSceneElements()
          .filter((e: any) => !e.isDeleted);
        const appState = excalidrawApi.getAppState();
        const files = excalidrawApi.getFiles();

        let elements = allElements;

        if (mode === "region" && region) {
          elements = allElements.filter((el: any) => {
            const ex = (el.x as number) ?? 0;
            const ey = (el.y as number) ?? 0;
            const ew = (el.width as number) ?? 0;
            const eh = (el.height as number) ?? 0;
            return !(
              ex + ew < region.x ||
              ex > region.x + region.width ||
              ey + eh < region.y ||
              ey > region.y + region.height
            );
          });
        } else if (mode === "viewport") {
          const zoom = (appState.zoom?.value as number) ?? 1;
          const sx = -((appState.scrollX as number) ?? 0);
          const sy = -((appState.scrollY as number) ?? 0);
          const vw = ((appState.width as number) ?? 1920) / zoom;
          const vh = ((appState.height as number) ?? 1080) / zoom;
          elements = allElements.filter((el: any) => {
            const ex = (el.x as number) ?? 0;
            const ey = (el.y as number) ?? 0;
            const ew = (el.width as number) ?? 0;
            const eh = (el.height as number) ?? 0;
            return !(
              ex + ew < sx || ex > sx + vw || ey + eh < sy || ey > sy + vh
            );
          });
        }

        const { exportToBlob } = await import("@excalidraw/excalidraw");
        const blob = await exportToBlob({
          elements,
          appState: { ...appState, exportBackground: true },
          files,
          maxWidthOrHeight: max_dimension,
          mimeType: "image/png",
        });

        // Convert blob to base64 data URL directly (no upload needed --
        // the image is passed inline to the model for visual understanding)
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to convert screenshot to data URL"));
          reader.readAsDataURL(blob);
        });

        const bmp = await createImageBitmap(blob);
        const width = bmp.width;
        const height = bmp.height;
        bmp.close();

        return { url: dataUrl, width, height };
      },
    );

    return cleanup;
  }, [ws, excalidrawApi, canvasId]);

  // Build a full save payload from current Excalidraw state.
  // Used by both beforeunload and unmount to flush pending changes.
  const buildSavePayload = useCallback(() => {
    if (!excalidrawApi) return null;
    // Never flush before hydration — Excalidraw may not have loaded elements yet
    if (!hydratedRef.current) return null;
    try {
      const sceneElements = excalidrawApi.getSceneElements();
      const appState = excalidrawApi.getAppState();

      // Safety: refuse to save empty when we loaded with elements — prevents
      // race conditions from wiping canvas content during page teardown.
      const liveCount = sceneElements.filter((el: any) => !el.isDeleted).length;
      if (liveCount === 0 && initialElementCountRef.current > 0) {
        console.warn("[canvas-editor] skipping save: 0 elements but loaded with", initialElementCountRef.current);
        return null;
      }
      return serializeCanvasContent({
        api: excalidrawApi,
        appState,
        elements: sceneElements,
      });
    } catch (err) {
      console.warn("[canvas-editor] failed to build save payload on flush:", err);
      return null;
    }
  }, [excalidrawApi]);

  // Keep buildSavePayload accessible without stale closures
  const buildSavePayloadRef = useRef(buildSavePayload);
  buildSavePayloadRef.current = buildSavePayload;

  // Flush pending save on page close (beforeunload) and component unmount
  useEffect(() => {
    const flushBeforeUnload = () => {
      if (!pendingSaveRef.current) return;

      // Build the real payload since pendingSaveRef may hold a placeholder
      const payload = buildSavePayloadRef.current();
      if (!payload) return;

      // Use fetch with keepalive to ensure the request survives page teardown.
      // keepalive requests are limited to 64 KiB total in-flight per page; for
      // canvases with very large embedded files this may exceed the limit, but
      // it's the best-effort approach -- sendBeacon has the same constraint.
      const url = `${getServerBaseUrl()}/api/canvases/${canvasIdRef.current}`;
      try {
        fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessTokenRef.current}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: payload }),
          keepalive: true,
        });
      } catch {
        // Best-effort -- nothing we can do if it fails during page teardown
      }
      pendingSaveRef.current = null;
    };

    window.addEventListener("beforeunload", flushBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", flushBeforeUnload);

      // Cancel pending debounce timers
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (thumbnailTimerRef.current) clearTimeout(thumbnailTimerRef.current);

      // Flush pending save on component unmount (e.g. SPA navigation)
      if (pendingSaveRef.current) {
        const payload = buildSavePayloadRef.current();
        if (payload) {
          saveCanvas(accessTokenRef.current, canvasIdRef.current, payload).catch(
            console.error,
          );
        }
        pendingSaveRef.current = null;
      }
    };
  }, []);

  // Render custom embeddable content for video elements on canvas.
  // Excalidraw calls this for every embeddable element; we intercept video URLs
  // and render an inline player, falling back to default for everything else.
  const renderEmbeddable = useCallback(
    (element: any, _appState: any) => {
      const link = element?.link;
      if (typeof link === "string" && isVideoUrl(link)) {
        return (
          <VideoCanvasElement
            src={link}
            width={element.width ?? 640}
            height={element.height ?? 360}
          />
        );
      }
      // Return null to let Excalidraw handle non-video embeddables with default behavior
      return null;
    },
    [],
  );

  // Allow any URL as a valid embeddable so our video links are accepted
  const validateEmbeddable = useCallback(() => true, []);

  const emitPointerCursor = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
      button: "down" | "up" = event.buttons > 0 ? "down" : "up",
    ) => {
      if (!onPointerChangeRef.current) return;

      const bounds = event.currentTarget.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;

      onPointerChangeRef.current({
        x: Math.min(Math.max(x, 0), 1),
        y: Math.min(Math.max(y, 0), 1),
        tool: "pointer",
        button,
      });
    },
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onContextMenuRequest) {
      return;
    }

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (event.button !== 2) {
        rightClickInterceptedRef.current = false;
        return;
      }

      if (isContextMenuTargetBlocked(event.target)) {
        rightClickInterceptedRef.current = false;
        return;
      }

      rightClickInterceptedRef.current = true;
      onSelectionIntent?.("right");
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const bounds = container.getBoundingClientRect();
      console.log("[canvas-editor] intercepted right-click", {
        clientX: event.clientX,
        clientY: event.clientY,
      });
      onContextMenuRequest({
        x: Math.max(event.clientX - bounds.left, 0),
        y: Math.max(event.clientY - bounds.top, 0),
        clientX: event.clientX,
        clientY: event.clientY,
        selectedElements: extractSelectedCanvasElements({
          elements: excalidrawApiRef.current?.getSceneElements?.() ?? [],
          files: excalidrawApiRef.current?.getFiles?.() ?? {},
          initialFiles: initialFilesRef.current,
          selectedElementIds:
            excalidrawApiRef.current?.getAppState?.()?.selectedElementIds ?? {},
        }),
      });
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (!rightClickInterceptedRef.current) {
        return;
      }

      rightClickInterceptedRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    container.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    container.addEventListener("contextmenu", handleContextMenu, {
      capture: true,
    });

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      container.removeEventListener("contextmenu", handleContextMenu, {
        capture: true,
      });
    };
  }, [onContextMenuRequest]);

  return (
    <ErrorBoundary
      onError={(err) => console.error("[canvas-editor] render crashed:", err)}
    >
      <div
        ref={containerRef}
        className="h-full w-full relative"
        onPointerDown={(event) => {
          if (event.button === 0 && !isContextMenuTargetBlocked(event.target)) {
            onSelectionIntent?.("left");
          }
          emitPointerCursor(event, "down");
        }}
        onPointerLeave={() => onPointerChangeRef.current?.(null)}
        onPointerMove={(event) => emitPointerCursor(event)}
        onPointerUp={(event) => emitPointerCursor(event, "up")}
      >
        <Excalidraw
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          langCode="zh-CN"
          initialData={{
            elements: initialContent.elements as any,
            appState: initialContent.appState as any,
            files: inlineFiles as any,
          }}
          onChange={handleChange}
          excalidrawAPI={handleExcalidrawApi}
          renderEmbeddable={renderEmbeddable}
          validateEmbeddable={validateEmbeddable}
        />
        {remoteCursors.length > 0 ? (
          <div className="pointer-events-none absolute inset-0 z-10">
            {remoteCursors.map(({ collaborator, cursor }) => (
              <div
                key={collaborator.connectionId}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${cursor.x * 100}%`,
                  top: `${cursor.y * 100}%`,
                }}
              >
                <div className="flex items-center gap-2 rounded-full border border-border bg-background/90 px-2 py-1 shadow-sm">
                  <span
                    className="h-3 w-3 rounded-full border border-background"
                    style={{ backgroundColor: collaborator.color }}
                  />
                  <span className="text-xs font-medium text-foreground">
                    {collaborator.displayName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {excalidrawApi && (
          <MemoizedCanvasToolMenu
            accessToken={accessToken}
            excalidrawApi={excalidrawApi}
            immersiveArchitecture={immersiveArchitecture}
            leftPanelOpen={leftPanelOpen ?? false}
            onInsertReferenceBoard={onInsertReferenceBoard}
            onSeedArchitectureBoardStack={onSeedArchitectureBoardStack}
            onUploadReference={onUploadReference}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
