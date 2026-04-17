import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import type {
  CanvasCollaborator,
  CanvasCollaboratorProfile,
  CanvasCursor,
  CanvasSelection,
  StreamEvent,
} from "@loomic/shared";

type PendingRPC = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

export type ConnectionEntry = {
  ws: WebSocket;
  userId: string;
  connectionId: string;
  canvasId: string | null;
  presenceActive: boolean;
  collaboratorProfile: CanvasCollaboratorProfile | null;
  collaboratorColor: string;
  cursor: CanvasCursor | null;
  selection: CanvasSelection;
};

const COLLABORATOR_COLORS = [
  "#CA8A04",
  "#2563EB",
  "#DC2626",
  "#16A34A",
  "#7C3AED",
  "#EA580C",
  "#0891B2",
  "#BE185D",
] as const;

const EMPTY_SELECTION: CanvasSelection = {
  selectedElementIds: [],
};

export class ConnectionManager {
  /** Primary store: connectionId -> entry */
  private connections = new Map<string, ConnectionEntry>();
  /** User-level index: userId -> set of connectionIds */
  private userIndex = new Map<string, Set<string>>();
  /** Canvas-level index: canvasId -> set of connectionIds */
  private canvasIndex = new Map<string, Set<string>>();
  /** Tracks active runIds per canvas so reconnecting clients know if a run is in progress */
  private activeRuns = new Map<string, { runId: string; startedAt: number }>();
  /** Pending RPC calls, keyed by unique request UUID (unchanged) */
  private pendingRPCs = new Map<string, PendingRPC>();

  // ---------------------------------------------------------------------------
  // Registration & removal
  // ---------------------------------------------------------------------------

  /**
   * Register a connection. Multiple connections per user are allowed.
   * If the same connectionId already exists (reconnect), replace only that entry
   * without closing any other connections.
   */
  register(connectionId: string, userId: string, ws: WebSocket): void {
    const existing = this.connections.get(connectionId);
    if (existing) {
      // Reconnect for same connectionId: clean up old entry from indexes
      this.removeFromIndexes(connectionId, existing);
    }

    const entry: ConnectionEntry = {
      ws,
      userId,
      connectionId,
      canvasId: null,
      presenceActive: false,
      collaboratorProfile: null,
      collaboratorColor: pickCollaboratorColor(userId, connectionId),
      cursor: null,
      selection: EMPTY_SELECTION,
    };
    this.connections.set(connectionId, entry);

    let userSet = this.userIndex.get(userId);
    if (!userSet) {
      userSet = new Set();
      this.userIndex.set(userId, userSet);
    }
    userSet.add(connectionId);
  }

  /** Remove a connection from all indexes. */
  remove(connectionId: string): void {
    const entry = this.connections.get(connectionId);
    if (!entry) return;
    this.removeFromIndexes(connectionId, entry);
    this.connections.delete(connectionId);
  }

  /**
   * Associate a connection with a canvas.
   * Updates the canvasIndex so events can be broadcast to all viewers of that canvas.
   */
  bindCanvas(connectionId: string, canvasId: string): void {
    const entry = this.connections.get(connectionId);
    if (!entry) return;

    // Remove from previous canvas index if switching canvases
    if (entry.canvasId && entry.canvasId !== canvasId) {
      entry.cursor = null;
      entry.selection = EMPTY_SELECTION;
      const prevSet = this.canvasIndex.get(entry.canvasId);
      if (prevSet) {
        prevSet.delete(connectionId);
        if (prevSet.size === 0) this.canvasIndex.delete(entry.canvasId);
      }
    }

    entry.canvasId = canvasId;

    let canvasSet = this.canvasIndex.get(canvasId);
    if (!canvasSet) {
      canvasSet = new Set();
      this.canvasIndex.set(canvasId, canvasSet);
    }
    canvasSet.add(connectionId);
  }

  upsertPresence(
    connectionId: string,
    canvasId: string,
    profile: CanvasCollaboratorProfile,
  ): CanvasCollaborator | null {
    const entry = this.connections.get(connectionId);
    if (!entry) return null;

    this.bindCanvas(connectionId, canvasId);
    entry.presenceActive = true;
    entry.collaboratorProfile = {
      displayName: profile.displayName.trim(),
      ...(profile.avatarUrl !== undefined ? { avatarUrl: profile.avatarUrl } : {}),
    };

    return this.toCollaborator(entry);
  }

  updateCursor(
    connectionId: string,
    canvasId: string,
    cursor: CanvasCursor | null,
  ): CanvasCollaborator | null {
    const entry = this.connections.get(connectionId);
    if (!entry) return null;

    this.bindCanvas(connectionId, canvasId);
    if (!entry.presenceActive) return null;
    entry.cursor = cursor;
    return this.toCollaborator(entry);
  }

