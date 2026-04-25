import { afterEach, describe, expect, it, vi } from "vitest";

async function loadRegisterAddGalleryRoutes() {
  const mod = await import("./add-gallery.js");
  return mod.registerAddGalleryRoutes;
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

describe("registerAddGalleryRoutes", () => {
  const authenticate = vi.fn();
  const listLibrary = vi.fn();
  const listSubtypeItems = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the persisted add-gallery structure for authenticated users", async () => {
    const registerAddGalleryRoutes = await loadRegisterAddGalleryRoutes();
    const routes: Record<string, RouteHandler | undefined> = {};
    const app = {
      get: vi.fn((path: string, ...rest: unknown[]) => {
        routes[path] = rest.at(-1) as RouteHandler;
      }),
    } as any;

    authenticate.mockResolvedValue({
      accessToken: "token-1",
      email: "lead@example.com",
      id: "user-1",
      userMetadata: {},
    });
    listLibrary.mockResolvedValue([
      {
        id: "architecture-render",
        label: "建筑效果图",
        subtypes: [
          {
            assetCount: 24,
            id: "default",
            label: "默认",
            items: [],
          },
        ],
      },
    ]);

    await registerAddGalleryRoutes(app, {
      addGalleryService: {
        listLibrary,
        listSubtypeItems,
      } as any,
      auth: { authenticate },
    });

    const reply = createReplyMock();
    await routes["/api/add-gallery"]?.(
      {
        log: {
          error: vi.fn(),
          info: vi.fn(),
        },
      },
      reply,
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({
      categories: [
        {
          id: "architecture-render",
          label: "建筑效果图",
          subtypes: [
            {
              assetCount: 24,
              id: "default",
              label: "默认",
              items: [],
            },
          ],
        },
      ],
    });
    expect(listLibrary).toHaveBeenCalledTimes(1);
  });

  it("returns paginated add-gallery items for the requested subtype", async () => {
    const registerAddGalleryRoutes = await loadRegisterAddGalleryRoutes();
    const routes: Record<string, RouteHandler | undefined> = {};
    const app = {
      get: vi.fn((path: string, ...rest: unknown[]) => {
        routes[path] = rest.at(-1) as RouteHandler;
      }),
    } as any;

    authenticate.mockResolvedValue({
      accessToken: "token-1",
      email: "lead@example.com",
      id: "user-1",
      userMetadata: {},
    });
    listSubtypeItems.mockResolvedValue({
      subtypeId: "default",
      items: [
        {
          id: "asset-1",
          label: "建筑效果图 默认 1",
          url: "http://127.0.0.1:54321/storage/v1/object/public/add-gallery-assets/architecture-render/default/asset-1.png",
          width: 1600,
          height: 900,
        },
      ],
      nextOffset: 60,
      totalCount: 240,
    });

    await registerAddGalleryRoutes(app, {
      addGalleryService: {
        listLibrary,
        listSubtypeItems,
      } as any,
      auth: { authenticate },
    });

    const reply = createReplyMock();
    await routes["/api/add-gallery/subtypes/:subtypeId/items"]?.(
      {
        log: {
          error: vi.fn(),
          info: vi.fn(),
        },
        params: {
          subtypeId: "default",
        },
        query: {
          limit: "60",
          offset: "0",
        },
      },
      reply,
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({
      subtypeId: "default",
      items: [
        {
          id: "asset-1",
          label: "建筑效果图 默认 1",
          url: "http://127.0.0.1:54321/storage/v1/object/public/add-gallery-assets/architecture-render/default/asset-1.png",
          width: 1600,
          height: 900,
        },
      ],
      nextOffset: 60,
      totalCount: 240,
    });
    expect(listSubtypeItems).toHaveBeenCalledWith({
      limit: 60,
      offset: 0,
      subtypeId: "default",
    });
  });

  it("rejects unauthenticated add-gallery requests", async () => {
    const registerAddGalleryRoutes = await loadRegisterAddGalleryRoutes();
    const routes: Record<string, RouteHandler | undefined> = {};
    const app = {
      get: vi.fn((path: string, ...rest: unknown[]) => {
        routes[path] = rest.at(-1) as RouteHandler;
      }),
    } as any;

    authenticate.mockResolvedValue(null);

    await registerAddGalleryRoutes(app, {
      addGalleryService: {
        listLibrary,
        listSubtypeItems,
      } as any,
      auth: { authenticate },
    });

    const reply = createReplyMock();
    await routes["/api/add-gallery"]?.(
      {
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
    expect(listLibrary).not.toHaveBeenCalled();
  });
});
