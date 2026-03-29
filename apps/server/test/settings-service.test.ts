import { describe, expect, it, vi } from "vitest";

import {
  SettingsServiceError,
  createSettingsService,
} from "../src/features/settings/settings-service.js";

describe("createSettingsService", () => {
  it("returns the persisted default model when the query succeeds", async () => {
    const service = createSettingsService({
      createUserClient: () =>
        ({
          from: () => ({
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { default_model: "gpt-5.2" },
                    error: null,
                  }),
              }),
            }),
          }),
        }) as any,
    });

    await expect(
      service.getWorkspaceSettings(
        {
          accessToken: "token",
          email: "test@example.com",
          id: "user-1",
          userMetadata: {},
        },
        "ws-1",
      ),
    ).resolves.toEqual({
      defaultModel: "gpt-5.2",
    });
  });

  it("throws when the workspace settings query returns an error", async () => {
    const service = createSettingsService({
      createUserClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "permission denied" },
              }),
            }),
          }),
        }),
      }) as any,
    });

    await expect(
      service.getWorkspaceSettings(
        {
          accessToken: "token",
          email: "test@example.com",
          id: "user-1",
          userMetadata: {},
        },
        "ws-1",
      ),
    ).rejects.toBeInstanceOf(SettingsServiceError);
  });
});
