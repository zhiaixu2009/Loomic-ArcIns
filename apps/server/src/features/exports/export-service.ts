import {
  agentPlanSchema,
  assetBucketSchema,
  exportSelectionSchema,
  type ArchitectureContext,
  type AssetObject,
  type ExportManifest,
  type ExportSelection,
  type ExportSessionSummary,
  type ProjectSummary,
  type ReviewPackage,
  type ShareSnapshot,
  type ShareSnapshotRequest,
  type TraceabilityLedgerEntry,
} from "@loomic/shared";

import type { ViewerService } from "../bootstrap/ensure-user-foundation.js";
import type { UploadService } from "../uploads/upload-service.js";
import type {
  AuthenticatedUser,
  UserSupabaseClient,
} from "../../supabase/user.js";

const MANIFEST_VERSION = "1";
const SHARE_SNAPSHOT_FILE_PREFIX = "share-snapshot";
const EXPORT_QUERY_RETRY_ATTEMPTS = 3;
const EXPORT_QUERY_RETRY_DELAY_MS = 150;

export type ExportBuildInput = {
  projectId: string;
  canvasId: string;
  selection?: ExportSelection | undefined;
  architectureContext?: ArchitectureContext | undefined;
};

export type ExportService = {
  createShareSnapshot(
    user: AuthenticatedUser,
    input: ShareSnapshotRequest,
  ): Promise<ShareSnapshot>;
  buildReviewPackage(
    user: AuthenticatedUser,
    input: ExportBuildInput,
  ): Promise<ReviewPackage>;
  buildManifest(
    user: AuthenticatedUser,
    input: ExportBuildInput,
  ): Promise<ExportManifest>;
};

export class ExportServiceError extends Error {
  readonly statusCode: number;
  readonly code:
    | "application_error"
    | "canvas_not_found"
    | "chat_error"
    | "project_not_found"
    | "project_query_failed"
    | "upload_failed";

