import { describe, expect, it } from "vitest";

import {
  exportManifestSchema,
  reviewPackageSchema,
  shareSnapshotSchema,
  traceabilityLedgerEntrySchema,
} from "./export-contracts.js";
import {
  exportManifestResponseSchema,
  reviewPackageResponseSchema,
  shareSnapshotRequestSchema,
  shareSnapshotResponseSchema,
} from "./http.js";

describe("export contracts", () => {
  it("accepts a bounded share snapshot request/response payload", () => {
    const request = shareSnapshotRequestSchema.parse({
      projectId: "project_123",
      canvasId: "canvas_123",
      snapshotDataUrl: "data:image/png;base64,AAAA",
      title: "South facade review",
      source: {
        studio: "architecture",
        activeBoardId: "architecture-board-render_variations",
      },
    });

    expect(request.source.studio).toBe("architecture");

    const response = shareSnapshotResponseSchema.parse({
      snapshot: {
        assetId: "asset_123",
        url: "https://assets.example.com/snapshot.png",
        mimeType: "image/png",
        createdAt: "2026-04-13T09:00:00.000Z",
        projectId: "project_123",
        canvasId: "canvas_123",
      },
    });

    expect(response.snapshot.assetId).toBe("asset_123");
    expect(shareSnapshotSchema.parse(response.snapshot).projectId).toBe("project_123");
  });

  it("accepts review packages and manifests with traceability ledger entries", () => {
    const ledgerEntry = traceabilityLedgerEntrySchema.parse({
      entryId: "ledger_1",
      kind: "plan_step",
      label: "Compare facade options",
      sourceId: "step_1",
      sourceType: "agent_plan_step",
      relatedIds: ["asset_123", "board_456"],
      recordedAt: "2026-04-13T09:00:00.000Z",
    });

    expect(ledgerEntry.relatedIds).toContain("asset_123");

    const reviewPackage = reviewPackageSchema.parse({
      project: {
        id: "project_123",
        name: "Harbor Tower",
        slug: "harbor-tower",
        description: "Mixed-use waterfront concept",
        thumbnailUrl: null,
        workspace: {
          id: "workspace_123",
          name: "Studio",
          type: "personal",
          ownerUserId: "user_123",
        },
        primaryCanvas: {
          id: "canvas_123",
          name: "Main Canvas",
          isPrimary: true,
        },
        createdAt: "2026-04-13T09:00:00.000Z",
        updatedAt: "2026-04-13T09:00:00.000Z",
      },
      canvas: {
        id: "canvas_123",
        name: "Main Canvas",
      },
      selection: {
        selectedElementIds: ["element_a"],
        activeBoardId: "architecture-board-render_variations",
      },
      architectureContext: {
        studio: "architecture",
        boards: [],
        selectedElementIds: ["element_a"],
        objectTypesInSelection: [],
        strategyOptions: [],
      },
      latestPlan: {
        planId: "plan_123",
        runId: "run_123",
        goal: "Create a facade review package",
        status: "completed",
        availableActions: [],
        updatedAt: "2026-04-13T09:00:00.000Z",
        steps: [
          {
            stepId: "step_1",
            title: "Compare facade options",
            status: "completed",
            toolCallIds: [],
            artifactCount: 1,
            lastUpdatedAt: "2026-04-13T09:00:00.000Z",
          },
        ],
      },
      artifacts: [
        {
          id: "asset_123",
          bucket: "project-assets",
          objectPath: "workspace_123/project_123/render.png",
          mimeType: "image/png",
          byteSize: 2048,
          workspaceId: "workspace_123",
          projectId: "project_123",
          createdAt: "2026-04-13T09:00:00.000Z",
        },
      ],
      shareSnapshots: [
        {
          assetId: "asset_123",
          url: "https://assets.example.com/snapshot.png",
          mimeType: "image/png",
          createdAt: "2026-04-13T09:00:00.000Z",
          projectId: "project_123",
          canvasId: "canvas_123",
        },
      ],
      traceabilityLedger: [ledgerEntry],
      generatedAt: "2026-04-13T09:00:00.000Z",
    });

    expect(reviewPackage.traceabilityLedger).toHaveLength(1);

    const manifest = exportManifestSchema.parse({
      manifestVersion: "1",
      project: reviewPackage.project,
      canvas: reviewPackage.canvas,
      sessions: [
        {
          sessionId: "session_123",
          title: "Facade review",
          messageCount: 4,
          latestRunId: "run_123",
        },
      ],
      artifacts: reviewPackage.artifacts,
      shareSnapshots: reviewPackage.shareSnapshots,
      traceabilityLedger: reviewPackage.traceabilityLedger,
      generatedAt: "2026-04-13T09:00:00.000Z",
    });

    expect(manifest.sessions[0]?.latestRunId).toBe("run_123");
    expect(reviewPackageResponseSchema.parse({ reviewPackage }).reviewPackage.project.id).toBe(
      "project_123",
    );
    expect(exportManifestResponseSchema.parse({ manifest }).manifest.manifestVersion).toBe("1");
  });

  it("rejects malformed share snapshot and traceability payloads", () => {
    expect(() =>
      shareSnapshotRequestSchema.parse({
        projectId: "project_123",
        canvasId: "canvas_123",
        snapshotDataUrl: "not-a-data-url",
        source: { studio: "architecture" },
      }),
    ).toThrow();

    expect(() =>
      traceabilityLedgerEntrySchema.parse({
        entryId: "ledger_1",
        kind: "unknown_kind",
        label: "Bad entry",
        sourceId: "step_1",
        sourceType: "agent_plan_step",
        relatedIds: [],
        recordedAt: "2026-04-13T09:00:00.000Z",
      }),
    ).toThrow();
  });
});
