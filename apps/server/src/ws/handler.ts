import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "ws";

import {
  type AgentPlan,
  type CanvasCollaboratorProfile,
  type ContentBlock,
  type RunCreateRequest,
  type StreamEvent,
  type ToolBlock,
  wsCommandSchema,
  wsRpcResponseSchema,
} from "@loomic/shared";
import type { AgentRunService } from "../agent/runtime.js";
import type { AgentRunMetadataService } from "../features/agent-runs/agent-run-service.js";
import type { ThreadService } from "../features/chat/thread-service.js";
import type { SettingsService } from "../features/settings/settings-service.js";
import type { ViewerService } from "../features/bootstrap/ensure-user-foundation.js";
import type {
  AuthenticatedUser,
  RequestAuthenticator,
} from "../supabase/user.js";
import type { ConnectionManager } from "./connection-manager.js";
import type { CanvasEventBuffer } from "./event-buffer.js";
import type { ChatService } from "../features/chat/chat-service.js";
import {
  applyAgentPlanEvent,
  buildResumedPlan,
} from "./agent-plan-blocks.js";
import { createPipelineLogger } from "./logger.js";

type RegisterWsOptions = {
  agentRuns: AgentRunService;
  agentRunMetadataService?: AgentRunMetadataService;
  auth?: RequestAuthenticator;
  chatService?: ChatService;
  connectionManager: ConnectionManager;
  eventBuffer?: CanvasEventBuffer;
  settingsService?: SettingsService;
  threadService?: ThreadService;
  viewerService?: ViewerService;
};

export async function registerWsRoute(
  app: FastifyInstance,
  options: RegisterWsOptions,
) {
  const { agentRuns, connectionManager } = options;

  app.get("/api/ws", { websocket: true }, (socket: WebSocket, request: FastifyRequest) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token || !options.auth) {
      socket.close(4001, "Unauthorized");
      return;
    }

    void authenticateAndBind(socket, token, request, options, agentRuns, connectionManager);
  });
}

