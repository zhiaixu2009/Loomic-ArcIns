import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProjectService } from "./project-service.js";

describe("createProjectService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the privileged storage client for thumbnail uploads while keeping the user-scoped project lookup", async () => {
    const projectLookupQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    };
    projectLookupQuery.select.mockReturnValue(projectLookupQuery);
    projectLookupQuery.eq.mockReturnValue(projectLookupQuery);
    projectLookupQuery.single.mockResolvedValue({
      data: { workspace_id: "workspace_123" },
      error: null,
    });

    const projectUpdateQuery = {
      eq: vi.fn(),
    };
    projectUpdateQuery.eq.mockResolvedValue({ error: null });

    const projectUpdateBuilder = {
      update: vi.fn(() => projectUpdateQuery),
    };

    const userStorageFrom = vi.fn();
    const userClient = {
      from: vi.fn((table: string) => {
        if (table === "projects") {
          return projectLookupQuery;
        }

        throw new Error(`Unexpected user table: ${table}`);
      }),
      storage: {
        from: userStorageFrom,
      },
    };

    const upload = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: {
        publicUrl:
          "http://host.docker.internal:54321/storage/v1/object/public/project-assets/workspace_123/project_123/thumbnail.webp",
      },
    });
    const adminStorageFrom = vi.fn(() => ({
      upload,
      getPublicUrl,
    }));

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === "projects") {
          return projectUpdateBuilder;
        }

        throw new Error(`Unexpected admin table: ${table}`);
      }),
      storage: {
        from: adminStorageFrom,
      },
    };
    const getAdminClient = vi.fn(() => adminClient as never);

    const service = createProjectService({
      createUserClient: vi.fn(() => userClient as never),
      getAdminClient,
      viewerService: {} as never,
    });

    const result = await service.saveThumbnail(
      {
        accessToken: "token_123",
        email: "free@test.loomic.com",
        id: "user_123",
        userMetadata: {},
      },
      "project_123",
      Buffer.from("thumbnail"),
      "image/webp",
    );

    expect(userClient.from).toHaveBeenCalledWith("projects");
    expect(userStorageFrom).not.toHaveBeenCalled();
    expect(getAdminClient).toHaveBeenCalledTimes(1);
    expect(adminStorageFrom).toHaveBeenCalledWith("project-assets");
    expect(upload).toHaveBeenCalledWith(
      "workspace_123/project_123/thumbnail.webp",
      expect.any(Buffer),
      expect.objectContaining({
        contentType: "image/webp",
        upsert: true,
      }),
    );
    expect(adminClient.from).toHaveBeenCalledWith("projects");
    expect(projectUpdateBuilder.update).toHaveBeenCalledWith({
      thumbnail_path: "workspace_123/project_123/thumbnail.webp",
    });
    expect(projectUpdateQuery.eq).toHaveBeenCalledWith("id", "project_123");
    expect(result.thumbnailUrl).toBe(
      "http://host.docker.internal:54321/storage/v1/object/public/project-assets/workspace_123/project_123/thumbnail.webp",
    );
  });

  it("retries thumbnail uploads when Supabase storage returns a transient upstream error", async () => {
    const projectLookupQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    };
    projectLookupQuery.select.mockReturnValue(projectLookupQuery);
    projectLookupQuery.eq.mockReturnValue(projectLookupQuery);
    projectLookupQuery.single.mockResolvedValue({
      data: { workspace_id: "workspace_123" },
      error: null,
    });

    const projectUpdateQuery = {
      eq: vi.fn(),
    };
    projectUpdateQuery.eq.mockResolvedValue({ error: null });

    const projectUpdateBuilder = {
      update: vi.fn(() => projectUpdateQuery),
    };

    const upload = vi
      .fn()
      .mockResolvedValueOnce({
        error: {
          message: "An invalid response was received from the upstream server",
        },
      })
      .mockResolvedValueOnce({ error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: {
        publicUrl:
          "http://host.docker.internal:54321/storage/v1/object/public/project-assets/workspace_123/project_123/thumbnail.webp",
      },
    });

    const userClient = {
      from: vi.fn((table: string) => {
        if (table === "projects") {
          return projectLookupQuery;
        }

        throw new Error(`Unexpected user table: ${table}`);
      }),
      storage: {
        from: vi.fn(),
      },
    };

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === "projects") {
          return projectUpdateBuilder;
        }

        throw new Error(`Unexpected admin table: ${table}`);
      }),
      storage: {
        from: vi.fn(() => ({
          upload,
          getPublicUrl,
        })),
      },
    };

    const service = createProjectService({
      createUserClient: vi.fn(() => userClient as never),
      getAdminClient: vi.fn(() => adminClient as never),
      viewerService: {} as never,
    });

    const result = await service.saveThumbnail(
      {
        accessToken: "token_123",
        email: "free@test.loomic.com",
        id: "user_123",
        userMetadata: {},
      },
      "project_123",
      Buffer.from("thumbnail"),
      "image/webp",
    );

    expect(upload).toHaveBeenCalledTimes(2);
    expect(projectUpdateBuilder.update).toHaveBeenCalledWith({
      thumbnail_path: "workspace_123/project_123/thumbnail.webp",
    });
    expect(result.thumbnailUrl).toBe(
      "http://host.docker.internal:54321/storage/v1/object/public/project-assets/workspace_123/project_123/thumbnail.webp",
    );
  });

  it("creates a project without bootstrapping the viewer when a personal workspace already exists", async () => {
    const workspaceQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn(),
    };
    workspaceQuery.select.mockReturnValue(workspaceQuery);
    workspaceQuery.eq.mockReturnValue(workspaceQuery);
    workspaceQuery.order.mockReturnValue(workspaceQuery);
    workspaceQuery.limit.mockReturnValue(workspaceQuery);
    workspaceQuery.maybeSingle.mockResolvedValue({
      data: {
        id: "workspace_123",
        name: "Personal Workspace",
        owner_user_id: "user_123",
        type: "personal",
      },
      error: null,
    });

    const rpc = vi.fn().mockResolvedValue({
      data: {
        project: {
          id: "project_123",
          name: "Harbor Studio",
          slug: "harbor-studio-abc123",
          description: null,
          created_at: "2026-04-20T10:00:00.000Z",
          updated_at: "2026-04-20T10:00:00.000Z",
          workspace_id: "workspace_123",
        },
        canvas: {
          id: "canvas_123",
          name: "Main Canvas",
          is_primary: true,
        },
      },
      error: null,
    });

    const userClient = {
      from: vi.fn((table: string) => {
        if (table === "workspaces") {
          return workspaceQuery;
        }

        throw new Error(`Unexpected user table: ${table}`);
      }),
      rpc,
      storage: {
        from: vi.fn(),
      },
    };

    const ensureViewer = vi.fn();
    const service = createProjectService({
      createUserClient: vi.fn(() => userClient as never),
      viewerService: {
        ensureViewer,
      } as never,
    });

    const result = await service.createProject(
      {
        accessToken: "token_123",
        email: "free@test.loomic.com",
        id: "user_123",
        userMetadata: {},
      },
      {
        name: "Harbor Studio",
      },
    );

    expect(ensureViewer).not.toHaveBeenCalled();
    expect(workspaceQuery.maybeSingle).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "create_project_with_canvas",
      expect.objectContaining({
        p_workspace_id: "workspace_123",
        p_name: "Harbor Studio",
      }),
    );
    expect(result.id).toBe("project_123");
    expect(result.primaryCanvas.id).toBe("canvas_123");
  });

  it("bootstraps the viewer once as a fallback when the personal workspace is missing", async () => {
    const workspaceQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn(),
    };
    workspaceQuery.select.mockReturnValue(workspaceQuery);
    workspaceQuery.eq.mockReturnValue(workspaceQuery);
    workspaceQuery.order.mockReturnValue(workspaceQuery);
    workspaceQuery.limit.mockReturnValue(workspaceQuery);
    workspaceQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const rpc = vi.fn().mockResolvedValue({
      data: {
        project: {
          id: "project_123",
          name: "Fallback Workspace Project",
          slug: "fallback-workspace-project-abc123",
          description: null,
          created_at: "2026-04-20T10:00:00.000Z",
          updated_at: "2026-04-20T10:00:00.000Z",
          workspace_id: "workspace_bootstrapped",
        },
        canvas: {
          id: "canvas_123",
          name: "Main Canvas",
          is_primary: true,
        },
      },
      error: null,
    });

    const userClient = {
      from: vi.fn((table: string) => {
        if (table === "workspaces") {
          return workspaceQuery;
        }

        throw new Error(`Unexpected user table: ${table}`);
      }),
      rpc,
      storage: {
        from: vi.fn(),
      },
    };

    const ensureViewer = vi.fn().mockResolvedValue({
      workspace: {
        id: "workspace_bootstrapped",
        name: "Bootstrapped Workspace",
        ownerUserId: "user_123",
        type: "personal",
      },
    });

    const service = createProjectService({
      createUserClient: vi.fn(() => userClient as never),
      viewerService: {
        ensureViewer,
      } as never,
    });

    const result = await service.createProject(
      {
        accessToken: "token_123",
        email: "free@test.loomic.com",
        id: "user_123",
        userMetadata: {},
      },
      {
        name: "Fallback Workspace Project",
      },
    );

    expect(workspaceQuery.maybeSingle).toHaveBeenCalledTimes(1);
    expect(ensureViewer).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "create_project_with_canvas",
      expect.objectContaining({
        p_workspace_id: "workspace_bootstrapped",
        p_name: "Fallback Workspace Project",
      }),
    );
    expect(result.workspace.id).toBe("workspace_bootstrapped");
  });
});
