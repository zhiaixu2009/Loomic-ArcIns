// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchImageBlobWithFallback,
  insertImageFileOnCanvas,
} from "../src/lib/canvas-elements";

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

describe("insertImageFileOnCanvas", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds a local image file without refetching it from storage", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const addFiles = vi.fn();
    const updateScene = vi.fn();

    await insertImageFileOnCanvas(
      {
        addFiles,
        getSceneElements: () => [],
        getAppState: () => ({
          scrollX: 0,
          scrollY: 0,
          width: 1200,
          height: 800,
          zoom: { value: 1 },
        }),
        updateScene,
      },
      {
        file: new File([new Uint8Array([1, 2, 3, 4])], "reference.png", {
          type: "image/png",
        }),
        title: "Reference",
        width: 640,
        height: 480,
      },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(addFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        mimeType: "image/png",
        dataURL: expect.stringMatching(/^data:image\/png;base64,/),
      }),
    ]);
    expect(updateScene).toHaveBeenCalledTimes(1);
  });
});
