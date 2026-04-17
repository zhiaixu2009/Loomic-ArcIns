import { z } from "zod";
import { streamEventSchema } from "./events.js";
import {
  agentPlanSchema,
  canvasCollaboratorProfileSchema,
  canvasCursorSchema,
  canvasIdSchema,
  canvasMutationSourceSchema,
  canvasSelectionSchema,
  runIdSchema,
  runCreateRequestSchema,
} from "./contracts.js";

// --- Server → Client: Push Event (replaces SSE) ---

export const wsServerEventSchema = z.object({
  type: z.literal("event"),
  event: streamEventSchema,
});

// --- Server → Client: RPC Request ---

export const wsRpcRequestSchema = z.object({
  type: z.literal("rpc.request"),
  id: z.string().min(1),
  method: z.string().min(1),
  params: z.record(z.unknown()).default({}),
});

// --- Server → Client: Command Ack ---

export const wsCommandAckSchema = z.object({
  type: z.literal("command.ack"),
  action: z.string().min(1),
  payload: z.record(z.unknown()),
});

// --- Client → Server: Command ---

export const wsRunCommandSchema = z.object({
  type: z.literal("command"),
  action: z.literal("agent.run"),
  payload: runCreateRequestSchema,
});

export const wsCancelCommandSchema = z.object({
  type: z.literal("command"),
  action: z.literal("agent.cancel"),
  payload: z.object({ runId: z.string().min(1) }),
});

export const wsInterruptCommandSchema = z.object({
  type: z.literal("command"),
  action: z.literal("agent.interrupt"),
  payload: z.object({ runId: runIdSchema }),
});

export const wsResumeCommandSchema = z.object({
  type: z.literal("command"),
  action: z.literal("canvas.resume"),
  payload: z.object({
    canvasId: z.string().min(1),
    lastSeq: z.number().int().min(0).default(0),
  }),
});

export const wsAgentResumeCommandSchema = z.object({
  type: z.literal("command"),
  action: z.literal("agent.resume"),
  payload: runCreateRequestSchema.extend({
    sourceRunId: runIdSchema,
    plan: agentPlanSchema,
  }),
});

export const wsRetryCommandSchema = z.object({
  type: z.literal("command"),
  action: z.literal("agent.retry"),
  payload: runCreateRequestSchema.extend({
    sourceRunId: runIdSchema,
  }),
});

export const wsCollabPresenceCommandSchema = z.object({
  type: z.literal("command"),
  action: z.literal("collab.presence"),
  payload: z.object({
    canvasId: canvasIdSchema,
    profile: canvasCollaboratorProfileSchema.optional(),
  }),
});

export const wsCollabCursorCommandSchema = z.object({
  type: z.literal("command"),
  action: z.literal("collab.cursor"),
  payload: z.object({
    canvasId: canvasIdSchema,
    cursor: canvasCursorSchema.nullable(),
  }),
});

export const wsCollabSelectionCommandSchema = z.object({
  type: z.literal("command"),
  action: z.literal("collab.selection"),
  payload: z.object({
    canvasId: canvasIdSchema,
    selection: canvasSelectionSchema,
  }),
});

export const wsCollabCanvasMutationCommandSchema = z.object({
  type: z.literal("command"),
  action: z.literal("collab.canvas_mutation"),
  payload: z.object({
    canvasId: canvasIdSchema,
    source: canvasMutationSourceSchema,
    elementCount: z.number().int().nonnegative(),
  }),
});

export const wsCommandSchema = z.discriminatedUnion("action", [
  wsRunCommandSchema,
  wsCancelCommandSchema,
  wsInterruptCommandSchema,
  wsResumeCommandSchema,
  wsAgentResumeCommandSchema,
  wsRetryCommandSchema,
  wsCollabPresenceCommandSchema,
  wsCollabCursorCommandSchema,
  wsCollabSelectionCommandSchema,
  wsCollabCanvasMutationCommandSchema,
]);

// --- Client → Server: RPC Response ---

export const wsRpcResponseSchema = z.object({
  type: z.literal("rpc.response"),
  id: z.string().min(1),
  result: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});

// --- Union: Client → Server ---
// Uses z.union instead of z.discriminatedUnion because wsCommandSchema is itself
// a discriminated union (by "action"), which Zod v3 does not support as a nested
// element in another discriminatedUnion.

export const wsClientMessageSchema = z.union([
  wsRunCommandSchema,
  wsCancelCommandSchema,
  wsInterruptCommandSchema,
  wsResumeCommandSchema,
  wsAgentResumeCommandSchema,
  wsRetryCommandSchema,
  wsCollabPresenceCommandSchema,
  wsCollabCursorCommandSchema,
  wsCollabSelectionCommandSchema,
  wsCollabCanvasMutationCommandSchema,
  wsRpcResponseSchema,
]);

// --- Union: Server → Client ---

export const wsServerMessageSchema = z.discriminatedUnion("type", [
  wsServerEventSchema,
  wsRpcRequestSchema,
  wsCommandAckSchema,
]);

// --- Type exports ---

export type WsServerEvent = z.infer<typeof wsServerEventSchema>;
export type WsRpcRequest = z.infer<typeof wsRpcRequestSchema>;
export type WsCommandAck = z.infer<typeof wsCommandAckSchema>;
export type WsRunCommand = z.infer<typeof wsRunCommandSchema>;
export type WsCancelCommand = z.infer<typeof wsCancelCommandSchema>;
export type WsInterruptCommand = z.infer<typeof wsInterruptCommandSchema>;
export type WsResumeCommand = z.infer<typeof wsResumeCommandSchema>;
export type WsAgentResumeCommand = z.infer<typeof wsAgentResumeCommandSchema>;
export type WsRetryCommand = z.infer<typeof wsRetryCommandSchema>;
export type WsCollabPresenceCommand = z.infer<
  typeof wsCollabPresenceCommandSchema
>;
export type WsCollabCursorCommand = z.infer<typeof wsCollabCursorCommandSchema>;
export type WsCollabSelectionCommand = z.infer<
  typeof wsCollabSelectionCommandSchema
>;
export type WsCollabCanvasMutationCommand = z.infer<
  typeof wsCollabCanvasMutationCommandSchema
>;
export type WsCommand = z.infer<typeof wsCommandSchema>;
export type WsRpcResponse = z.infer<typeof wsRpcResponseSchema>;
export type WsClientMessage = z.infer<typeof wsClientMessageSchema>;
export type WsServerMessage = z.infer<typeof wsServerMessageSchema>;

// --- Screenshot-specific params/result ---

export const screenshotParamsSchema = z.object({
  mode: z.enum(["full", "region", "viewport"]),
  region: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
  max_dimension: z.number().default(1024),
});

export const screenshotResultSchema = z.object({
  url: z.string().min(1),
  width: z.number(),
  height: z.number(),
});

export type ScreenshotParams = z.infer<typeof screenshotParamsSchema>;
export type ScreenshotResult = z.infer<typeof screenshotResultSchema>;
