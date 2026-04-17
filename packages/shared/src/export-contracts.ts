import { z } from "zod";

import { architectureContextSchema } from "./architecture-contracts.js";
import {
  agentPlanSchema,
  assetObjectSchema,
  canvasIdSchema,
  identifierSchema,
  projectIdSchema,
  projectSummarySchema,
  runIdSchema,
  sessionIdSchema,
  timestampSchema,
} from "./contracts.js";

export const exportCanvasSummarySchema = z.object({
  id: canvasIdSchema,
  name: z.string().min(1),
});

export const shareSnapshotSourceSchema = z.object({
  studio: z.literal("architecture"),
  activeBoardId: identifierSchema.optional(),
});

export const shareSnapshotRequestSchema = z.object({
  projectId: projectIdSchema,
  canvasId: canvasIdSchema,
  snapshotDataUrl: z
    .string()
    .regex(
      /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=]+$/i,
      "Expected an image data URL.",
    ),
  title: z.string().trim().min(1).max(200).optional(),
  source: shareSnapshotSourceSchema,
});

export const shareSnapshotSchema = z.object({
  assetId: identifierSchema,
  url: z.string().url(),
  mimeType: z.string().trim().min(1).regex(/^image\//, "Expected an image MIME type."),
  createdAt: timestampSchema,
  projectId: projectIdSchema,
  canvasId: canvasIdSchema,
});

export const traceabilityLedgerKindSchema = z.enum([
  "strategy",
  "plan_step",
  "artifact",
  "board",
]);

export const traceabilityLedgerSourceTypeSchema = z.enum([
  "architecture_strategy_option",
  "agent_plan_step",
  "project_asset",
  "architecture_board",
  "share_snapshot",
]);

export const traceabilityLedgerEntrySchema = z.object({
  entryId: identifierSchema,
  kind: traceabilityLedgerKindSchema,
  label: z.string().trim().min(1),
  sourceId: identifierSchema,
  sourceType: traceabilityLedgerSourceTypeSchema,
  relatedIds: z.array(identifierSchema).default([]),
  recordedAt: timestampSchema,
});

export const exportSelectionSchema = z.object({
  selectedElementIds: z.array(identifierSchema).max(200).default([]),
  activeBoardId: identifierSchema.optional(),
});

export const exportSessionSummarySchema = z.object({
  sessionId: sessionIdSchema,
  title: z.string().trim().min(1),
  messageCount: z.number().int().nonnegative(),
  latestRunId: runIdSchema.optional(),
});

export const reviewPackageSchema = z.object({
  project: projectSummarySchema,
  canvas: exportCanvasSummarySchema,
  selection: exportSelectionSchema,
  architectureContext: architectureContextSchema.optional(),
  latestPlan: agentPlanSchema.optional(),
  artifacts: z.array(assetObjectSchema).default([]),
  shareSnapshots: z.array(shareSnapshotSchema).default([]),
  traceabilityLedger: z.array(traceabilityLedgerEntrySchema).default([]),
  generatedAt: timestampSchema,
});

export const exportManifestSchema = z.object({
  manifestVersion: z.string().trim().min(1),
  project: projectSummarySchema,
  canvas: exportCanvasSummarySchema,
  sessions: z.array(exportSessionSummarySchema).default([]),
  artifacts: z.array(assetObjectSchema).default([]),
  shareSnapshots: z.array(shareSnapshotSchema).default([]),
  traceabilityLedger: z.array(traceabilityLedgerEntrySchema).default([]),
  generatedAt: timestampSchema,
});

export type ExportCanvasSummary = z.infer<typeof exportCanvasSummarySchema>;
export type ShareSnapshotSource = z.infer<typeof shareSnapshotSourceSchema>;
export type ShareSnapshotRequest = z.infer<typeof shareSnapshotRequestSchema>;
export type ShareSnapshot = z.infer<typeof shareSnapshotSchema>;
export type TraceabilityLedgerKind = z.infer<typeof traceabilityLedgerKindSchema>;
export type TraceabilityLedgerSourceType = z.infer<typeof traceabilityLedgerSourceTypeSchema>;
export type TraceabilityLedgerEntry = z.infer<typeof traceabilityLedgerEntrySchema>;
export type ExportSelection = z.infer<typeof exportSelectionSchema>;
export type ExportSessionSummary = z.infer<typeof exportSessionSummarySchema>;
export type ReviewPackage = z.infer<typeof reviewPackageSchema>;
export type ExportManifest = z.infer<typeof exportManifestSchema>;
