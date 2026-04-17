import { z } from "zod";

const architectureIdentifierSchema = z.string().min(1);

export const architectureBoardKindSchema = z.enum([
  "reference_board",
  "site_analysis",
  "massing_options",
  "render_variations",
  "storyboard_shots",
  "video_output",
]);

export const architectureObjectTypeSchema = z.enum([
  "site_analysis",
  "massing_option",
  "facade_direction",
  "render_variation",
  "storyboard_shot",
  "presentation_video_shot",
  "review_checkpoint",
]);

export const architectureBoardStatusSchema = z.enum([
  "missing",
  "seeded",
  "active",
]);

export const architectureStrategyDispositionSchema = z.enum([
  "proposed",
  "selected",
  "rejected",
]);

export const architectureBoardAnchorSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const architectureBoardSchema = z.object({
  boardId: architectureIdentifierSchema,
  kind: architectureBoardKindSchema,
  title: z.string().min(1),
  status: architectureBoardStatusSchema,
  elementIds: z.array(architectureIdentifierSchema),
  anchor: architectureBoardAnchorSchema,
  objectTypes: z.array(architectureObjectTypeSchema),
});

export const architectureStrategyOptionSchema = z.object({
  optionId: architectureIdentifierSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  disposition: architectureStrategyDispositionSchema,
});

export const architectureContextSchema = z.object({
  studio: z.literal("architecture"),
  boards: z.array(architectureBoardSchema),
  activeBoardId: architectureIdentifierSchema.optional(),
  selectedElementIds: z.array(architectureIdentifierSchema),
  objectTypesInSelection: z.array(architectureObjectTypeSchema),
  strategyOptions: z.array(architectureStrategyOptionSchema),
});

export type ArchitectureBoardKind = z.infer<typeof architectureBoardKindSchema>;
export type ArchitectureObjectType = z.infer<typeof architectureObjectTypeSchema>;
export type ArchitectureBoardStatus = z.infer<typeof architectureBoardStatusSchema>;
export type ArchitectureStrategyDisposition = z.infer<
  typeof architectureStrategyDispositionSchema
>;
export type ArchitectureBoardAnchor = z.infer<typeof architectureBoardAnchorSchema>;
export type ArchitectureBoard = z.infer<typeof architectureBoardSchema>;
export type ArchitectureStrategyOption = z.infer<
  typeof architectureStrategyOptionSchema
>;
export type ArchitectureContext = z.infer<typeof architectureContextSchema>;