async function authenticateAndBind(
  socket: WebSocket,
  token: string,
  _request: FastifyRequest,
  options: RegisterWsOptions,
  agentRuns: AgentRunService,
  connectionManager: ConnectionManager,
) {
  const log = createPipelineLogger("ws");

  let authenticatedUser: AuthenticatedUser;
  try {
    const fakeRequest = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as FastifyRequest;
    const user = await options.auth!.authenticate(fakeRequest);
    if (!user) {
      log.warn("auth_rejected", { reason: "invalid_token" });
      socket.close(4001, "Unauthorized");
      return;
    }
    authenticatedUser = user;
    log.info("connected", { userId: user.id });
  } catch (err) {
    log.warn("auth_error", { error: err instanceof Error ? err.message : String(err) });
    socket.close(4001, "Unauthorized");
    return;
  }

  if (socket.readyState !== 1) return;

  // Use client-provided connectionId for reconnect identity; fallback to server UUID
  const urlForParams = new URL(_request.url, `http://${_request.headers.host}`);
  const connectionId = urlForParams.searchParams.get("connectionId") || randomUUID();
  connectionManager.register(connectionId, authenticatedUser.id, socket);

  // Heartbeat with pong timeout (spec §1.3: 60s no-pong → disconnect)
  let lastPong = Date.now();
  socket.on("pong", () => { lastPong = Date.now(); });

  const pingInterval = setInterval(() => {
      if (Date.now() - lastPong > 60_000) {
        log.warn("pong_timeout", { userId: authenticatedUser.id });
        socket.terminate();
        return;
      }
    if (socket.readyState === 1) {
      socket.ping();
    }
  }, 30_000);

  socket.on("message", (raw: Buffer | string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(typeof raw === "string" ? raw : raw.toString("utf-8"));
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    const obj = parsed as Record<string, unknown>;

    if (obj.type === "rpc.response") {
      try {
        const rpcResponse = wsRpcResponseSchema.parse(parsed);
        connectionManager.handleRpcResponse(connectionId, {
          type: rpcResponse.type,
          id: rpcResponse.id,
          ...(rpcResponse.result !== undefined ? { result: rpcResponse.result } : {}),
          ...(rpcResponse.error !== undefined ? { error: rpcResponse.error } : {}),
        });
      } catch {
        // Ignore malformed RPC responses
      }
      return;
    }

    if (obj.type === "command") {
      let msg;
      try {
        msg = wsCommandSchema.parse(parsed);
      } catch {
        socket.send(JSON.stringify({ type: "error", message: "Invalid command format" }));
        return;
      }

      if (msg.action === "agent.run") {
        const p = msg.payload;
        const runToken = p.accessToken ?? token;
        void handleRunCommand(
          {
            ...authenticatedUser,
            accessToken: runToken,
          },
          connectionId,
          {
          sessionId: p.sessionId,
          conversationId: p.conversationId,
          prompt: p.prompt,
          ...(p.canvasId !== undefined ? { canvasId: p.canvasId } : {}),
          ...(p.attachments !== undefined ? { attachments: p.attachments } : {}),
          ...(p.imageGenerationPreference !== undefined
            ? { imageGenerationPreference: p.imageGenerationPreference }
            : {}),
          ...(p.videoGenerationPreference !== undefined
            ? { videoGenerationPreference: p.videoGenerationPreference }
            : {}),
          ...(p.imageOutputPreference !== undefined
            ? { imageOutputPreference: p.imageOutputPreference }
            : {}),
          ...(p.mentions !== undefined ? { mentions: p.mentions } : {}),
          ...(p.model !== undefined ? { model: p.model } : {}),
          },
          agentRuns,
          connectionManager,
          options,
        );
      } else if (msg.action === "agent.resume") {
        const p = msg.payload;
        const runToken = p.accessToken ?? token;
        void handleRunCommand(
          {
            ...authenticatedUser,
            accessToken: runToken,
          },
          connectionId,
          {
            sessionId: p.sessionId,
            conversationId: p.conversationId,
            prompt: buildResumePrompt(p.prompt, p.plan, p.sourceRunId),
            ...(p.canvasId !== undefined ? { canvasId: p.canvasId } : {}),
            ...(p.attachments !== undefined ? { attachments: p.attachments } : {}),
            ...(p.imageGenerationPreference !== undefined
              ? { imageGenerationPreference: p.imageGenerationPreference }
              : {}),
            ...(p.videoGenerationPreference !== undefined
              ? { videoGenerationPreference: p.videoGenerationPreference }
              : {}),
            ...(p.imageOutputPreference !== undefined
              ? { imageOutputPreference: p.imageOutputPreference }
              : {}),
            ...(p.mentions !== undefined ? { mentions: p.mentions } : {}),
            ...(p.model !== undefined ? { model: p.model } : {}),
          },
          agentRuns,
          connectionManager,
          options,
          {
            ackAction: "agent.resume",
            continuationEvent: "run.resumed",
            resumePlan: p.plan,
            sourceRunId: p.sourceRunId,
          },
        );
      } else if (msg.action === "agent.retry") {
        const p = msg.payload;
        const runToken = p.accessToken ?? token;
        void handleRunCommand(
          {
            ...authenticatedUser,
            accessToken: runToken,
          },
          connectionId,
          {
            sessionId: p.sessionId,
            conversationId: p.conversationId,
            prompt: buildRetryPrompt(p.prompt, p.sourceRunId),
            ...(p.canvasId !== undefined ? { canvasId: p.canvasId } : {}),
            ...(p.attachments !== undefined ? { attachments: p.attachments } : {}),
            ...(p.imageGenerationPreference !== undefined
              ? { imageGenerationPreference: p.imageGenerationPreference }
              : {}),
            ...(p.videoGenerationPreference !== undefined
              ? { videoGenerationPreference: p.videoGenerationPreference }
              : {}),
            ...(p.imageOutputPreference !== undefined
              ? { imageOutputPreference: p.imageOutputPreference }
              : {}),
            ...(p.mentions !== undefined ? { mentions: p.mentions } : {}),
            ...(p.model !== undefined ? { model: p.model } : {}),
          },
          agentRuns,
          connectionManager,
          options,
          {
            ackAction: "agent.retry",
            continuationEvent: "run.retried",
            sourceRunId: p.sourceRunId,
          },
        );
      } else if (msg.action === "agent.cancel") {
        log.info("run_cancel", { userId: authenticatedUser.id, runId: msg.payload.runId });
        const cancelResult = agentRuns.cancelRun(msg.payload.runId);
        if (!cancelResult) {
          socket.send(JSON.stringify({ type: "error", message: `Run not found: ${msg.payload.runId}` }));
        }
      } else if (msg.action === "agent.interrupt") {
        log.info("run_interrupt", {
          userId: authenticatedUser.id,
          runId: msg.payload.runId,
        });
        const cancelResult = agentRuns.cancelRun(msg.payload.runId);
        if (!cancelResult) {
          socket.send(JSON.stringify({ type: "error", message: `Run not found: ${msg.payload.runId}` }));
          return;
        }

        const canvasId =
          connectionManager.findCanvasIdByRunId(msg.payload.runId) ??
          connectionManager.getEntry(connectionId)?.canvasId;
        const interruptedAt = new Date().toISOString();
        if (canvasId) {
          const interruptedEvent: StreamEvent = {
            type: "run.interrupted",
            runId: msg.payload.runId,
            timestamp: interruptedAt,
            interrupt: {
              runId: msg.payload.runId,
              reason: "user",
              message: "Paused by designer",
              interruptedAt,
            },
          };
          options.eventBuffer?.push(canvasId, interruptedEvent);
          connectionManager.pushToCanvas(canvasId, interruptedEvent);
        }

        connectionManager.sendTo(connectionId, {
          type: "command.ack",
          action: "agent.interrupt",
          payload: {
            runId: msg.payload.runId,
            status: "interrupted",
          },
        });
      } else if (msg.action === "canvas.resume") {
        const p = msg.payload;
        log.info("canvas_resume", { userId: authenticatedUser.id, canvasId: p.canvasId, lastSeq: p.lastSeq });

        // Re-bind this connection to the canvas
        connectionManager.bindCanvas(connectionId, p.canvasId);

        const missed = options.eventBuffer?.getAfter(p.canvasId, p.lastSeq) ?? [];
        const activeRun = connectionManager.getActiveRun(p.canvasId);

        // IMPORTANT: Send ACK FIRST so client registers event listener
        // BEFORE replay events arrive. Otherwise replayed events have no handler.
        connectionManager.sendTo(connectionId, {
          type: "command.ack",
          action: "canvas.resume",
          payload: {
            canvasId: p.canvasId,
            latestSeq: options.eventBuffer?.getLatestSeq(p.canvasId) ?? 0,
            activeRunId: activeRun?.runId ?? null,
            replayed: missed.length,
          },
        });

        // THEN replay missed events from buffer
        for (const entry of missed) {
          connectionManager.sendTo(connectionId, {
            type: "event",
            event: entry.event,
          });
        }
      } else if (msg.action === "collab.presence") {
        log.info("collab_presence", {
          canvasId: msg.payload.canvasId,
          userId: authenticatedUser.id,
        });
        void handlePresenceCommand(
          authenticatedUser,
          connectionId,
          msg.payload.canvasId,
          msg.payload.profile,
          connectionManager,
          options,
        );
      } else if (msg.action === "collab.cursor") {
        log.info("collab_cursor", {
          canvasId: msg.payload.canvasId,
          userId: authenticatedUser.id,
        });
        const collaborator = connectionManager.updateCursor(
          connectionId,
          msg.payload.canvasId,
          msg.payload.cursor,
        );

        if (!collaborator) {
          log.warn("collab_cursor_ignored", {
            canvasId: msg.payload.canvasId,
            reason: "presence_inactive",
            userId: authenticatedUser.id,
          });
          return;
        }

        connectionManager.pushToCanvas(msg.payload.canvasId, {
          type: "collab.cursor",
          canvasId: msg.payload.canvasId,
          collaborator,
          cursor: msg.payload.cursor,
          timestamp: new Date().toISOString(),
        });
      } else if (msg.action === "collab.selection") {
        log.info("collab_selection", {
          canvasId: msg.payload.canvasId,
          userId: authenticatedUser.id,
        });
        const collaborator = connectionManager.updateSelection(
          connectionId,
          msg.payload.canvasId,
          msg.payload.selection,
        );

        if (!collaborator) {
          log.warn("collab_selection_ignored", {
            canvasId: msg.payload.canvasId,
            reason: "presence_inactive",
            userId: authenticatedUser.id,
          });
          return;
        }

        connectionManager.pushToCanvas(msg.payload.canvasId, {
          type: "collab.selection",
          canvasId: msg.payload.canvasId,
          collaborator,
          selection: msg.payload.selection,
          timestamp: new Date().toISOString(),
        });
      } else if (msg.action === "collab.canvas_mutation") {
        log.info("collab_canvas_mutation", {
          canvasId: msg.payload.canvasId,
          elementCount: msg.payload.elementCount,
          source: msg.payload.source,
          userId: authenticatedUser.id,
        });
        void handleCanvasMutationCommand(
          authenticatedUser,
          connectionId,
          msg.payload.canvasId,
          msg.payload.source,
          msg.payload.elementCount,
          connectionManager,
          options.viewerService,
        );
      }
    }
  });

  socket.on("close", () => {
    log.info("disconnected", { userId: authenticatedUser.id, connectionId });
    clearInterval(pingInterval);
    const entry = connectionManager.getEntry(connectionId);
    connectionManager.remove(connectionId);
    if (entry?.presenceActive && entry.canvasId) {
      broadcastPresenceSnapshot(connectionManager, entry.canvasId);
    }
  });

  socket.on("error", () => {
    log.error("socket_error", { userId: authenticatedUser.id, connectionId });
    clearInterval(pingInterval);
    const entry = connectionManager.getEntry(connectionId);
    connectionManager.remove(connectionId);
    if (entry?.presenceActive && entry.canvasId) {
      broadcastPresenceSnapshot(connectionManager, entry.canvasId);
    }
  });
}

