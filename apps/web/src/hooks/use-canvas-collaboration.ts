"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  CanvasCollaborator,
  CanvasCollaboratorProfile,
  CanvasCursor,
  CanvasSelection,
  CollabCanvasMutationEvent,
} from "@loomic/shared";

import type { WebSocketHandle } from "./use-websocket";

export type RemoteCanvasCursor = {
  collaborator: CanvasCollaborator;
  cursor: CanvasCursor;
};

export type RemoteCanvasSelection = {
  collaborator: CanvasCollaborator;
  selection: CanvasSelection;
};

type UseCanvasCollaborationOptions = {
  canvasId?: string | null;
  enabled?: boolean;
  localUserId?: string | null;
  profile?: CanvasCollaboratorProfile | null;
  ws?: WebSocketHandle;
};

export function useCanvasCollaboration({
  canvasId,
  enabled = true,
  localUserId,
  profile,
  ws,
}: UseCanvasCollaborationOptions) {
  const [collaborators, setCollaborators] = useState<CanvasCollaborator[]>([]);
  const [remoteCursorMap, setRemoteCursorMap] = useState<
    Record<string, RemoteCanvasCursor>
  >({});
  const [remoteSelectionMap, setRemoteSelectionMap] = useState<
    Record<string, RemoteCanvasSelection>
  >({});
  const [pendingRemoteMutation, setPendingRemoteMutation] =
    useState<CollabCanvasMutationEvent | null>(null);

  const lastSelectionKeyRef = useRef("");
  const lastCursorKeyRef = useRef("");
  const cursorFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedCursorRef = useRef<CanvasCursor | null>(null);

  useEffect(() => {
    if (!enabled || !canvasId || !ws?.connected) return;

    ws.setPresence(canvasId, profile ?? undefined);
  }, [canvasId, enabled, profile, ws, ws?.connected]);

  useEffect(() => {
    setCollaborators([]);
    setRemoteCursorMap({});
    setRemoteSelectionMap({});
    setPendingRemoteMutation(null);
    lastSelectionKeyRef.current = "";
    lastCursorKeyRef.current = "";
  }, [canvasId]);

  useEffect(() => {
    if (!ws || !canvasId) return;

    return ws.onEvent((event) => {
      if (!("canvasId" in event) || event.canvasId !== canvasId) {
        return;
      }

      if (event.type === "collab.presence") {
        const activeIds = new Set(event.collaborators.map((entry) => entry.connectionId));
        setCollaborators(event.collaborators);
        setRemoteCursorMap((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([connectionId]) =>
              activeIds.has(connectionId),
            ),
          ),
        );
        setRemoteSelectionMap((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([connectionId]) =>
              activeIds.has(connectionId),
            ),
          ),
        );
        return;
      }

      if (event.type === "collab.cursor") {
        if (event.collaborator.userId === localUserId) {
          return;
        }

        setRemoteCursorMap((current) => {
          if (!event.cursor) {
            const next = { ...current };
            delete next[event.collaborator.connectionId];
            return next;
          }

          return {
            ...current,
            [event.collaborator.connectionId]: {
              collaborator: event.collaborator,
              cursor: event.cursor,
            },
          };
        });
        return;
      }

      if (event.type === "collab.selection") {
        if (event.collaborator.userId === localUserId) {
          return;
        }

        setRemoteSelectionMap((current) => ({
          ...current,
          [event.collaborator.connectionId]: {
            collaborator: event.collaborator,
            selection: event.selection,
          },
        }));
        return;
      }

      if (event.type === "collab.canvas_mutation") {
        if (event.collaborator.userId === localUserId) {
          return;
        }

        setPendingRemoteMutation(event);
      }
    });
  }, [canvasId, localUserId, ws]);

  useEffect(
    () => () => {
      if (cursorFlushTimerRef.current) {
        clearTimeout(cursorFlushTimerRef.current);
      }
    },
    [],
  );

  const reportCursor = useCallback(
    (cursor: CanvasCursor | null) => {
      if (!enabled || !canvasId || !ws?.connected) return;

      const nextKey = cursor
        ? `${cursor.x.toFixed(3)}:${cursor.y.toFixed(3)}:${cursor.button}`
        : "none";
      if (nextKey === lastCursorKeyRef.current) {
        return;
      }

      lastCursorKeyRef.current = nextKey;
      queuedCursorRef.current = cursor;

      if (cursorFlushTimerRef.current) {
        return;
      }

      cursorFlushTimerRef.current = setTimeout(() => {
        cursorFlushTimerRef.current = null;
        ws.updateCursor(canvasId, queuedCursorRef.current);
      }, 40);
    },
    [canvasId, enabled, ws, ws?.connected],
  );

  const reportSelection = useCallback(
    (selectedElementIds: string[]) => {
      if (!enabled || !canvasId || !ws?.connected) return;

      const normalizedIds = [...selectedElementIds].sort();
      const nextKey = normalizedIds.join(",");
      if (nextKey === lastSelectionKeyRef.current) {
        return;
      }

      lastSelectionKeyRef.current = nextKey;
      ws.updateSelection(canvasId, {
        selectedElementIds: normalizedIds,
      });
    },
    [canvasId, enabled, ws, ws?.connected],
  );

  const clearPendingRemoteMutation = useCallback(() => {
    setPendingRemoteMutation(null);
  }, []);

  const remoteCursors = useMemo(
    () => Object.values(remoteCursorMap),
    [remoteCursorMap],
  );
  const remoteSelections = useMemo(
    () => Object.values(remoteSelectionMap),
    [remoteSelectionMap],
  );

  return {
    clearPendingRemoteMutation,
    collaborators,
    pendingRemoteMutation,
    remoteCursors,
    remoteSelections,
    reportCursor,
    reportSelection,
  };
}