  constructor(
    code:
      | "application_error"
      | "canvas_not_found"
      | "chat_error"
      | "project_not_found"
      | "project_query_failed"
      | "upload_failed",
    message: string,
    statusCode: number,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

type SessionMessageRow = {
  content_blocks: unknown[] | null;
  created_at: string;
};

type SessionEnvelope = {
  id: string;
  title: string;
  messages: SessionMessageRow[];
};

type ProjectSummaryRow = {
  created_at: string;
  description: string | null;
  id: string;
  name: string;
  slug: string;
  thumbnail_path: string | null;
  updated_at: string;
  workspace_id: string;
};

type WorkspaceSummaryRow = {
  id: string;
  name: string;
  owner_user_id: string;
  type: "personal" | "team";
};

type PrimaryCanvasSummaryRow = {
  id: string;
  is_primary: boolean;
  name: string;
};

type CanvasSummaryRow = {
  id: string;
  name: string;
  project_id: string;
};

type ProjectArtifactRow = {
  bucket: string;
  byte_size: number | null;
  created_at: string;
  id: string;
  mime_type: string | null;
  object_path: string;
  project_id: string | null;
  workspace_id: string;
};

export function createExportService(options: {
  createUserClient: (accessToken: string) => UserSupabaseClient;
  uploadService: UploadService;
  viewerService: ViewerService;
}): ExportService {
  return {
    async createShareSnapshot(user, input) {
      const client = options.createUserClient(user.accessToken);
      const [{ project }, canvas] = await Promise.all([
        resolveProjectSummary(client, input.projectId),
        resolveCanvasSummary(client, input.projectId, input.canvasId),
      ]);

      const decoded = decodeSnapshotDataUrl(input.snapshotDataUrl);
      const title = normalizeTitle(input.title);
      const fileName = `${SHARE_SNAPSHOT_FILE_PREFIX}-${title}-${Date.now()}.${decoded.fileExtension}`;

      const uploadResult = await options.uploadService.uploadFile(user, {
        bucket: "project-assets",
        fileName,
        fileBuffer: decoded.fileBuffer,
        mimeType: decoded.mimeType,
        projectId: input.projectId,
        workspaceId: project.workspace.id,
      });

      return {
        assetId: uploadResult.asset.id,
        canvasId: canvas.id,
        createdAt: uploadResult.asset.createdAt,
        mimeType: uploadResult.asset.mimeType ?? decoded.mimeType,
        projectId: project.id,
        url: uploadResult.url,
      };
    },

    async buildReviewPackage(user, input) {
      const client = options.createUserClient(user.accessToken);
      const generatedAt = new Date().toISOString();
      const selection = exportSelectionSchema.parse(input.selection ?? {});

      const projectResult = await resolveProjectSummary(client, input.projectId);
      const canvas = await resolveCanvasSummary(
        client,
        input.projectId,
        input.canvasId,
      );
      const artifacts = await listProjectArtifacts(client, input.projectId);
      const sessions = await listCanvasSessionsWithMessages(
        client,
        input.canvasId,
      );

      const latestPlan = deriveLatestPlan(sessions);
      const shareSnapshots = deriveShareSnapshots(
        artifacts,
        input.projectId,
        input.canvasId,
        client,
      );
      const traceabilityLedger = deriveTraceabilityLedger({
        architectureContext: input.architectureContext,
        artifacts,
        latestPlan,
        recordedAt: generatedAt,
      });

      return {
        architectureContext: input.architectureContext,
        artifacts,
        canvas,
        generatedAt,
        latestPlan,
        project: projectResult.project,
        selection,
        shareSnapshots,
        traceabilityLedger,
      };
    },

    async buildManifest(user, input) {
      const client = options.createUserClient(user.accessToken);
      const generatedAt = new Date().toISOString();

      const projectResult = await resolveProjectSummary(client, input.projectId);
      const canvas = await resolveCanvasSummary(
        client,
        input.projectId,
        input.canvasId,
      );
      const artifacts = await listProjectArtifacts(client, input.projectId);
      const sessions = await listCanvasSessionsWithMessages(
        client,
        input.canvasId,
      );

      const latestPlan = deriveLatestPlan(sessions);
      const traceabilityLedger = deriveTraceabilityLedger({
        architectureContext: input.architectureContext,
        artifacts,
        latestPlan,
        recordedAt: generatedAt,
      });

      return {
        artifacts,
        canvas,
        generatedAt,
        manifestVersion: MANIFEST_VERSION,
        project: projectResult.project,
        sessions: mapManifestSessions(sessions),
        shareSnapshots: deriveShareSnapshots(
          artifacts,
          input.projectId,
          input.canvasId,
          client,
        ),
        traceabilityLedger,
      };
    },
  };
}

async function resolveProjectSummary(
  client: UserSupabaseClient,
  projectId: string,
): Promise<{ project: ProjectSummary }> {
  const { data: projectRow, error: projectError } = await executeExportQuery<ProjectSummaryRow>({
    context: { projectId },
    label: "project summary",
    query: async () =>
      client
        .from("projects")
        .select(
          "id, name, slug, description, workspace_id, created_at, updated_at, thumbnail_path",
        )
        .eq("id", projectId)
        .is("archived_at", null)
        .maybeSingle(),
  });

  if (projectError) {
    console.error("[exports] project summary query failed", {
      projectId,
      error: projectError,
    });
    throw new ExportServiceError(
      "project_query_failed",
      "Unable to load projects.",
      500,
    );
  }

  if (!projectRow) {
    console.warn("[exports] project summary missing", {
      projectId,
    });
    throw new ExportServiceError(
      "project_not_found",
      "Project not found.",
      404,
    );
  }

  const workspaceResult = await executeExportQuery<WorkspaceSummaryRow>({
    context: {
      projectId,
      workspaceId: projectRow.workspace_id,
    },
    label: "workspace summary",
    query: async () =>
      client
        .from("workspaces")
        .select("id, name, type, owner_user_id")
        .eq("id", projectRow.workspace_id)
        .maybeSingle(),
  });
  const canvasResult = await executeExportQuery<PrimaryCanvasSummaryRow>({
    context: {
      projectId,
    },
    label: "primary canvas summary",
    query: async () =>
      client
        .from("canvases")
        .select("id, name, is_primary")
        .eq("project_id", projectRow.id)
        .eq("is_primary", true)
        .maybeSingle(),
  });

  if (workspaceResult.error || !workspaceResult.data) {
    console.error("[exports] workspace summary query failed", {
      projectId,
      workspaceId: projectRow.workspace_id,
      error: workspaceResult.error,
      hasWorkspace: Boolean(workspaceResult.data),
    });
    throw new ExportServiceError(
      "project_query_failed",
      "Unable to load projects.",
      500,
    );
  }

  if (canvasResult.error || !canvasResult.data) {
    console.error("[exports] primary canvas summary query failed", {
      projectId,
      error: canvasResult.error,
      hasPrimaryCanvas: Boolean(canvasResult.data),
    });
    throw new ExportServiceError(
      "project_query_failed",
      "Unable to load projects.",
      500,
    );
  }

  const thumbnailUrl = projectRow.thumbnail_path
    ? client.storage
        .from("project-assets")
        .getPublicUrl(projectRow.thumbnail_path).data.publicUrl
    : null;

  return {
    project: {
      createdAt: projectRow.created_at,
      description: projectRow.description,
      id: projectRow.id,
      name: projectRow.name,
      primaryCanvas: {
        id: canvasResult.data.id,
        isPrimary: canvasResult.data.is_primary,
        name: canvasResult.data.name,
      },
      slug: projectRow.slug,
      thumbnailUrl,
      updatedAt: projectRow.updated_at,
      workspace: {
        id: workspaceResult.data.id,
        name: workspaceResult.data.name,
        ownerUserId: workspaceResult.data.owner_user_id,
        type: workspaceResult.data.type,
      },
    },
  };
}

async function resolveCanvasSummary(
  client: UserSupabaseClient,
  projectId: string,
  canvasId: string,
): Promise<{ id: string; name: string }> {
  const { data: canvasRow, error } = await executeExportQuery<CanvasSummaryRow>({
    context: {
      canvasId,
      projectId,
    },
    label: "canvas summary",
    query: async () =>
      client
        .from("canvases")
        .select("id, name, project_id")
        .eq("id", canvasId)
        .maybeSingle(),
  });

  if (error) {
    console.error("[exports] canvas summary query failed", {
      canvasId,
      projectId,
      error,
    });
    throw new ExportServiceError(
      "project_query_failed",
      "Unable to load canvas.",
      500,
    );
  }

  if (!canvasRow || canvasRow.project_id !== projectId) {
    console.warn("[exports] canvas summary missing or mismatched", {
      canvasId,
      projectId,
      resolvedProjectId: canvasRow?.project_id ?? null,
    });
    throw new ExportServiceError(
      "canvas_not_found",
      "Canvas not found.",
      404,
    );
  }

  return {
    id: canvasRow.id,
    name: canvasRow.name,
  };
}

async function listProjectArtifacts(
  client: UserSupabaseClient,
  projectId: string,
): Promise<AssetObject[]> {
  const { data, error } = await executeExportQuery<ProjectArtifactRow[]>({
    context: { projectId },
    label: "project artifacts",
    query: async () =>
      client
        .from("asset_objects")
        .select(
          "id, bucket, object_path, mime_type, byte_size, workspace_id, project_id, created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
  });

  if (error) {
    console.error("[exports] project artifacts query failed", {
      projectId,
      error,
    });
    throw new ExportServiceError(
      "project_query_failed",
      "Unable to load projects.",
      500,
    );
  }

  return (data ?? []).map((row) =>
    mapProjectArtifactRow(row, { projectId }),
  );
}

async function listCanvasSessionsWithMessages(
  client: UserSupabaseClient,
  canvasId: string,
): Promise<SessionEnvelope[]> {
  const { data: sessions, error: sessionsError } = await executeExportQuery({
    context: { canvasId },
    label: "chat sessions",
    query: async () =>
      client
        .from("chat_sessions")
        .select("id, title")
        .eq("canvas_id", canvasId)
        .order("updated_at", { ascending: false }),
  });

  if (sessionsError) {
    console.error("[exports] chat sessions query failed", {
      canvasId,
      error: sessionsError,
    });
    throw new ExportServiceError(
      "chat_error",
      "Failed to list sessions.",
      500,
    );
  }

  const envelopes = await Promise.all(
    (sessions ?? []).map(async (session) => {
      const { data: messages, error: messageError } = await executeExportQuery({
        context: {
          canvasId,
          sessionId: session.id,
        },
        label: "chat messages",
        query: async () =>
          client
            .from("chat_messages")
            .select("content_blocks, created_at")
            .eq("session_id", session.id)
            .order("created_at", { ascending: true }),
      });

      if (messageError) {
        console.error("[exports] chat messages query failed", {
          canvasId,
          sessionId: session.id,
          error: messageError,
        });
        throw new ExportServiceError(
          "chat_error",
          "Failed to list messages.",
          500,
        );
      }

      return {
        id: session.id,
        messages: (messages ?? []) as SessionMessageRow[],
        title: session.title,
      } satisfies SessionEnvelope;
    }),
  );

  return envelopes;
}

function mapManifestSessions(
  sessions: SessionEnvelope[],
): ExportSessionSummary[] {
  return sessions.map((session) => ({
    latestRunId: resolveLatestRunIdFromMessages(session.messages),
    messageCount: session.messages.length,
    sessionId: session.id,
    title: session.title,
  }));
}

function deriveLatestPlan(sessions: SessionEnvelope[]) {
  const orderedSessions = [...sessions];

  for (const session of orderedSessions) {
    const orderedMessages = [...session.messages].reverse();
    for (const message of orderedMessages) {
      const blocks = Array.isArray(message.content_blocks)
        ? message.content_blocks
        : [];
      for (const block of [...blocks].reverse()) {
        if (!isAgentPlanBlock(block)) continue;
        const parsed = agentPlanSchema.safeParse(block.plan);
        if (parsed.success) {
          return parsed.data;
        }
      }
    }
  }

  return undefined;
}

function deriveTraceabilityLedger(options: {
  artifacts: AssetObject[];
  architectureContext?: ArchitectureContext | undefined;
  latestPlan?: ReturnType<typeof deriveLatestPlan>;
  recordedAt: string;
}): TraceabilityLedgerEntry[] {
  const entries: TraceabilityLedgerEntry[] = [];
  const recordedAt = options.recordedAt;
  let sequence = 0;

  const addEntry = (entry: Omit<TraceabilityLedgerEntry, "entryId">) => {
    sequence += 1;
    entries.push({
      ...entry,
      entryId: `ledger_${sequence}_${Date.now()}`,
    });
  };

  for (const strategyOption of options.architectureContext?.strategyOptions ?? []) {
    addEntry({
      kind: "strategy",
      label: strategyOption.title,
      recordedAt,
      relatedIds: [],
      sourceId: strategyOption.optionId,
      sourceType: "architecture_strategy_option",
    });
  }

  for (const board of options.architectureContext?.boards ?? []) {
    addEntry({
      kind: "board",
      label: board.title,
      recordedAt,
      relatedIds: board.elementIds,
      sourceId: board.boardId,
      sourceType: "architecture_board",
    });
  }

  for (const step of options.latestPlan?.steps ?? []) {
    addEntry({
      kind: "plan_step",
      label: step.title,
      recordedAt,
      relatedIds: step.toolCallIds,
      sourceId: step.stepId,
      sourceType: "agent_plan_step",
    });
  }

  for (const artifact of options.artifacts) {
    addEntry({
      kind: "artifact",
      label: artifact.objectPath.split("/").pop() || artifact.id,
      recordedAt,
      relatedIds: [],
      sourceId: artifact.id,
      sourceType: "project_asset",
    });
  }

  return entries;
}

function deriveShareSnapshots(
  artifacts: AssetObject[],
  projectId: string,
  canvasId: string,
  client: UserSupabaseClient,
): ShareSnapshot[] {
  const snapshots: ShareSnapshot[] = [];

  // TODO(m6-export-history): Persist share snapshot metadata (including canvasId)
  // in a dedicated table so manifests can avoid inferring scope from file names.
  for (const artifact of artifacts) {
    const mimeType = artifact.mimeType ?? "";
    if (!mimeType.startsWith("image/")) continue;
    if (!artifact.objectPath.includes(SHARE_SNAPSHOT_FILE_PREFIX)) continue;

    const { data } = client.storage
      .from(artifact.bucket)
      .getPublicUrl(artifact.objectPath);

    snapshots.push({
      assetId: artifact.id,
      canvasId,
      createdAt: artifact.createdAt,
      mimeType,
      projectId,
      url: data.publicUrl,
    });
  }

  return snapshots;
}

function resolveLatestRunIdFromMessages(
  messages: SessionMessageRow[],
): string | undefined {
  const orderedMessages = [...messages].reverse();
  for (const message of orderedMessages) {
    const blocks = Array.isArray(message.content_blocks)
      ? message.content_blocks
      : [];

    for (const block of [...blocks].reverse()) {
      if (!isAgentPlanBlock(block)) continue;
      const runId = readString((block as { plan?: { runId?: unknown } }).plan?.runId);
      if (runId) return runId;
    }
  }
  return undefined;
}

function isAgentPlanBlock(
  value: unknown,
): value is { type: "agent-plan"; plan: Record<string, unknown> } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "agent-plan" &&
    typeof (value as { plan?: unknown }).plan === "object" &&
    (value as { plan?: unknown }).plan !== null
  );
}

function decodeSnapshotDataUrl(snapshotDataUrl: string) {
  const match = snapshotDataUrl.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/i,
  );
  if (!match) {
    throw new ExportServiceError(
      "upload_failed",
      "Expected an image data URL.",
      400,
    );
  }