async function handlePresenceCommand(
  authenticatedUser: AuthenticatedUser,
  connectionId: string,
  canvasId: string,
  profile: CanvasCollaboratorProfile | undefined,
  connectionManager: ConnectionManager,
  services: RegisterWsOptions,
) {
  const previousCanvasId = connectionManager.getEntry(connectionId)?.canvasId;
  const resolvedProfile = await resolveCollaboratorProfile(
    authenticatedUser,
    profile,
    services.viewerService,
  );

  connectionManager.upsertPresence(connectionId, canvasId, resolvedProfile);

  if (previousCanvasId && previousCanvasId !== canvasId) {
    broadcastPresenceSnapshot(connectionManager, previousCanvasId);
  }
  broadcastPresenceSnapshot(connectionManager, canvasId);
}

function broadcastPresenceSnapshot(
  connectionManager: ConnectionManager,
  canvasId: string,
) {
  connectionManager.pushToCanvas(canvasId, {
    type: "collab.presence",
    canvasId,
    collaborators: connectionManager.getCanvasCollaborators(canvasId),
    timestamp: new Date().toISOString(),
  });
}

async function resolveCollaboratorProfile(
  authenticatedUser: AuthenticatedUser,
  profile: CanvasCollaboratorProfile | undefined,
  viewerService?: ViewerService,
): Promise<CanvasCollaboratorProfile> {
  let displayName =
    profile?.displayName?.trim() ||
    readString(authenticatedUser.userMetadata.displayName) ||
    readString(authenticatedUser.userMetadata.display_name) ||
    readString(authenticatedUser.userMetadata.name) ||
    authenticatedUser.email.split("@")[0] ||
    "Collaborator";
  let avatarUrl = profile?.avatarUrl ?? null;

  if (viewerService) {
    try {
      const viewer = await viewerService.ensureViewer(authenticatedUser);
      displayName = profile?.displayName?.trim() || viewer.profile.displayName || displayName;
      avatarUrl = profile?.avatarUrl ?? viewer.profile.avatarUrl ?? null;
    } catch {
      // Keep auth metadata fallback when viewer bootstrap is temporarily unavailable.
    }
  }

  return {
    displayName,
    avatarUrl,
  };
}

