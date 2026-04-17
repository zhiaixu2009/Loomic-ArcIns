import { describe, expect, it, vi } from "vitest";

import { CanvasServiceError, createCanvasService } from "./canvas-service.js";

function createSaveClientMock(result: { data: unknown; error: unknown }) {
  const select = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ update });

  return {
    client: {
      from,
      storage: {
        from: vi.fn(),
      },
    },
    from,
    update,
    eq,
    select,
  };
}

describe("createCanvasService.saveCanvasContent", () => {
  it("throws when the canvas update matches zero rows", async () => {
    const { client, select } = createSaveClientMock({
      data: [],
      error: null,
    });

    const service = createCanvasService({
      createUserClient: vi.fn().mockReturnValue(client as any),
    });

    await expect(
      service.saveCanvasContent(
        {
          accessToken: "token-1",
          email: "pro@test.loomic.com",
          id: "user-1",
          userMetadata: {},
        },
        "canvas-1",
        {
          appState: {},
          elements: [],
          files: {},
        },
      ),
    ).rejects.toBeInstanceOf(CanvasServiceError);

    expect(select).toHaveBeenCalledWith("id");
  });
});
