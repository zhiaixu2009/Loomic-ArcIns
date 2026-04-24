import { afterEach, describe, expect, it, vi } from "vitest";

async function loadRegisterOfficialGalleryRoutes() {
  const mod = await import("./official-gallery.js");
  return mod.registerOfficialGalleryRoutes;
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

describe("registerOfficialGalleryRoutes", () => {
  const authenticate = vi.fn();
  const listLibrary = vi.fn();
  const listSubtypeItems = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the persisted official gallery structure for authenticated users", async () => {
    const registerOfficialGalleryRoutes = await loadRegisterOfficialGalleryRoutes();
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
        id: "plants",
        label: "植物配景",
        subtypes: [
          {
            assetCount: 24,
            id: "trees",
            label: "绿树",
            items: [],
          },
        ],
      },
    ]);

    await registerOfficialGalleryRoutes(app, {
      auth: { authenticate },
      officialGalleryService: {
        listLibrary,
        listSubtypeItems,
      } as any,
    });

    const reply = createReplyMock();
    await routes["/api/official-gallery"]?.(
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
          id: "plants",
          label: "植物配景",
          subtypes: [
            {
              assetCount: 24,
              id: "trees",
              label: "绿树",
              items: [],
            },
          ],
        },
      ],
    });
    expect(listLibrary).toHaveBeenCalledTimes(1);
  });

  it("returns paginated persisted official gallery items for the requested subtype", async () => {
    const registerOfficialGalleryRoutes = await loadRegisterOfficialGalleryRoutes();
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
      subtypeId: "trees",
      items: [
        {
          id: "asset-1",
          label: "前景树 1",
          url: "http://127.0.0.1:54321/storage/v1/object/public/official-gallery-assets/plants/trees/asset-1.png",
          width: 1440,
          height: 960,
        },
      ],
      nextOffset: 60,
      totalCount: 240,
    });

    await registerOfficialGalleryRoutes(app, {
      auth: { authenticate },
      officialGalleryService: {
        listLibrary,
        listSubtypeItems,
      } as any,
    });

    const reply = createReplyMock();
    await routes["/api/official-gallery/subtypes/:subtypeId/items"]?.(
      {
        log: {
          error: vi.fn(),
          info: vi.fn(),
        },
        params: {
          subtypeId: "trees",
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
      subtypeId: "trees",
      items: [
        {
          id: "asset-1",
          label: "前景树 1",
          url: "http://127.0.0.1:54321/storage/v1/object/public/official-gallery-assets/plants/trees/asset-1.png",
          width: 1440,
          height: 960,
        },
      ],
      nextOffset: 60,
      totalCount: 240,
    });
    expect(listSubtypeItems).toHaveBeenCalledWith({
      limit: 60,
      offset: 0,
      subtypeId: "trees",
    });
  });

  it("rejects unauthenticated official gallery requests", async () => {
    const registerOfficialGalleryRoutes = await loadRegisterOfficialGalleryRoutes();
    const routes: Record<string, RouteHandler | undefined> = {};
    const app = {
      get: vi.fn((path: string, ...rest: unknown[]) => {
        routes[path] = rest.at(-1) as RouteHandler;
      }),
    } as any;

    authenticate.mockResolvedValue(null);

    await registerOfficialGalleryRoutes(app, {
      auth: { authenticate },
      officialGalleryService: {
        listLibrary,
        listSubtypeItems,
      } as any,
    });

    const reply = createReplyMock();
    await routes["/api/official-gallery"]?.(
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