async function handleCanvasMutationCommand(
  authenticatedUser: AuthenticatedUser,
  connectionId: string,
  canvasId: string,
  source: "human-save" | "agent-sync",
  elementCount: number,
  connectionManager: ConnectionManager,
  viewerService?: ViewerService,
) {
  const profile = await resolveCollaboratorProfile(
    authenticatedUser,
    undefined,
    viewerService,
  );
  const collaborator = connectionManager.getCanvasCollaboratorByUserOrFallback(
    canvasId,
    authenticatedUser.id,
    profile,
    connectionId,
  );

  connectionManager.pushToCanvas(canvasId, {
    type: "collab.canvas_mutation",
    canvasId,
    mutationId: randomUUID(),
    collaborator,
    source,
    elementCount,
    timestamp: new Date().toISOString(),
  });
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

type HandleRunCommandOptions = {
  ackAction?: "agent.run" | "agent.resume" | "agent.retry";
  continuationEvent?: "run.resumed" | "run.retried";
  resumePlan?: AgentPlan;
  sourceRunId?: string;
};

function buildResumePrompt(
  prompt: string,
  plan: AgentPlan,
  sourceRunId: string,
) {
  return [
    `Continue the interrupted plan from run ${sourceRunId}.`,
    "Republish the current plan with publish_plan before resuming unfinished work.",
    `Interrupted plan snapshot: ${JSON.stringify(plan)}`,
    "",
    `Original user request: ${prompt}`,
  ].join("\n");
}

function buildRetryPrompt(prompt: string, sourceRunId: string) {
  return [
    `Retry the work for previous run ${sourceRunId}.`,
    "Start from a fresh plan with publish_plan before executing tools again.",
    "",
    `Original user request: ${prompt}`,
  ].join("\n");
}

function buildPreludeEvents(
  runId: string,
  nowIso: string,
  options: HandleRunCommandOptions | undefined,
): StreamEvent[] {
  if (!options?.continuationEvent || !options.sourceRunId) {
    return [];
  }

  const events: StreamEvent[] = [
    {
      type: options.continuationEvent,
      runId,
      sourceRunId: options.sourceRunId,
      timestamp: nowIso,
    },
  ];

  if (options.continuationEvent === "run.resumed" && options.resumePlan) {
    events.push({
      type: "agent.plan.updated",
      runId,
      timestamp: nowIso,
      plan: buildResumedPlan(
        options.resumePlan,
        runId,
        options.sourceRunId,
        nowIso,
      ),
    });
  }

  return events;
}

async function handleRunCommand(
  authenticatedUser: AuthenticatedUser,
  connectionId: string,
  payload: Omit<RunCreateRequest, "accessToken">,
  agentRuns: AgentRunService,
  connectionManager: ConnectionManager,
  services: RegisterWsOptions,
  runOptions?: HandleRunCommandOptions,
) {
  const log = createPipelineLogger("agent.run", {
    userId: authenticatedUser.id,
    sessionId: payload.sessionId,
  });
  log.info("started", { prompt: payload.prompt.slice(0, 80) });

  // Resolve thread + model in parallel
  const [threadId, model] = await Promise.all([
    (async (): Promise<string | undefined> => {
      if (!services.threadService) return undefined;
      try {
        const sessionThread = await services.threadService.resolveOwnedSessionThread(
          authenticatedUser,
          payload.sessionId,
        );
        return sessionThread.threadId;
      } catch (error) {
        log.warn("thread_resolve_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return undefined;
      }
    })(),
    (async (): Promise<string | undefined> => {
      if (!services.settingsService || !services.viewerService) return undefined;
      try {
        const viewer = await services.viewerService.ensureViewer(authenticatedUser);
        const settings = await services.settingsService.getWorkspaceSettings(
          authenticatedUser,
          viewer.workspace.id,
        );
        return settings.defaultModel;
      } catch (error) {
        log.warn("model_resolve_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return undefined;
      }
    })(),
  ]);
  // Client-provided model takes priority over workspace default
  const resolvedModel = payload.model ?? model;
  log.lap("resolve", { threadId: !!threadId, model: resolvedModel });

  const response = agentRuns.createRun(payload, {
    accessToken: authenticatedUser.accessToken,
    userId: authenticatedUser.id,
    ...(resolvedModel ? { model: resolvedModel } : {}),
    ...(threadId ? { threadId } : {}),
  });
  const runId = response.runId;
  log.lap("run_created", { runId });

  // Persist run metadata
  if (threadId && services.agentRunMetadataService) {
    try {
      await services.agentRunMetadataService.createAcceptedRun({
        ...(resolvedModel ? { model: resolvedModel } : {}),
        runId,
        sessionId: payload.sessionId,
        threadId,
      });
    } catch {
      // Non-fatal
    }
  }

  // Bind this connection to the canvas so events route correctly
  const canvasId = payload.canvasId ?? payload.conversationId;
  connectionManager.bindCanvas(connectionId, canvasId);

  // Send ACK to the specific connection that initiated the run.
  // Retry with short delays if the connection is temporarily unavailable
  // (e.g., brief disconnect/reconnect during page transitions).
  const ackMessage = {
    type: "command.ack",
    action: runOptions?.ackAction ?? "agent.run",
    payload: response,
  };
  let ackSent = connectionManager.sendTo(connectionId, ackMessage);
  if (!ackSent) {
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 500));
      ackSent = connectionManager.sendTo(connectionId, ackMessage);
      if (ackSent) break;
    }
  }
  log.lap("ack_sent", { runId, connectionId, delivered: ackSent });

  // Track active run so reconnecting clients can detect it
  connectionManager.setActiveRun(canvasId, runId);

  const keepAlive = setInterval(() => {
    connectionManager.sendTo(connectionId, { type: "keep-alive" });
  }, 15_000);

  // Accumulate assistant content blocks for server-side persistence
  const assistantText: string[] = [];
  let assistantBlocks: ContentBlock[] = [];

  const preludeEvents = buildPreludeEvents(
    runId,
    new Date().toISOString(),
    runOptions,
  );
  for (const event of preludeEvents) {
    services.eventBuffer?.push(canvasId, event);
    connectionManager.pushToCanvas(canvasId, event);
    assistantBlocks = applyAgentPlanEvent(assistantBlocks, event);
  }

  try {
    let firstEvent = true;
    for await (const event of agentRuns.streamRun(runId)) {
      if (firstEvent) {
        log.lap("first_token", { runId });
        firstEvent = false;
      }

      // Buffer for replay on reconnect
      services.eventBuffer?.push(canvasId, event);

      // Broadcast to all viewers
      connectionManager.pushToCanvas(canvasId, event);

      // Accumulate content for server-side persistence
      if (event.type === "message.delta") {
        const lastBlock = assistantBlocks[assistantBlocks.length - 1];
        if (lastBlock && lastBlock.type === "text") {
          (lastBlock as { type: "text"; text: string }).text += event.delta;
        } else {
          assistantBlocks.push({ type: "text", text: event.delta });
        }
        assistantText.push(event.delta);
      } else if (event.type === "tool.started") {
        assistantBlocks.push({
          type: "tool",
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          status: "running" as const,
          ...(event.input ? { input: event.input } : {}),
        });
      } else if (event.type === "tool.completed") {
        const idx = assistantBlocks.findIndex(
          (b) => b.type === "tool" && (b as ToolBlock).toolCallId === event.toolCallId,
        );
        if (idx >= 0) {
          assistantBlocks[idx] = {
            ...(assistantBlocks[idx] as ToolBlock),
            status: "completed" as const,
            ...(event.output ? { output: event.output } : {}),
            ...(event.outputSummary ? { outputSummary: event.outputSummary } : {}),
            ...(event.artifacts ? { artifacts: event.artifacts } : {}),
          };
        }
      }

      assistantBlocks = applyAgentPlanEvent(assistantBlocks, event);
    }
    log.lap("stream_done", { runId });

    // ── Server-side assistant message persistence ──
    if (services.chatService && (assistantText.length > 0 || assistantBlocks.length > 0)) {
      try {
        await services.chatService.createMessage(
          authenticatedUser,
          payload.sessionId,
          {
            role: "assistant",
            content: assistantText.join(""),
            contentBlocks: assistantBlocks,
          },
        );
        log.lap("assistant_message_persisted", { runId });
      } catch (err) {
        log.warn("assistant_message_persist_failed", {
          runId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } catch (error) {
    log.error("stream_error", { runId, error: error instanceof Error ? error.message : "unknown" });
    const failedEvent = {
      type: "run.failed" as const,
      runId,
      error: {
        code: "run_failed" as const,
        message: error instanceof Error ? error.message : "Stream failed",
      },
      timestamp: new Date().toISOString(),
    };
    services.eventBuffer?.push(canvasId, failedEvent);
    connectionManager.pushToCanvas(canvasId, failedEvent);
  } finally {
    clearInterval(keepAlive);
    connectionManager.clearActiveRun(canvasId);
  }
}