  updateSelection(
    connectionId: string,
    canvasId: string,
    selection: CanvasSelection,
  ): CanvasCollaborator | null {
    const entry = this.connections.get(connectionId);
    if (!entry) return null;

    this.bindCanvas(connectionId, canvasId);
    if (!entry.presenceActive) return null;
    entry.selection = selection;
    return this.toCollaborator(entry);
  }

  getCanvasCollaborator(connectionId: string): CanvasCollaborator | null {
    const entry = this.connections.get(connectionId);
    if (!entry) return null;
    return this.toCollaborator(entry);
  }

  getCanvasCollaboratorByUser(
    canvasId: string,
    userId: string,
  ): CanvasCollaborator | null {
    const ids = this.canvasIndex.get(canvasId);
    if (!ids) return null;

    for (const cid of ids) {
      const entry = this.connections.get(cid);
      if (!entry || entry.userId !== userId || !entry.presenceActive) {
        continue;
      }

      const collaborator = this.toCollaborator(entry);
      if (collaborator) {
        return collaborator;
      }
    }

    return null;
  }

  getCanvasCollaboratorByUserOrFallback(
    canvasId: string,
    userId: string,
    profile: CanvasCollaboratorProfile,
    fallbackConnectionId?: string,
  ): CanvasCollaborator {
    const collaborator = this.getCanvasCollaboratorByUser(canvasId, userId);
    if (collaborator) {
      return collaborator;
    }

    const connectionId = fallbackConnectionId ?? `user:${userId}`;
    return {
      avatarUrl: profile.avatarUrl ?? null,
      color: pickCollaboratorColor(userId, connectionId),
      connectionId,
      displayName: profile.displayName.trim(),
      userId,
    };
  }

