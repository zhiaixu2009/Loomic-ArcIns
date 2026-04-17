import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { registerUploadRoutes } from "./uploads.js";

function createWorkspaceQueryMock(data: { id: string } | null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };

  return query;
}

function createProjectQueryMock(data: { workspace_id: string } | null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };

  return query;
}

function buildMultipartPayload(options: {
  fileFirst?: boolean;
  includeProjectId?: boolean;
}) {
  const boundary = "----loomic-upload-boundary";
  const pngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0xc9, 0xfe, 0x92,
    0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  const filePartHeader = Buffer.from(
    `--${boundary}\r\n` +
      'Content-Disposition: form-data; name="file"; filename="share-snapshot.png"\r\n' +
      "Content-Type: image/png\r\n\r\n",
  );
  const projectPart = Buffer.from(
    `--${boundary}\r\n` +
      'Content-Disposition: form-data; name="projectId"\r\n\r\n' +
      "project_123\r\n",
  );
  const closing = Buffer.from(`--${boundary}--\r\n`);

  const parts: Buffer[] = [];

  if (options.includeProjectId && !options.fileFirst) {
    parts.push(projectPart);
  }

  parts.push(filePartHeader, pngBytes, Buffer.from("\r\n"));

  if (options.includeProjectId && options.fileFirst) {
    parts.push(projectPart);
  }

  parts.push(closing);

  return {
    boundary,
    payload: Buffer.concat(parts),
  };
}

describe("registerUploadRoutes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it(
    "accepts file-only uploads without crashing",
    { timeout: 15_000 },
    async () => {
      const auth = {
        authenticate: vi.fn().mockResolvedValue({
          id: "user_123",
          accessToken: "token_123",
        }),
      };
      const workspaceQuery = createWorkspaceQueryMock({
        id: "workspace_123",
      });
      const createUserClient = vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === "workspaces") {
            return workspaceQuery;
          }
          throw new Error(`Unexpected table ${table}`);
        }),
      }));
      const viewerService = {
        ensureViewer: vi.fn().mockResolvedValue({
          workspace: { id: "workspace_123" },
        }),
      };
      const uploadService = {
        uploadFile: vi.fn().mockResolvedValue({
          asset: {
            id: "asset_123",
            bucket: "project-assets",
            objectPath: "workspace_123/share-snapshot.png",
            mimeType: "image/png",
            byteSize: 68,
            workspaceId: "workspace_123",
            projectId: null,
            createdAt: "2026-04-13T00:00:00.000Z",
          },
          url: "http://127.0.0.1:54321/storage/v1/object/public/project-assets/workspace_123/share-snapshot.png",
        }),
        getAssetUrl: vi.fn(),
        deleteAsset: vi.fn(),
      };

      const app = Fastify();
      await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
      await registerUploadRoutes(app, {
        auth: auth as any,
        createUserClient: createUserClient as any,
        uploadService: uploadService as any,
        viewerService: viewerService as any,
      });
      await app.ready();

      const { boundary, payload } = buildMultipartPayload({
        fileFirst: true,
        includeProjectId: false,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/uploads",
        headers: {
          authorization: "Bearer token_123",
          "content-type": `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      expect(response.statusCode).toBe(201);
      expect(uploadService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({ id: "user_123" }),
        expect.objectContaining({
          bucket: "project-assets",
          workspaceId: "workspace_123",
        }),
      );
      expect(createUserClient).toHaveBeenCalledWith("token_123");
      expect(viewerService.ensureViewer).not.toHaveBeenCalled();

      await app.close();
    },
  );

  it("accepts file-first uploads when projectId arrives after the file part", async () => {
    const auth = {
      authenticate: vi.fn().mockResolvedValue({
        id: "user_123",
        accessToken: "token_123",
      }),
    };
    const projectQuery = createProjectQueryMock({
      workspace_id: "workspace_project_123",
    });
    const createUserClient = vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === "projects") {
          return projectQuery;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    }));
    const viewerService = {
      ensureViewer: vi.fn().mockResolvedValue({
        workspace: { id: "workspace_123" },
      }),
    };
    const uploadService = {
      uploadFile: vi.fn().mockResolvedValue({
        asset: {
          id: "asset_123",
          bucket: "project-assets",
          objectPath: "workspace_123/project_123/share-snapshot.png",
          mimeType: "image/png",
          byteSize: 68,
          workspaceId: "workspace_123",
          projectId: "project_123",
          createdAt: "2026-04-13T00:00:00.000Z",
        },
        url: "http://127.0.0.1:54321/storage/v1/object/public/project-assets/workspace_123/project_123/share-snapshot.png",
      }),
      getAssetUrl: vi.fn(),
      deleteAsset: vi.fn(),
    };

    const app = Fastify();
    await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
    await registerUploadRoutes(app, {
      auth: auth as any,
      createUserClient: createUserClient as any,
      uploadService: uploadService as any,
      viewerService: viewerService as any,
    });
    await app.ready();

    const { boundary, payload } = buildMultipartPayload({
      fileFirst: true,
      includeProjectId: true,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/uploads",
      headers: {
        authorization: "Bearer token_123",
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(201);
    expect(uploadService.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user_123" }),
      expect.objectContaining({
        bucket: "project-assets",
        projectId: "project_123",
        workspaceId: "workspace_project_123",
      }),
    );
    expect(createUserClient).toHaveBeenCalledWith("token_123");
    expect(viewerService.ensureViewer).not.toHaveBeenCalled();

    await app.close();
  });
});
