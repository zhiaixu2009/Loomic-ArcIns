import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUploadService } from "./upload-service.js";

describe("createUploadService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads project-scoped public assets with the caller-provided workspace and returns a public url", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_776_068_721_412);

    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://public.example.com/share-snapshot.png" },
    });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://signed.example.com/share-snapshot.png" },
      error: null,
    });
    const insertSingle = vi.fn().mockResolvedValue({
      data: {
        id: "asset_123",
        bucket: "project-assets",
        object_path:
          "workspace-shared/project_123/1776068721412-share-snapshot.png",
        mime_type: "image/png",
        byte_size: 68,
        workspace_id: "workspace-shared",
        project_id: "project_123",
        created_at: "2026-04-13T08:25:21.596Z",
      },
      error: null,
    });
    const client = {
      storage: {
        from: vi.fn(() => ({
          upload,
          remove,
          getPublicUrl,
          createSignedUrl,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === "asset_objects") {
          return {
            insert: vi.fn((payload: unknown) => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => {
                  expect(payload).toMatchObject({
                    workspace_id: "workspace-shared",
                    project_id: "project_123",
                    object_path:
                      "workspace-shared/project_123/1776068721412-share-snapshot.png",
                  });
                  return insertSingle();
                }),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const service = createUploadService({
      createUserClient: vi.fn(() => client as never),
    });

    const result = await service.uploadFile(
      {
        accessToken: "token_123",
        email: "starter@test.loomic.com",
        id: "user_123",
        userMetadata: {},
      },
      {
        bucket: "project-assets",
        fileName: "share-snapshot.png",
        fileBuffer: Buffer.from("png"),
        mimeType: "image/png",
        projectId: "project_123",
        workspaceId: "workspace-shared",
      },
    );

    expect(client.from).not.toHaveBeenCalledWith("projects");
    expect(upload).toHaveBeenCalledWith(
      "workspace-shared/project_123/1776068721412-share-snapshot.png",
      expect.any(Buffer),
      expect.objectContaining({
        contentType: "image/png",
        upsert: false,
      }),
    );
    expect(getPublicUrl).toHaveBeenCalledWith(
      "workspace-shared/project_123/1776068721412-share-snapshot.png",
    );
    expect(createSignedUrl).not.toHaveBeenCalled();
    expect(result.url).toBe("https://public.example.com/share-snapshot.png");
  });

  it("trusts the caller-provided workspace for project uploads without re-querying projects", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_776_073_711_798);

    const upload = vi.fn().mockResolvedValue({ error: null });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: {
        signedUrl:
          "https://signed.example.com/browser-direct-upload.png",
      },
      error: null,
    });

    const client = {
      storage: {
        from: vi.fn(() => ({
          upload,
          remove: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({
            data: {
              publicUrl:
                "https://public.example.com/browser-direct-upload.png",
            },
          }),
          createSignedUrl,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === "projects") {
          throw new Error("projects lookup should not happen");
        }

        if (table === "asset_objects") {
          return {
            insert: vi.fn((payload: unknown) => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "asset_browser_123",
                    bucket: "project-assets",
                    object_path:
                      "workspace-shared/project_123/1776073711798-browser-direct-upload.png",
                    mime_type: "image/png",
                    byte_size: 68,
                    workspace_id: "workspace-shared",
                    project_id: "project_123",
                    created_at: "2026-04-13T09:48:31.882696Z",
                  },
                  error: null,
                }),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const service = createUploadService({
      createUserClient: vi.fn(() => client as never),
    });

    const result = await service.uploadFile(
      {
        accessToken: "token_browser",
        email: "starter@test.loomic.com",
        id: "user_browser",
        userMetadata: {},
      },
      {
        bucket: "project-assets",
        fileName: "browser-direct-upload.png",
        fileBuffer: Buffer.from("png"),
        mimeType: "image/png",
        projectId: "project_123",
        workspaceId: "workspace-shared",
      },
    );

    expect(client.from).not.toHaveBeenCalledWith("projects");
    expect(upload).toHaveBeenCalledWith(
      "workspace-shared/project_123/1776073711798-browser-direct-upload.png",
      expect.any(Buffer),
      expect.objectContaining({
        contentType: "image/png",
        upsert: false,
      }),
    );
    expect(result.asset.workspaceId).toBe("workspace-shared");
    expect(result.url).toBe(
      "https://public.example.com/browser-direct-upload.png",
    );
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("keeps the caller workspace when the upload is not project scoped", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_776_068_721_500);

    const upload = vi.fn().mockResolvedValue({ error: null });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://signed.example.com/file.png" },
      error: null,
    });

    const client = {
      storage: {
        from: vi.fn(() => ({
          upload,
          remove: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({
            data: { publicUrl: "https://public.example.com/file.png" },
          }),
          createSignedUrl,
        })),
      },
      from: vi.fn((table: string) => {
        if (table === "asset_objects") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "asset_456",
                    bucket: "project-assets",
                    object_path: "workspace-personal/1776068721500-loose-file.png",
                    mime_type: "image/png",
                    byte_size: 68,
                    workspace_id: "workspace-personal",
                    project_id: null,
                    created_at: "2026-04-13T08:25:21.596Z",
                  },
                  error: null,
                }),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const service = createUploadService({
      createUserClient: vi.fn(() => client as never),
    });

    await service.uploadFile(
      {
        accessToken: "token_123",
        email: "starter@test.loomic.com",
        id: "user_123",
        userMetadata: {},
      },
      {
        bucket: "project-assets",
        fileName: "loose-file.png",
        fileBuffer: Buffer.from("png"),
        mimeType: "image/png",
        workspaceId: "workspace-personal",
      },
    );

    expect(client.from).not.toHaveBeenCalledWith("projects");
    expect(upload).toHaveBeenCalledWith(
      "workspace-personal/1776068721500-loose-file.png",
      expect.any(Buffer),
      expect.objectContaining({
        contentType: "image/png",
        upsert: false,
      }),
    );
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("uses the admin client for storage writes once the caller workspace is authorized", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_776_188_000_000);

    const userClient = {
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(() => {
            throw new Error("user client storage should not be used");
          }),
        })),
      },
      from: vi.fn(() => {
        throw new Error("user client data writes should not be used");
      }),
    };

    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://public.example.com/admin-upload.png" },
    });
    const adminClient = {
      storage: {
        from: vi.fn(() => ({
          upload,
          remove,
          getPublicUrl,
          createSignedUrl: vi.fn(),
        })),
      },
      from: vi.fn((table: string) => {
        if (table === "asset_objects") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "asset_admin_123",
                    bucket: "project-assets",
                    object_path:
                      "workspace-shared/project_123/1776188000000-admin-upload.png",
                    mime_type: "image/png",
                    byte_size: 68,
                    workspace_id: "workspace-shared",
                    project_id: "project_123",
                    created_at: "2026-04-15T01:46:40.000Z",
                  },
                  error: null,
                }),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const service = createUploadService({
      createUserClient: vi.fn(() => userClient as never),
      getAdminClient: vi.fn(() => adminClient as never),
    });

    const result = await service.uploadFile(
      {
        accessToken: "token_admin",
        email: "pro@test.loomic.com",
        id: "user_admin",
        userMetadata: {},
      },
      {
        bucket: "project-assets",
        fileName: "admin-upload.png",
        fileBuffer: Buffer.from("png"),
        mimeType: "image/png",
        projectId: "project_123",
        workspaceId: "workspace-shared",
      },
    );

    expect(upload).toHaveBeenCalledWith(
      "workspace-shared/project_123/1776188000000-admin-upload.png",
      expect.any(Buffer),
      expect.objectContaining({
        contentType: "image/png",
        upsert: false,
      }),
    );
    expect(getPublicUrl).toHaveBeenCalledWith(
      "workspace-shared/project_123/1776188000000-admin-upload.png",
    );
    expect(result.url).toBe("https://public.example.com/admin-upload.png");
  });

  it("retries transient storage upload failures before returning success", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_776_188_100_000);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const userClient = {
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(() => {
            throw new Error("user client storage should not be used");
          }),
        })),
      },
      from: vi.fn(() => {
        throw new Error("user client data writes should not be used");
      }),
    };

    const upload = vi
      .fn()
      .mockResolvedValueOnce({
        error: { message: "fetch failed" },
      })
      .mockResolvedValueOnce({ error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://public.example.com/retried-upload.png" },
    });
    const adminClient = {
      storage: {
        from: vi.fn(() => ({
          upload,
          remove: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl,
          createSignedUrl: vi.fn(),
        })),
      },
      from: vi.fn((table: string) => {
        if (table === "asset_objects") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "asset_retry_storage_123",
                    bucket: "project-assets",
                    object_path:
                      "workspace-shared/project_123/1776188100000-retried-upload.png",
                    mime_type: "image/png",
                    byte_size: 68,
                    workspace_id: "workspace-shared",
                    project_id: "project_123",
                    created_at: "2026-04-15T01:48:20.000Z",
                  },
                  error: null,
                }),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const service = createUploadService({
      createUserClient: vi.fn(() => userClient as never),
      getAdminClient: vi.fn(() => adminClient as never),
    });

    const result = await service.uploadFile(
      {
        accessToken: "token_retry_storage",
        email: "pro@test.loomic.com",
        id: "user_admin",
        userMetadata: {},
      },
      {
        bucket: "project-assets",
        fileName: "retried-upload.png",
        fileBuffer: Buffer.from("png"),
        mimeType: "image/png",
        projectId: "project_123",
        workspaceId: "workspace-shared",
      },
    );

    expect(upload).toHaveBeenCalledTimes(2);
    expect(result.asset.id).toBe("asset_retry_storage_123");
    expect(result.url).toBe("https://public.example.com/retried-upload.png");
  });

  it("retries transient asset metadata insert failures without re-uploading the file", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_776_188_200_000);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const upload = vi.fn().mockResolvedValue({ error: null });
    const insertSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { message: "fetch failed" },
      })
      .mockResolvedValueOnce({
        data: {
          id: "asset_retry_insert_123",
          bucket: "project-assets",
          object_path:
            "workspace-shared/project_123/1776188200000-retried-insert.png",
          mime_type: "image/png",
          byte_size: 68,
          workspace_id: "workspace-shared",
          project_id: "project_123",
          created_at: "2026-04-15T01:50:00.000Z",
        },
        error: null,
      });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://public.example.com/retried-insert.png" },
    });
    const adminClient = {
      storage: {
        from: vi.fn(() => ({
          upload,
          remove,
          getPublicUrl,
          createSignedUrl: vi.fn(),
        })),
      },
      from: vi.fn((table: string) => {
        if (table === "asset_objects") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: insertSingle,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const service = createUploadService({
      createUserClient: vi.fn(() => ({} as never)),
      getAdminClient: vi.fn(() => adminClient as never),
    });

    const result = await service.uploadFile(
      {
        accessToken: "token_retry_insert",
        email: "pro@test.loomic.com",
        id: "user_admin",
        userMetadata: {},
      },
      {
        bucket: "project-assets",
        fileName: "retried-insert.png",
        fileBuffer: Buffer.from("png"),
        mimeType: "image/png",
        projectId: "project_123",
        workspaceId: "workspace-shared",
      },
    );

    expect(upload).toHaveBeenCalledTimes(1);
    expect(insertSingle).toHaveBeenCalledTimes(2);
    expect(remove).not.toHaveBeenCalled();
    expect(result.asset.id).toBe("asset_retry_insert_123");
  });
});