  getCanvasCollaborators(canvasId: string): CanvasCollaborator[] {
    const ids = this.canvasIndex.get(canvasId);
    if (!ids) return [];

    return Array.from(ids)
      .map((cid) => this.connections.get(cid))
      .filter((entry): entry is ConnectionEntry =>
        Boolean(
          entry &&
            entry.presenceActive &&
            entry.canvasId === canvasId &&
            entry.ws.readyState === 1,
        ),
      )
      .map((entry) => this.toCollaborator(entry))
      .filter((entry): entry is CanvasCollaborator => entry !== null)
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  /** Mark a run as active for a canvas. */
  setActiveRun(canvasId: string, runId: string): void {
    this.activeRuns.set(canvasId, { runId, startedAt: Date.now() });
  }

  /** Clear active run for a canvas. */
  clearActiveRun(canvasId: string): void {
    this.activeRuns.delete(canvasId);
  }

  /** Get active run info for a canvas, if any. */
  getActiveRun(canvasId: string): { runId: string; startedAt: number } | null {
    return this.activeRuns.get(canvasId) ?? null;
  }

  /** Resolve the canvas currently associated with a given active run id. */
  findCanvasIdByRunId(runId: string): string | null {
    for (const [canvasId, activeRun] of this.activeRuns.entries()) {
      if (activeRun.runId === runId) {
        return canvasId;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Lookups
  // ---------------------------------------------------------------------------

  /** Get the WebSocket for a specific connection. */
  get(connectionId: string): WebSocket | undefined {
    return this.connections.get(connectionId)?.ws;
  }

  /** Get the full ConnectionEntry for a specific connection. */
  getEntry(connectionId: string): ConnectionEntry | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get ANY open WebSocket for a user (backward compat).
   * Picks the first connection whose socket is still open.
   */
  getByUser(userId: string): WebSocket | undefined {
    const ids = this.userIndex.get(userId);
    if (!ids) return undefined;
    for (const cid of ids) {
      const entry = this.connections.get(cid);
      if (entry && entry.ws.readyState === 1) return entry.ws;
    }
    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Broadcasting (StreamEvent)
  // ---------------------------------------------------------------------------

  /** Send a StreamEvent to ALL connections viewing a specific canvas. */
  pushToCanvas(canvasId: string, event: StreamEvent): void {
    const ids = this.canvasIndex.get(canvasId);
    if (!ids) return;
    const payload = JSON.stringify({ type: "event", event });
    for (const cid of ids) {
      const entry = this.connections.get(cid);
      if (entry && entry.ws.readyState === 1) {
        entry.ws.send(payload);
      }
    }
  }

  /** Send a StreamEvent to ALL connections for a user. */
  pushToUser(userId: string, event: StreamEvent): void {
    const ids = this.userIndex.get(userId);
    if (!ids) return;
    const payload = JSON.stringify({ type: "event", event });
    for (const cid of ids) {
      const entry = this.connections.get(cid);
      if (entry && entry.ws.readyState === 1) {
        entry.ws.send(payload);
      }
    }
  }

  /**
   * Backward-compatible push: send a StreamEvent to ANY connection for a user.
   * Delegates to pushToUser (broadcasts to all).
   */
  push(userId: string, event: StreamEvent): void {
    this.pushToUser(userId, event);
  }

  // ---------------------------------------------------------------------------
  // Direct messaging
  // ---------------------------------------------------------------------------

  /** Send a raw JSON message to a specific connection. */
  sendTo(connectionId: string, message: Record<string, unknown>): boolean {
    const entry = this.connections.get(connectionId);
    if (!entry || entry.ws.readyState !== 1) return false;
    entry.ws.send(JSON.stringify(message));
    return true;
  }

  /**
   * Send a raw JSON message to ANY open connection for a user (backward compat).
   * Broadcasts to all open connections for the user and returns true if at least
   * one was delivered.
   */
  sendToUser(userId: string, message: Record<string, unknown>): boolean {
    const ids = this.userIndex.get(userId);
    if (!ids) return false;
    const payload = JSON.stringify(message);
    let delivered = false;
    for (const cid of ids) {
      const entry = this.connections.get(cid);
      if (entry && entry.ws.readyState === 1) {
        entry.ws.send(payload);
        delivered = true;
      }
    }
    return delivered;
  }

  /**
   * Backward-compatible send: delegates to sendToUser.
   */
  send(userId: string, message: Record<string, unknown>): boolean {
    return this.sendToUser(userId, message);
  }

  // ---------------------------------------------------------------------------
  // RPC (unchanged semantics, keyed by UUID)
  // ---------------------------------------------------------------------------

  /**
   * RPC to a specific connection by connectionId.
   */
  async rpc<T = unknown>(
    connectionId: string,
    method: string,
    params: Record<string, unknown>,
    timeout = 10_000,
  ): Promise<T> {
    // First try connectionId as a direct lookup
    let ws = this.connections.get(connectionId)?.ws;

    // Fallback: treat connectionId as userId for backward compat
    // (existing callers like screenshot-canvas pass userId)
    if (!ws) {
      ws = this.getByUser(connectionId);
    }

    if (!ws || ws.readyState !== 1) {
      throw new Error(`Connection ${connectionId} not available`);
    }

    const id = randomUUID();

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRPCs.delete(id);
        reject(new Error(`RPC timeout: ${method} (${timeout}ms)`));
      }, timeout);

      this.pendingRPCs.set(id, { resolve, reject, timer });

      ws.send(
        JSON.stringify({
          type: "rpc.request",
          id,
          method,
          params,
        }),
      );
    });
  }

  /**
   * Handle an incoming RPC response. Keyed by the unique RPC request UUID,
   * so connectionId is accepted but not needed for dispatch.
   */
  handleRpcResponse(
    _connectionId: string,
    msg: { type: "rpc.response"; id: string; result?: unknown; error?: string },
  ): void {
    const pending = this.pendingRPCs.get(msg.id);
    if (!pending) return;

    this.pendingRPCs.delete(msg.id);
    clearTimeout(pending.timer);

    if (msg.error) {
      pending.reject(new Error(msg.error));
    } else {
      pending.resolve(msg.result);
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  dispose(): void {
    for (const pending of this.pendingRPCs.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("ConnectionManager disposed"));
    }
    this.pendingRPCs.clear();
    this.connections.clear();
    this.userIndex.clear();
    this.canvasIndex.clear();
    this.activeRuns.clear();
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private removeFromIndexes(connectionId: string, entry: ConnectionEntry): void {
    // Remove from user index
    const userSet = this.userIndex.get(entry.userId);
    if (userSet) {
      userSet.delete(connectionId);
      if (userSet.size === 0) this.userIndex.delete(entry.userId);
    }

    // Remove from canvas index
    if (entry.canvasId) {
      const canvasSet = this.canvasIndex.get(entry.canvasId);
      if (canvasSet) {
        canvasSet.delete(connectionId);
        if (canvasSet.size === 0) this.canvasIndex.delete(entry.canvasId);
      }
    }
  }

  private toCollaborator(entry: ConnectionEntry): CanvasCollaborator | null {
    if (!entry.presenceActive || !entry.collaboratorProfile) {
      return null;
    }

    return {
      avatarUrl: entry.collaboratorProfile.avatarUrl ?? null,
      color: entry.collaboratorColor,
      connectionId: entry.connectionId,
      displayName: entry.collaboratorProfile.displayName,
      userId: entry.userId,
    };
  }
}

function pickCollaboratorColor(userId: string, connectionId: string): string {
  const seed = `${userId}:${connectionId}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return COLLABORATOR_COLORS[hash % COLLABORATOR_COLORS.length]!;
}
