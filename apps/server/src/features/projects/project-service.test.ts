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
});
