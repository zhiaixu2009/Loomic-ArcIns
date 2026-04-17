import type { FastifyInstance, FastifyReply } from "fastify";

import {
  applicationErrorResponseSchema,
  exportManifestResponseSchema,
  reviewPackageResponseSchema,
  shareSnapshotRequestSchema,
  shareSnapshotResponseSchema,
  type ArchitectureContext,
  type ExportSelection,
  unauthenticatedErrorResponseSchema,
} from "@loomic/shared";

import {
  ExportServiceError,
  type ExportService,
} from "../features/exports/export-service.js";
import type { RequestAuthenticator } from "../supabase/user.js";

export async function registerExportRoutes(
  app: FastifyInstance,
  options: {
    auth: RequestAuthenticator;
    exportService: ExportService;
  },
) {
  app.post("/api/exports/share-snapshot", async (request, reply) => {
    try {
      const user = await options.auth.authenticate(request);
      if (!user) return sendUnauthorized(reply);

      const payload = shareSnapshotRequestSchema.parse(request.body);
      const snapshot = await options.exportService.createShareSnapshot(
        user,
        payload,
      );
      request.log.info(
        {
          assetId: snapshot.assetId,
          canvasId: payload.canvasId,
          projectId: payload.projectId,
        },
        "exports.shareSnapshot OK",
      );

      return reply.code(201).send(
        shareSnapshotResponseSchema.parse({
          snapshot,
        }),
      );
    } catch (error) {
      request.log.error(
        {
          err: error,
        },
        "exports.shareSnapshot FAILED",
      );
      return sendExportError(error, reply);
    }
  });

  app.post("/api/exports/review-package", async (request, reply) => {
    try {
      const user = await options.auth.authenticate(request);
      if (!user) return sendUnauthorized(reply);

      const payload = parseExportBuildRequest(request.body);
      const reviewPackage = await options.exportService.buildReviewPackage(
        user,
        payload,
      );
      request.log.info(
        {
          canvasId: payload.canvasId,
          projectId: payload.projectId,
          traceabilityEntries: reviewPackage.traceabilityLedger.length,
        },
        "exports.reviewPackage OK",
      );

      return reply.code(200).send(
        reviewPackageResponseSchema.parse({
          reviewPackage,
        }),
      );
    } catch (error) {
      request.log.error(
        {
          err: error,
        },
        "exports.reviewPackage FAILED",
      );
      return sendExportError(error, reply);
    }
  });

  app.post("/api/exports/manifest", async (request, reply) => {
    try {
      const user = await options.auth.authenticate(request);
      if (!user) return sendUnauthorized(reply);

      const payload = parseExportBuildRequest(request.body);
      const manifest = await options.exportService.buildManifest(
        user,
        payload,
      );
      request.log.info(
        {
          canvasId: payload.canvasId,
          projectId: payload.projectId,
          sessionCount: manifest.sessions.length,
          traceabilityEntries: manifest.traceabilityLedger.length,
        },
        "exports.manifest OK",
      );

      return reply.code(200).send(
        exportManifestResponseSchema.parse({
          manifest,
        }),
      );
    } catch (error) {
      request.log.error(
        {
          err: error,
        },
        "exports.manifest FAILED",
      );
      return sendExportError(error, reply);
    }
  });
}

function sendUnauthorized(reply: FastifyReply) {
  return reply.code(401).send(
    unauthenticatedErrorResponseSchema.parse({
      error: {
        code: "unauthorized",
        message: "Missing or invalid bearer token.",
      },
    }),
  );
}

function sendExportError(error: unknown, reply: FastifyReply) {
  if (error instanceof ExportServiceError) {
    return reply.code(error.statusCode).send(
      applicationErrorResponseSchema.parse({
        error: {
          code: error.code,
          message: error.message,
        },
      }),
    );
  }

  if (error instanceof ExportRouteValidationError) {
    return reply.code(400).send({
      message: error.message,
    });
  }

  if (isZodError(error)) {
    return reply.code(400).send({
      issues: error.issues,
      message: "Invalid request body",
    });
  }

  return reply.code(500).send(
    applicationErrorResponseSchema.parse({
      error: {
        code: "application_error",
        message: "Internal server error.",
      },
    }),
  );
}

function isZodError(
  error: unknown,
): error is { issues: unknown[]; name: string } {
  return (
    error instanceof Error &&
    error.name === "ZodError" &&
    "issues" in error &&
    Array.isArray(error.issues)
  );
}

function parseExportBuildRequest(body: unknown): {
  architectureContext?: ArchitectureContext;
  canvasId: string;
  projectId: string;
  selection?: ExportSelection;
} {
  const payload = asRecord(body);
  const projectId = readNonEmptyString(payload.projectId, "projectId");
  const canvasId = readNonEmptyString(payload.canvasId, "canvasId");

  const architectureContext = payload.architectureContext;
  let parsedArchitectureContext: ArchitectureContext | undefined;
  if (architectureContext !== undefined) {
    parsedArchitectureContext = parseArchitectureContext(architectureContext);
  }

  const selection = payload.selection;
  let parsedSelection: ExportSelection | undefined;
  if (selection !== undefined) {
    parsedSelection = parseExportSelection(selection);
  }

  return {
    architectureContext: parsedArchitectureContext,
    canvasId,
    projectId,
    selection: parsedSelection,
  };
}

class ExportRouteValidationError extends Error {}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ExportRouteValidationError("Invalid request body");
  }
  return value as Record<string, unknown>;
}

function readNonEmptyString(value: unknown, key: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ExportRouteValidationError(`Missing or invalid ${key}.`);
  }
  return value;
}

function parseArchitectureContext(value: unknown): ArchitectureContext {
  const payload = asRecord(value);

  if (payload.studio !== "architecture") {
    throw new ExportRouteValidationError("architectureContext.studio must be architecture.");
  }

  if (!Array.isArray(payload.boards)) {
    throw new ExportRouteValidationError("architectureContext.boards must be an array.");
  }

  if (!Array.isArray(payload.selectedElementIds)) {
    throw new ExportRouteValidationError(
      "architectureContext.selectedElementIds must be an array.",
    );
  }

  if (!Array.isArray(payload.objectTypesInSelection)) {
    throw new ExportRouteValidationError(
      "architectureContext.objectTypesInSelection must be an array.",
    );
  }

  if (!Array.isArray(payload.strategyOptions)) {
    throw new ExportRouteValidationError(
      "architectureContext.strategyOptions must be an array.",
    );
  }

  return payload as ArchitectureContext;
}

function parseExportSelection(value: unknown): ExportSelection {
  const payload = asRecord(value);
  const selectedElementIds = Array.isArray(payload.selectedElementIds)
    ? payload.selectedElementIds.filter(
        (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
      )
    : [];

  if (selectedElementIds.length > 200) {
    throw new ExportRouteValidationError(
      "selection.selectedElementIds exceeds the supported limit.",
    );
  }

  return {
    ...(typeof payload.activeBoardId === "string" && payload.activeBoardId.trim().length > 0
      ? { activeBoardId: payload.activeBoardId }
      : {}),
    selectedElementIds,
  };
}
