// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  createRun,
  fetchViewer,
  fetchProjects,
  createProject,
  fetchArchitectureExportManifest,
  fetchArchitectureReviewPackage,
  shareArchitectureSnapshot,
} from "../src/lib/server-api";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("authenticated server API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SERVER_BASE_URL", "http://localhost:3001");
  });

  it("fetchViewer sends bearer token and returns viewer response", async () => {
    const viewer = {
      profile: { id: "u1", email: "a@b.com", displayName: "A", avatarUrl: null },
      workspace: { id: "w1", name: "W", type: "personal", ownerUserId: "u1" },
      membership: { workspaceId: "w1", userId: "u1", role: "owner" },
    };
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => viewer });

    const result = await fetchViewer("token_abc");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/viewer",
      expect.objectContaining({
        headers: { Authorization: "Bearer token_abc" },
      }),
    );
    expect(result.profile.id).toBe("u1");
  });

  it("createRun sends bearer auth when access token is provided", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        runId: "run_123",
        sessionId: "session_123",
        conversationId: "conversation_123",
        status: "accepted",
      }),
    });

    await createRun(
      {
        sessionId: "session_123",
        conversationId: "conversation_123",
        prompt: "Hello",
      },
      { accessToken: "token_abc" },
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/agent/runs",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer token_abc",
          "content-type": "application/json",
        },
      }),
    );
  });

  it("createRun keeps demo calls unauthenticated by default", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        runId: "run_123",
        sessionId: "session_123",
        conversationId: "conversation_123",
        status: "accepted",
      }),
    });

    await createRun({
      sessionId: "session_123",
      conversationId: "conversation_123",
      prompt: "Hello",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/agent/runs",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      }),
    );
  });

  it("createProject sends POST with bearer token and handles 201", async () => {
    const project = {
      project: {
        id: "p1", name: "Test", slug: "test", description: null,
        workspace: { id: "w1", name: "W", type: "personal", ownerUserId: "u1" },
        primaryCanvas: { id: "c1", name: "Main Canvas", isPrimary: true },
        createdAt: "2026-03-23T00:00:00Z", updatedAt: "2026-03-23T00:00:00Z",
      },
    };
    mockFetch.mockResolvedValue({ ok: true, status: 201, json: async () => project });

    const result = await createProject("token_abc", { name: "Test" });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/projects",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token_abc",
          "content-type": "application/json",
        }),
      }),
    );
    expect(result.project.id).toBe("p1");
  });

  it("fetchProjects sends bearer token and returns list", async () => {
    const list = { projects: [{ id: "p1", name: "Test", slug: "test" }] };
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => list });

    const result = await fetchProjects("token_abc");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/projects",
      expect.objectContaining({
        headers: { Authorization: "Bearer token_abc" },
      }),
    );
    expect(result.projects).toHaveLength(1);
  });

  it("createProject throws ApiApplicationError with code on 409", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: { code: "project_slug_taken", message: "Slug taken." },
      }),
    });

    await expect(createProject("token_abc", { name: "Dup" })).rejects.toThrow(
      "Slug taken.",
    );
    try {
      await createProject("token_abc", { name: "Dup" });
    } catch (err) {
      expect((err as any).code).toBe("project_slug_taken");
    }
  });

  it("fetchViewer throws ApiAuthError on 401", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: "unauthorized", message: "Bad token." },
      }),
    });

    await expect(fetchViewer("expired")).rejects.toThrow("unauthorized");
  });

  it("fetchProjects throws ApiAuthError on 401", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: "unauthorized", message: "Bad token." },
      }),
    });

    await expect(fetchProjects("expired")).rejects.toThrow("unauthorized");
  });

  it("shareArchitectureSnapshot posts the snapshot payload and returns the shared URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        snapshot: {
          assetId: "asset_123",
          url: "https://cdn.example.com/snapshots/asset_123.png",
          mimeType: "image/png",
          createdAt: "2026-04-13T10:00:00.000Z",
          projectId: "project_123",
          canvasId: "canvas_123",
        },
      }),
    });

    const response = await shareArchitectureSnapshot("token_abc", {
      projectId: "project_123",
      canvasId: "canvas_123",
      snapshotDataUrl: "data:image/png;base64,AAAA",
      title: "South facade review",
      source: {
        studio: "architecture",
        activeBoardId: "architecture-board-render_variations",
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/exports/share-snapshot",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token_abc",
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          projectId: "project_123",
          canvasId: "canvas_123",
          snapshotDataUrl: "data:image/png;base64,AAAA",
          title: "South facade review",
          source: {
            studio: "architecture",
            activeBoardId: "architecture-board-render_variations",
          },
        }),
      }),
    );
    expect(response.snapshot.url).toContain("asset_123.png");
  });

  it("fetchArchitectureReviewPackage gets the latest package payload", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reviewPackage: {
          project: {
            id: "project_123",
            name: "Harbor Tower",
            slug: "harbor-tower",
            description: null,
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
            createdAt: "2026-04-13T10:00:00.000Z",
            updatedAt: "2026-04-13T10:00:00.000Z",
          },
          canvas: { id: "canvas_123", name: "Main Canvas" },
          selection: { selectedElementIds: [], activeBoardId: undefined },
          generatedAt: "2026-04-13T10:00:00.000Z",
          artifacts: [],
          shareSnapshots: [],
          traceabilityLedger: [],
        },
      }),
    });

    const response = await fetchArchitectureReviewPackage("token_abc", {
      projectId: "project_123",
      canvasId: "canvas_123",
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
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/exports/review-package",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer token_abc",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectId: "project_123",
          canvasId: "canvas_123",
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
        }),
      }),
    );
    expect(response.reviewPackage.canvas.id).toBe("canvas_123");
  });

  it("fetchArchitectureReviewPackage retries transient export failures once", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            code: "chat_error",
            message: "Failed to list sessions.",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          reviewPackage: {
            project: {
              id: "project_123",
              name: "Harbor Tower",
              slug: "harbor-tower",
              description: null,
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
              createdAt: "2026-04-13T10:00:00.000Z",
              updatedAt: "2026-04-13T10:00:00.000Z",
            },
            canvas: { id: "canvas_123", name: "Main Canvas" },
            selection: { selectedElementIds: [] },
            generatedAt: "2026-04-13T10:00:00.000Z",
            artifacts: [],
            shareSnapshots: [],
            traceabilityLedger: [],
          },
        }),
      });

    const response = await fetchArchitectureReviewPackage("token_abc", {
      projectId: "project_123",
      canvasId: "canvas_123",
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(response.reviewPackage.canvas.id).toBe("canvas_123");
  });

  it("fetchArchitectureReviewPackage does not retry unknown export failures", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: {
          code: "application_error",
          message: "Internal server error.",
        },
      }),
    });

    await expect(
      fetchArchitectureReviewPackage("token_abc", {
        projectId: "project_123",
        canvasId: "canvas_123",
      }),
    ).rejects.toMatchObject({
      code: "application_error",
      message: "Internal server error.",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("fetchArchitectureExportManifest gets the JSON manifest payload", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        manifest: {
          manifestVersion: "1",
          project: {
            id: "project_123",
            name: "Harbor Tower",
            slug: "harbor-tower",
            description: null,
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
            createdAt: "2026-04-13T10:00:00.000Z",
            updatedAt: "2026-04-13T10:00:00.000Z",
          },
          canvas: { id: "canvas_123", name: "Main Canvas" },
          sessions: [],
          artifacts: [],
          shareSnapshots: [],
          traceabilityLedger: [],
          generatedAt: "2026-04-13T10:00:00.000Z",
        },
      }),
    });

    const response = await fetchArchitectureExportManifest("token_abc", {
      projectId: "project_123",
      canvasId: "canvas_123",
      selection: {
        selectedElementIds: ["element_a"],
      },
      architectureContext: {
        studio: "architecture",
        boards: [],
        selectedElementIds: ["element_a"],
        objectTypesInSelection: [],
        strategyOptions: [],
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/exports/manifest",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer token_abc",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectId: "project_123",
          canvasId: "canvas_123",
          selection: {
            selectedElementIds: ["element_a"],
          },
          architectureContext: {
            studio: "architecture",
            boards: [],
            selectedElementIds: ["element_a"],
            objectTypesInSelection: [],
            strategyOptions: [],
          },
        }),
      }),
    );
    expect(response.manifest.manifestVersion).toBe("1");
  });

  it("fetchArchitectureExportManifest retries transient transport failures once", async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          manifest: {
            manifestVersion: "1",
            project: {
              id: "project_123",
              name: "Harbor Tower",
              slug: "harbor-tower",
              description: null,
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
              createdAt: "2026-04-13T10:00:00.000Z",
              updatedAt: "2026-04-13T10:00:00.000Z",
            },
            canvas: { id: "canvas_123", name: "Main Canvas" },
            sessions: [],
            artifacts: [],
            shareSnapshots: [],
            traceabilityLedger: [],
            generatedAt: "2026-04-13T10:00:00.000Z",
          },
        }),
      });

    const response = await fetchArchitectureExportManifest("token_abc", {
      projectId: "project_123",
      canvasId: "canvas_123",
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(response.manifest.manifestVersion).toBe("1");
  });

  it("fetchArchitectureExportManifest does not retry canvas_not_found", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          code: "canvas_not_found",
          message: "Canvas not found.",
        },
      }),
    });

    await expect(
      fetchArchitectureExportManifest("token_abc", {
        projectId: "project_123",
        canvasId: "canvas_123",
      }),
    ).rejects.toMatchObject({
      code: "canvas_not_found",
      message: "Canvas not found.",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
