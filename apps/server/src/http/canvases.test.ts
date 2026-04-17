import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "@loomic/shared",
  () => ({
    applicationErrorResponseSchema: { parse: (value: unknown) => value },
    canvasGetResponseSchema: { parse: (value: unknown) => value },
    canvasSaveRequestSchema: { parse: (value: any) => value },
    canvasSaveResponseSchema: { parse: (value: unknown) => value },
    unauthenticatedErrorResponseSchema: { parse: (value: unknown) => value },
  }),
);

async function loadRegisterCanvasRoutes() {
  const mod = await import("./canvases.js");
  return mod.registerCanvasRoutes;
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

describe("registerCanvasRoutes", () => {
  const saveCanvasContent = vi.fn();
  const pushToCanvas = vi.fn();
  const getCanvasCollaboratorByUserOrFallback = vi.fn();
  const ensureViewer = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("broadcasts a collaboration mutation after a successful save", async () => {
    const registerCanvasRoutes = await loadRegisterCanvasRoutes();
    const routes: { put?: RouteHandler } = {};
    const app = {
      get: vi.fn(),
      put: vi.fn(
        (
          _path: string,
          _options: Record<string, unknown>,
          handler: RouteHandler,
        ) => {
          routes.put = handler;
        },
      ),
    } as any;

    saveCanvasContent.mockResolvedValue(undefined);
    getCanvasCollaboratorByUserOrFallback.mockReturnValue({
      avatarUrl: null,
      color: "#CA8A04",
      connectionId: "user:user-1",
      displayName: "Studio Lead",
      userId: "user-1",
    });
    ensureViewer.mockResolvedValue({
      membership: {
        role: "owner",
        userId: "user-1",
        workspaceId: "workspace-1",
      },
      profile: {
        avatarUrl: null,
        displayName: "Studio Lead",
        email: "lead@example.com",
        id: "user-1",
      },
      workspace: {
        id: "workspace-1",
        name: "Studio",
        ownerUserId: "user-1",
        type: "personal",
      },
    });

    await registerCanvasRoutes(app, {
      auth: {
        authenticate: vi.fn().mockResolvedValue({
          accessToken: "token-1",
          email: "lead@example.com",
          id: "user-1",
          userMetadata: {},
        }),
      },
      canvasService: {
        getCanvas: vi.fn(),
        saveCanvasContent,
      } as any,
      connectionManager: {
        getCanvasCollaboratorByUserOrFallback,
        pushToCanvas,
      } as any,
      viewerService: {
        ensureViewer,
      } as any,
    });

    const reply = createReplyMock();
    await routes.put?.(
      {
        body: {
          content: {
            appState: {},
            elements: [{ id: "element-1" }, { id: "element-2" }],
            files: {},
          },
        },
        log: {
          error: vi.fn(),
          info: vi.fn(),
        },
        params: { canvasId: "canvas-1" },
      },
      reply,
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({ ok: true });
    expect(saveCanvasContent).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      "canvas-1",
      expect.objectContaining({
        elements: [{ id: "element-1" }, { id: "element-2" }],
      }),
    );
    expect(getCanvasCollaboratorByUserOrFallback).toHaveBeenCalledWith(
      "canvas-1",
      "user-1",
      expect.objectContaining({ displayName: "Studio Lead" }),
    );
    expect(pushToCanvas).toHaveBeenCalledWith(
      "canvas-1",
      expect.objectContaining({
        canvasId: "canvas-1",
        collaborator: expect.objectContaining({
          displayName: "Studio Lead",
          userId: "user-1",
        }),
        elementCount: 2,
        source: "human-save",
        type: "collab.canvas_mutation",
      }),
    );
  });

  it("falls back to auth metadata display name when viewer lookup fails", async () => {
    const registerCanvasRoutes = await loadRegisterCanvasRoutes();
    const routes: { put?: RouteHandler } = {};
    const app = {
      get: vi.fn(),
      put: vi.fn(
        (
          _path: string,
          _options: Record<string, unknown>,
          handler: RouteHandler,
        ) => {
          routes.put = handler;
        },
      ),
    } as any;

    saveCanvasContent.mockResolvedValue(undefined);
    getCanvasCollaboratorByUserOrFallback.mockImplementation(
      (_canvasId: string, userId: string, profile: { displayName: string }) => ({
        avatarUrl: null,
        color: "#2563EB",
        connectionId: `user:${userId}`,
        displayName: profile.displayName,
        userId,
      }),
    );
    ensureViewer.mockRejectedValue(new Error("viewer unavailable"));

    await registerCanvasRoutes(app as any, {
      auth: {
        authenticate: vi.fn().mockResolvedValue({
          accessToken: "token-1",
          email: "lead@example.com",
          id: "user-1",
          userMetadata: { display_name: "Metadata Name" },
        }),
      },
      canvasService: {
        getCanvas: vi.fn(),
        saveCanvasContent,
      } as any,
      connectionManager: {
        getCanvasCollaboratorByUserOrFallback,
        pushToCanvas,
      } as any,
      viewerService: {
        ensureViewer,
      } as any,
    });

    const reply = createReplyMock();
    await routes.put?.(
      {
        body: {
          content: {
            appState: {},
            elements: [{ id: "element-1" }],
            files: {},
          },
        },
        log: {
          error: vi.fn(),
          info: vi.fn(),
        },
        params: { canvasId: "canvas-1" },
      },
      reply,
    );

    expect(reply.statusCode).toBe(200);
    expect(pushToCanvas).toHaveBeenCalledWith(
      "canvas-1",
      expect.objectContaining({
        collaborator: expect.objectContaining({
          displayName: "Metadata Name",
        }),
      }),
    );
  });
});
