// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchImageBlobWithFallback } from "../src/lib/canvas-elements";

describe("fetchImageBlobWithFallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses a browser-reachable local storage url before falling back to the proxy", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(new Blob(["ok"], { type: "image/png" }), {
          status: 200,
        }),
      );

    await fetchImageBlobWithFallback(
      "http://host.docker.internal:54321/storage/v1/object/public/assets/reference.png",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://${window.location.hostname}:54321/storage/v1/object/public/assets/reference.png`,
    );
  });
});
