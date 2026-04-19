import { describe, expect, it, vi } from "vitest";

import { createExportService } from "./export-service.js";

describe("createExportService", () => {
  it("creates share snapshots even when the viewer workspace differs from the shared project workspace", async () => {
    const uploadFile = vi.fn().mockResolvedValue({
      asset: {
        id: "asset_123",
        bucket: "project-assets",
        objectPath: "workspace-shared/project_123/share-snapshot.png",
        mimeType: "image/png",
        byteSize: 24,
        workspaceId: "workspace-shared",
        projectId: "project_123",
        createdAt: "2026-04-13T10:30:00.000Z",
      },
      url: "https://cdn.example.com/share-snapshot.png",
    });

    const client = createUserClientMock({
      canvas: {
        id: "canvas_123",
        name: "Main Canvas",
        project_id: "project_123",
      },
      primaryCanvas: {
        id: "canvas_123",
        is_primary: true,
        name: "Main Canvas",
      },
      project: {
        id: "project_123",
        name: "Harbor Tower",
        slug: "harbor-tower",
        description: null,
        workspace_id: "workspace-shared",
        created_at: "2026-04-13T10:00:00.000Z",
        updated_at: "2026-04-13T10:00:00.000Z",
        thumbnail_path: null,
      },
      workspace: {
        id: "workspace-shared",
        name: "Shared Studio",
        type: "team",
        owner_user_id: "owner_123",
      },
    });

    const service = createExportService({
      createUserClient: vi.fn(() => client as never),
      uploadService: {
        uploadFile,
      } as never,
      viewerService: {
        ensureViewer: vi.fn().mockResolvedValue({
          workspace: {
            id: "workspace-personal",
            name: "Personal Studio",
            type: "personal",
            ownerUserId: "user_123",
          },
        }),
      } as never,
    });

    const snapshot = await service.createShareSnapshot(
      {
        accessToken: "token_123",
        email: "starter@test.loomic.com",
        id: "user_123",
        userMetadata: {},
      },
      {
        projectId: "project_123",
        canvasId: "canvas_123",
        snapshotDataUrl: "data:image/png;base64,AAAA",
        title: "Shared facade review",
        source: {
          studio: "architecture",
          activeBoardId: "architecture-board-render_variations",
        },
      },
    );

    expect(uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user_123" }),
      expect.objectContaining({
        projectId: "project_123",
        workspaceId: "workspace-shared",
      }),
    );
    expect(snapshot.url).toContain("share-snapshot");
    expect(snapshot.projectId).toBe("project_123");
  });

  it("retries transient chat session query failures when building a review package", async () => {
    const chatSessionQuery = {
      select: vi.fn(() => chatSessionQuery),
      eq: vi.fn(() => chatSessionQuery),
      order: vi
        .fn()
        .mockResolvedValueOnce({
          data: null,
          error: {
            code: "",
            details:
              "TypeError: fetch failed\nCaused by: SocketError: other side closed (UND_ERR_SOCKET)",
            hint: "",
            message: "TypeError: fetch failed",
          },
        })
        .mockResolvedValueOnce({
          data: [],
          error: null,
        }),
    };

    const client = {
      from(table: string) {
        if (table === "projects") {
          return {
            select() {
              return {
                eq() {
                  return {
                    is() {
                      return {
                        async maybeSingle() {
                          return {
                            data: {
                              id: "project_123",
                              name: "Harbor Tower",
                              slug: "harbor-tower",
                              description: null,
                              workspace_id: "workspace-shared",
                              created_at: "2026-04-13T10:00:00.000Z",
                              updated_at: "2026-04-13T10:00:00.000Z",
                              thumbnail_path: null,
                            },
                            error: null,
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "workspaces") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return {
                        data: {
                          id: "workspace-shared",
                          name: "Shared Studio",
                          type: "team",
                          owner_user_id: "owner_123",
                        },
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "canvases") {
          return {
            select() {
              return {
                eq(_column: string, value: string | boolean) {
                  if (value === "canvas_123") {
                    return {
                      async maybeSingle() {
                        return {
                          data: {
                            id: "canvas_123",
                            name: "Main Canvas",
                            project_id: "project_123",
                          },
                          error: null,
                        };
                      },
                    };
                  }

                  return {
                    eq() {
                      return {
                        async maybeSingle() {
                          return {
                            data: {
                              id: "canvas_123",
                              is_primary: true,
                              name: "Main Canvas",
                            },
                            error: null,
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "asset_objects") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async order() {
                      return {
                        data: [],
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "chat_sessions") {
          return chatSessionQuery;
        }

        if (table === "chat_messages") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async order() {
                      return {
                        data: [],
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        }

        throw new Error(`Unexpected table lookup: ${table}`);
      },
      storage: {
        from() {
          return {
            getPublicUrl() {
              return { data: { publicUrl: "https://cdn.example.com/thumbnail.png" } };
            },
          };
        },
      },
    };

    const service = createExportService({
      createUserClient: vi.fn(() => client as never),
      uploadService: {} as never,
      viewerService: {} as never,
    });

    const reviewPackage = await service.buildReviewPackage(
      {
        accessToken: "token_123",
        email: "starter@test.loomic.com",
        id: "user_123",
        userMetadata: {},
      },
      {
        projectId: "project_123",
        canvasId: "canvas_123",
      },
    );

    expect(chatSessionQuery.order).toHaveBeenCalledTimes(2);
    expect(reviewPackage.project.id).toBe("project_123");
    expect(reviewPackage.canvas.id).toBe("canvas_123");
    expect(reviewPackage.latestPlan).toBeUndefined();
  });

  it("rejects invalid asset buckets when building a manifest", async () => {
    const client = {
      from(table: string) {
        if (table === "projects") {
          return {
            select() {
              return {
                eq() {
                  return {
                    is() {
                      return {
                        async maybeSingle() {
                          return {
                            data: {
                              id: "project_123",
                              name: "Harbor Tower",
                              slug: "harbor-tower",
                              description: null,
                              workspace_id: "workspace-shared",
                              created_at: "2026-04-13T10:00:00.000Z",
                              updated_at: "2026-04-13T10:00:00.000Z",
                              thumbnail_path: null,
                            },
                            error: null,
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "workspaces") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return {
                        data: {
                          id: "workspace-shared",
                          name: "Shared Studio",
                          type: "team",
                          owner_user_id: "owner_123",
                        },
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "canvases") {
          return {
            select() {
              return {
                eq(_column: string, value: string | boolean) {
                  if (value === "canvas_123") {
                    return {
                      async maybeSingle() {
                        return {
                          data: {
                            id: "canvas_123",
                            name: "Main Canvas",
                            project_id: "project_123",
                          },
                          error: null,
                        };
                      },
                    };
                  }

                  return {
                    eq() {
                      return {
                        async maybeSingle() {
                          return {
                            data: {
                              id: "canvas_123",
                              is_primary: true,
                              name: "Main Canvas",
                            },
                            error: null,
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "asset_objects") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async order() {
                      return {
                        data: [
                          {
                            id: "asset_bad",
                            bucket: "malformed-bucket",
                            object_path: "workspace-shared/project_123/bad.bin",
                            mime_type: "application/octet-stream",
                            byte_size: 10,
                            workspace_id: "workspace-shared",
                            project_id: "project_123",
                            created_at: "2026-04-13T10:00:00.000Z",
                          },
                        ],
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "chat_sessions") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async order() {
                      return {
                        data: [],
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "chat_messages") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async order() {
                      return {
                        data: [],
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        }

        throw new Error(`Unexpected table lookup: ${table}`);
      },
      storage: {
        from() {
          return {
            getPublicUrl() {
              return { data: { publicUrl: "https://cdn.example.com/thumbnail.png" } };
            },
          };
        },
      },
    };

    const service = createExportService({
      createUserClient: vi.fn(() => client as never),
      uploadService: {} as never,
      viewerService: {} as never,
    });

    await expect(
      service.buildManifest(
        {
          accessToken: "token_123",
          email: "starter@test.loomic.com",
          id: "user_123",
          userMetadata: {},
        },
        {
          projectId: "project_123",
          canvasId: "canvas_123",
        },
      ),
    ).rejects.toMatchObject({
      code: "application_error",
      message: "Unable to load project assets.",
      statusCode: 500,
    });
  });
});

function createUserClientMock(data: {
  canvas: {
    id: string;
    name: string;
    project_id: string;
  };
  primaryCanvas: {
    id: string;
    is_primary: boolean;
    name: string;
  };
  project: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    workspace_id: string;
    created_at: string;
    updated_at: string;
    thumbnail_path: string | null;
  };
  workspace: {
    id: string;
    name: string;
    type: "personal" | "team";
    owner_user_id: string;
  };
}) {
  return {
    from(table: string) {
      if (table === "projects") {
        return {
          select() {
            return {
              eq() {
                return {
                  is() {
                    return {
                      async maybeSingle() {
                        return { data: data.project, error: null };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "workspaces") {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: data.workspace, error: null };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "canvases") {
        return {
          select() {
            return {
              eq(_column: string, value: string | boolean) {
                if (value === data.canvas.id) {
                  return {
                    async maybeSingle() {
                      return { data: data.canvas, error: null };
                    },
                  };
                }

                return {
                  eq() {
                    return {
                      async maybeSingle() {
                        return { data: data.primaryCanvas, error: null };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table lookup: ${table}`);
    },
    storage: {
      from() {
        return {
          getPublicUrl() {
            return { data: { publicUrl: "https://cdn.example.com/thumbnail.png" } };
          },
        };
      },
    },
  };
}
