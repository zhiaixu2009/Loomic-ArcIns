// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { StreamEvent } from "@loomic/shared";
import type { WebSocketHandle } from "../src/hooks/use-websocket";
import { useCanvasCollaboration } from "../src/hooks/use-canvas-collaboration";

function createMockWs() {
  let listener: ((event: StreamEvent) => void) | null = null;

  const ws: WebSocketHandle = {
    cancelRun: vi.fn(),
    connected: true,
    interruptRun: vi.fn(),
    onEvent: vi.fn((callback) => {
      listener = callback;
      return () => {
        if (listener === callback) {
          listener = null;
        }
      };
    }),
    publishCanvasMutation: vi.fn(() => true),
    registerRPC: vi.fn(() => () => {}),
    resumeRun: vi.fn(),
    resumeCanvas: vi.fn(),
    retryRun: vi.fn(),
    setPresence: vi.fn(() => true),
    startRun: vi.fn(),
    updateCursor: vi.fn(() => true),
    updateSelection: vi.fn(() => true),
  };

  return {
    emit(event: StreamEvent) {
      listener?.(event);
    },
    ws,
  };
}

describe("useCanvasCollaboration", () => {
  it("registers presence and derives remote selection plus pending mutation state", async () => {
    const mockWs = createMockWs();

    const { result } = renderHook(() =>
      useCanvasCollaboration({
        canvasId: "canvas-1",
        localUserId: "user-local",
        profile: {
          displayName: "Studio Lead",
        },
        ws: mockWs.ws,
      }),
    );

    await waitFor(() =>
      expect(mockWs.ws.setPresence).toHaveBeenCalledWith("canvas-1", {
        displayName: "Studio Lead",
      }),
    );
    expect(result.current).not.toHaveProperty("publishLocalMutation");

    act(() => {
      mockWs.emit({
        type: "collab.presence",
        canvasId: "canvas-1",
        collaborators: [
          {
            connectionId: "conn-local",
            userId: "user-local",
            displayName: "Studio Lead",
            avatarUrl: null,
            color: "#CA8A04",
          },
          {
            connectionId: "conn-remote",
            userId: "user-remote",
            displayName: "Visualization Partner",
            avatarUrl: null,
            color: "#2563EB",
          },
        ],
        timestamp: "2026-04-12T06:00:00.000Z",
      });
      mockWs.emit({
        type: "collab.selection",
        canvasId: "canvas-1",
        collaborator: {
          connectionId: "conn-remote",
          userId: "user-remote",
          displayName: "Visualization Partner",
          avatarUrl: null,
          color: "#2563EB",
        },
        selection: {
          selectedElementIds: ["element-1", "element-2"],
        },
        timestamp: "2026-04-12T06:00:01.000Z",
      });
      mockWs.emit({
        type: "collab.canvas_mutation",
        canvasId: "canvas-1",
        mutationId: "mutation-1",
        collaborator: {
          connectionId: "conn-remote",
          userId: "user-remote",
          displayName: "Visualization Partner",
          avatarUrl: null,
          color: "#2563EB",
        },
        source: "human-save",
        elementCount: 5,
        timestamp: "2026-04-12T06:00:02.000Z",
      });
    });

    expect(result.current.collaborators).toHaveLength(2);
    expect(result.current.remoteSelections).toEqual([
      {
        collaborator: expect.objectContaining({
          connectionId: "conn-remote",
          displayName: "Visualization Partner",
        }),
        selection: {
          selectedElementIds: ["element-1", "element-2"],
        },
      },
    ]);
    expect(result.current.pendingRemoteMutation).toMatchObject({
      collaborator: expect.objectContaining({
        displayName: "Visualization Partner",
      }),
      elementCount: 5,
      type: "collab.canvas_mutation",
    });
  });
});
