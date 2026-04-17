import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/env", () => ({
  getServerBaseUrl: () => "http://127.0.0.1:3001",
}));

import { fetchAsDataURL } from "../src/lib/canvas-elements";

function createImageResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    blob: vi.fn(async () => new Blob([body], { type: "image/png" })),
  } as unknown as Response;
}

describe("canvas-elements", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("prefers direct browser fetches when the asset is already reachable", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(createImageResponse("direct-image"));

    const result = await fetchAsDataURL(
      "http://127.0.0.1:54321/storage/v1/object/public/project-assets/demo.png",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:54321/storage/v1/object/public/project-assets/demo.png",
    );
    expect(result).toBe("data:image/png;base64,ZGlyZWN0LWltYWdl");
  });

  it("falls back to the proxy when the direct fetch fails", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(createImageResponse("not-found", 404))
      .mockResolvedValueOnce(createImageResponse("proxy-image"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await fetchAsDataURL("https://replicate.delivery/output.png");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://replicate.delivery/output.png",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:3001/api/proxy-image?url=https%3A%2F%2Freplicate.delivery%2Foutput.png",
    );
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe("data:image/png;base64,cHJveHktaW1hZ2U=");
  });

  it("throws when both direct and proxied fetches fail", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(createImageResponse("bad-gateway", 502));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      fetchAsDataURL("https://replicate.delivery/output.png"),
    ).rejects.toThrow("Failed to fetch image: 502");
  });
});
