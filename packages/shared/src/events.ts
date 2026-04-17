import { z } from "zod";

import { toolArtifactSchema } from "./artifacts.js";
import {
  agentPlanSchema,
  agentPlanStepSchema,
  canvasCollaboratorSchema,
  canvasCursorSchema,
  canvasIdSchema,
  canvasMutationSourceSchema,
  canvasSelectionSchema,
  conversationIdSchema,
  identifierSchema,
  messageIdSchema,
  runIdSchema,
  sessionIdSchema,
  timestampSchema,
  toolCallIdSchema,
} from "./contracts.js";
import { loomicErrorSchema } from "./errors.js";

export { imageArtifactSchema, videoArtifactSchema, placementSchema, toolArtifactSchema } from "./artifacts.js";
export type { ImageArtifact, VideoArtifact, Placement, ToolArtifact } from "./artifacts.js";

export const runStartedEventSchema = z.object({
  type: z.literal("run.started"),
  runId: runIdSchema,
  sessionId: sessionIdSchema,
  conversationId: conversationIdSchema,
  timestamp: timestampSchema,
});

export const messageDeltaEventSchema = z.object({
  type: z.literal("message.delta"),
  runId: runIdSchema,
  messageId: messageIdSchema,
  delta: z.string(),
  timestamp: timestampSchema,
});

export const toolStartedEventSchema = z.object({
  type: z.literal("tool.started"),
  runId: runIdSchema,
  toolCallId: toolCallIdSchema,
  toolName: z.string().min(1),
  input: z.record(z.unknown()).optional(),
  timestamp: timestampSchema,
});

export const toolCompletedEventSchema = z.object({
  type: z.literal("tool.completed"),
  runId: runIdSchema,
  toolCallId: toolCallIdSchema,
  toolName: z.string().min(1),
  output: z.record(z.unknown()).optional(),
  outputSummary: z.string().optional(),
  artifacts: z.array(toolArtifactSchema).optional(),
  timestamp: timestampSchema,
});

export const runCompletedEventSchema = z.object({
  type: z.literal("run.completed"),
  runId: runIdSchema,
  timestamp: timestampSchema,
});

export const runCanceledEventSchema = z.object({
  type: z.literal("run.canceled"),
  runId: runIdSchema,
  timestamp: timestampSchema,
});

export const runFailedEventSchema = z.object({
  type: z.literal("run.failed"),
  runId: runIdSchema,
  error: loomicErrorSchema,
  timestamp: timestampSchema,
});

export const thinkingDeltaEventSchema = z.object({
  type: z.literal("thinking.delta"),
  runId: runIdSchema,
  messageId: messageIdSchema,
  delta: z.string(),
  timestamp: timestampSchema,
});

export const canvasSyncEventSchema = z.object({
  type: z.literal("canvas.sync"),
  runId: runIdSchema,
  timestamp: timestampSchema,
});

export const agentPlanUpdatedEventSchema = z.object({
  type: z.literal("agent.plan.updated"),
  runId: runIdSchema,
  plan: agentPlanSchema,
  timestamp: timestampSchema,
});

export const agentStepUpdatedEventSchema = z.object({
  type: z.literal("agent.step.updated"),
  runId: runIdSchema,
  planId: identifierSchema,
  step: agentPlanStepSchema,
  timestamp: timestampSchema,
});

export const billingErrorCodeSchema = z.enum([
  "insufficient_credits",
  "model_not_accessible",
  "resolution_not_allowed",
  "concurrency_limit",
]);

export type BillingErrorCode = z.infer<typeof billingErrorCodeSchema>;

export const billingErrorEventSchema = z.object({
  type: z.literal("billing.error"),
  runId: runIdSchema,
  timestamp: timestampSchema,
  code: billingErrorCodeSchema,
  message: z.string(),
  // Credits-specific (only for insufficient_credits)
  currentBalance: z.number().optional(),
  requiredAmount: z.number().optional(),
  plan: z.string().optional(),
  dailyClaimed: z.boolean().optional(),
});

export const runInterruptedEventSchema = z.object({
  type: z.literal("run.interrupted"),
  runId: runIdSchema,
  interrupt: z.object({
    runId: runIdSchema,
    reason: z.enum(["user", "billing", "system"]),
    message: z.string().trim().min(1).optional(),
    interruptedAt: timestampSchema,
  }),
  timestamp: timestampSchema,
});

export const runResumedEventSchema = z.object({
  type: z.literal("run.resumed"),
  runId: runIdSchema,
  sourceRunId: runIdSchema,
  timestamp: timestampSchema,
});

export const runRetriedEventSchema = z.object({
  type: z.literal("run.retried"),
  runId: runIdSchema,
  sourceRunId: runIdSchema,
  timestamp: timestampSchema,
});

export const collabPresenceEventSchema = z.object({
  type: z.literal("collab.presence"),
  canvasId: canvasIdSchema,
  collaborators: z.array(canvasCollaboratorSchema),
  timestamp: timestampSchema,
});

export const collabCursorEventSchema = z.object({
  type: z.literal("collab.cursor"),
  canvasId: canvasIdSchema,
  collaborator: canvasCollaboratorSchema,
  cursor: canvasCursorSchema.nullable(),
  timestamp: timestampSchema,
});

export const collabSelectionEventSchema = z.object({
  type: z.literal("collab.selection"),
  canvasId: canvasIdSchema,
  collaborator: canvasCollaboratorSchema,
  selection: canvasSelectionSchema,
  timestamp: timestampSchema,
});

export const collabCanvasMutationEventSchema = z.object({
  type: z.literal("collab.canvas_mutation"),
  canvasId: canvasIdSchema,
  mutationId: identifierSchema,
  collaborator: canvasCollaboratorSchema,
  source: canvasMutationSourceSchema,
  elementCount: z.number().int().nonnegative(),
  timestamp: timestampSchema,
});

export const streamEventSchema = z.discriminatedUnion("type", [
  runStartedEventSchema,
  messageDeltaEventSchema,
  thinkingDeltaEventSchema,
  toolStartedEventSchema,
  toolCompletedEventSchema,
  runCanceledEventSchema,
  runCompletedEventSchema,
  runFailedEventSchema,
  canvasSyncEventSchema,
  agentPlanUpdatedEventSchema,
  agentStepUpdatedEventSchema,
  billingErrorEventSchema,
  runInterruptedEventSchema,
  runResumedEventSchema,
  runRetriedEventSchema,
  collabPresenceEventSchema,
  collabCursorEventSchema,
  collabSelectionEventSchema,
  collabCanvasMutationEventSchema,
]);

export type StreamEvent = z.infer<typeof streamEventSchema>;
export type AgentPlanUpdatedEvent = z.infer<typeof agentPlanUpdatedEventSchema>;
export type AgentStepUpdatedEvent = z.infer<typeof agentStepUpdatedEventSchema>;
export type RunInterruptedEvent = z.infer<typeof runInterruptedEventSchema>;
export type RunResumedEvent = z.infer<typeof runResumedEventSchema>;
export type RunRetriedEvent = z.infer<typeof runRetriedEventSchema>;
export type CollabPresenceEvent = z.infer<typeof collabPresenceEventSchema>;
export type CollabCursorEvent = z.infer<typeof collabCursorEventSchema>;
export type CollabSelectionEvent = z.infer<typeof collabSelectionEventSchema>;
export type CollabCanvasMutationEvent = z.infer<
  typeof collabCanvasMutationEventSchema
>;
