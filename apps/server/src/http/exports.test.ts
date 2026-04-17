import { afterEach, describe, expect, it, vi } from "vitest";

async function loadRegisterExportRoutes() {
  const mod = await import("./exports.js");
  return mod.registerExportRoutes;
}

type RouteHandler = (request: any, reply: any) => Promise<unknown> | unknown;

function createReplyMock() {
  const reply = {
    body: undefined as unknown,
    statusCode: 0,
    code(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: unknown) {
      this.body = payload;
      return payload;
    },
  };

  return reply;
}

describe("registerExportRoutes", () => {
  const authenticate = vi.fn();
  const createShareSnapshot = vi.fn();
  const buildReviewPackage = vi.fn();
  const buildManifest = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a share snapshot asset for the active canvas", async () => {
    const registerExportRoutes = await loadRegisterExportRoutes();
    const routes: Record<string, RouteHandler | undefined> = {};
    const app = {
      post: vi.fn((path: string, ...rest: unknown[]) => {
        routes[path] = rest.at(-1) as RouteHandler;
      }),
    } as any;

    authenticate.mockResolvedValue({
      accessToken: "token-1",
      email: "lead@example.com",
      id: "user-1",
      userMetadata: {},
    });
    createShareSnapshot.mockResolvedValue({
      assetId: "asset_123",
      url: "https://assets.example.com/share-snapshot.png",
      mimeType: "image/png",
      createdAt: "2026-04-13T09:40:00.000Z",
      projectId: "project_123",
      canvasId: "canvas_123",
    });

    await registerExportRoutes(app, {
      auth: { authenticate },
      exportService: {
        buildManifest,
        buildReviewPackage,
        createShareSnapshot,
      } as any,
    });

    const reply = createReplyMock();
    await routes["/api/exports/share-snapshot"]?.(
      {
        body: {
          projectId: "project_123",
          canvasId: "canvas_123",
          snapshotDataUrl: "data:image/png;base64,AAAA",
          title: "South facade review",
          source: {
            studio: "architecture",
            activeBoardId: "architecture-board-render_variations",
          },
        },
        log: {
          error: vi.fn(),
          info: vi.fn(),
        },
      },
      reply,
    );

    expect(reply.statusCode).toBe(201);
    expect(reply.body).toEqual({
      snapshot: {
        assetId: "asset_123",
        url: "https://assets.example.com/share-snapshot.png",
        mimeType: "image/png",
        createdAt: "2026-04-13T09:40:00.000Z",
        projectId: "project_123",
        canvasId: "canvas_123",
      },
    });
    expect(createShareSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      expect.objectContaining({
        canvasId: "canvas_123",
        projectId: "project_123",
      }),
    );
  });

  it("exports a review package payload for architecture studio", async () => {
    const registerExportRoutes = await loadRegisterExportRoutes();
    const routes: Record<string, RouteHandler | undefined> = {};
    const app = {
      post: vi.fn((path: string, ...rest: unknown[]) => {
        routes[path] = rest.at(-1) as RouteHandler;
      }),
    } as any;

    authenticate.mockResolvedValue({
      accessToken: "token-1",
      email: "lead@example.com",
      id: "user-1",
      userMetadata: {},
    });
    buildReviewPackage.mockResolvedValue({
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
      latestPlan: undefined,
      artifacts: [],
      shareSnapshots: [],
      traceabilityLedger: [],
      generatedAt: "2026-04-13T09:40:00.000Z",
    });

    await registerExportRoutes(app, {
      auth: { authenticate },
      exportService: {
        buildManifest,
        buildReviewPackage,
        createShareSnapshot,
      } as any,
    });

    const log = {
      error: vi.fn(),
      info: vi.fn(),
    };
    const reply = createReplyMock();
    await routes["/api/exports/review-package"]?.(
      {
        body: {
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
        },
        log,
      },
      reply,
    );

    expect(log.error).not.toHaveBeenCalled();
    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({
      reviewPackage: expect.objectContaining({
        project: expect.objectContaining({ id: "project_123" }),
        canvas: { id: "canvas_123", name: "Main Canvas" },
      }),
    });
    expect(buildReviewPackage).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      expect.objectContaining({
        canvasId: "canvas_123",
        projectId: "project_123",
      }),
    );
  });

  it("exports a manifest payload with traceability metadata", async () => {
    const registerExportRoutes = await loadRegisterExportRoutes();
    const routes: Record<string, RouteHandler | undefined> = {};
    const app = {
      post: vi.fn((path: string, ...rest: unknown[]) => {
        routes[path] = rest.at(-1) as RouteHandler;
      }),
    } as any;

    authenticate.mockResolvedValue({
      accessToken: "token-1",
      email: "lead@example.com",
      id: "user-1",
      userMetadata: {},
    });
    buildManifest.mockResolvedValue({
      manifestVersion: "1",
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
      sessions: [
        {
          sessionId: "session_123",
          title: "Facade review",
          messageCount: 4,
          latestRunId: "run_123",
        },
      ],
      artifacts: [],
      shareSnapshots: [],
      traceabilityLedger: [],
      generatedAt: "2026-04-13T09:40:00.000Z",
    });

    await registerExportRoutes(app, {
      auth: { authenticate },
      exportService: {
        buildManifest,
        buildReviewPackage,
        createShareSnapshot,
      } as any,
    });

    const log = {
      error: vi.fn(),
      info: vi.fn(),
    };
    const reply = createReplyMock();
    await routes["/api/exports/manifest"]?.(
      {
        body: {
          projectId: "project_123",
          canvasId: "canvas_123",
          selection: {
            selectedElementIds: ["element_a"],
          },
        },
        log,
      },
      reply,
    );

    expect(log.error).not.toHaveBeenCalled();
    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({
      manifest: expect.objectContaining({
        manifestVersion: "1",
        sessions: [
          expect.objectContaining({
            sessionId: "session_123",
          }),
        ],
      }),
    });
    expect(buildManifest).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      expect.objectContaining({
        canvasId: "canvas_123",
        projectId: "project_123",
      }),
    );
  });

  it("rejects unauthenticated export calls", async () => {
    const registerExportRoutes = await loadRegisterExportRoutes();
    const routes: Record<string, RouteHandler | undefined> = {};
    const app = {
      post: vi.fn((path: string, ...rest: unknown[]) => {
        routes[path] = rest.at(-1) as RouteHandler;
      }),
    } as any;

    authenticate.mockResolvedValue(null);

    await registerExportRoutes(app, {
      auth: { authenticate },
      exportService: {
        buildManifest,
        buildReviewPackage,
        createShareSnapshot,
      } as any,
    });

    const reply = createReplyMock();
    await routes["/api/exports/manifest"]?.(
      {
        body: {
          projectId: "project_123",
          canvasId: "canvas_123",
        },
        log: {
          error: vi.fn(),
          info: vi.fn(),
        },
      },
      reply,
    );

    expect(reply.statusCode).toBe(401);
    expect(reply.body).toEqual({
      error: {
        code: "unauthorized",
        message: "Missing or invalid bearer token.",
      },
    });
  });
});