  const mimeType = match[1]!.toLowerCase();
  const fileBuffer = Buffer.from(match[2]!, "base64");
  return {
    fileBuffer,
    fileExtension: mimeToExtension(mimeType),
    mimeType,
  };
}

function normalizeTitle(title: string | undefined): string {
  const base = title?.trim() || "snapshot";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64) || "snapshot";
}

function mimeToExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function executeExportQuery<TData>(options: {
  context: Record<string, string>;
  label: string;
  query: () => Promise<{
    data: TData | null;
    error: {
      code?: string | null;
      details?: string | null;
      hint?: string | null;
      message?: string | null;
    } | null;
  }>;
}) {
  let lastResult:
    | {
        data: TData | null;
        error: {
          code?: string | null;
          details?: string | null;
          hint?: string | null;
          message?: string | null;
        } | null;
      }
    | undefined;

  for (let attempt = 1; attempt <= EXPORT_QUERY_RETRY_ATTEMPTS; attempt += 1) {
    const result = await options.query();
    lastResult = result;

    if (!result.error || !isTransientSupabaseError(result.error)) {
      return result;
    }

    if (attempt === EXPORT_QUERY_RETRY_ATTEMPTS) {
      return result;
    }

    console.warn("[exports] retrying transient query failure", {
      attempt,
      label: options.label,
      ...options.context,
      error: result.error,
    });
    await delay(EXPORT_QUERY_RETRY_DELAY_MS * attempt);
  }

  return lastResult ?? { data: null, error: null };
}

function isTransientSupabaseError(error: {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string | null;
}) {
  const combined = `${error.message ?? ""}\n${error.details ?? ""}\n${error.hint ?? ""}`;
  return (
    combined.includes("fetch failed") ||
    combined.includes("UND_ERR_SOCKET") ||
    combined.includes("other side closed")
  );
}

function mapProjectArtifactRow(
  row: ProjectArtifactRow,
  context: { projectId: string },
): AssetObject {
  const parsedBucket = assetBucketSchema.safeParse(row.bucket);

  if (!parsedBucket.success) {
    console.error("[exports] invalid asset bucket in project artifacts", {
      assetId: row.id,
      bucket: row.bucket,
      projectId: context.projectId,
      workspaceId: row.workspace_id,
    });
    throw new ExportServiceError(
      "application_error",
      "Unable to load project assets.",
      500,
    );
  }

  return {
    bucket: parsedBucket.data,
    byteSize: row.byte_size,
    createdAt: row.created_at,
    id: row.id,
    mimeType: row.mime_type,
    objectPath: row.object_path,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
