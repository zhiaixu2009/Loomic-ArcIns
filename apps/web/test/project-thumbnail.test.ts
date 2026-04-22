import { describe, expect, it } from "vitest";

import { selectProjectThumbnailFocusElements } from "../src/lib/project-thumbnail";

describe("selectProjectThumbnailFocusElements", () => {
  it("keeps the last four added image elements for the thumbnail mosaic instead of prioritizing the largest images", () => {
    const elements = [
      {
        id: "image-1",
        type: "image",
        fileId: "file-1",
        width: 3200,
        height: 2400,
      },
      {
        id: "image-2",
        type: "image",
        fileId: "file-2",
        width: 800,
        height: 600,
      },
      {
        id: "image-3",
        type: "image",
        fileId: "file-3",
        width: 900,
        height: 700,
      },
      {
        id: "image-4",
        type: "image",
        fileId: "file-4",
        width: 1000,
        height: 700,
      },
      {
        id: "image-5",
        type: "image",
        fileId: "file-5",
        width: 700,
        height: 700,
      },
      {
        id: "shape-1",
        type: "rectangle",
        width: 1200,
        height: 900,
      },
    ] satisfies Record<string, unknown>[];

    expect(selectProjectThumbnailFocusElements(elements)).toEqual([
      expect.objectContaining({ id: "image-2" }),
      expect.objectContaining({ id: "image-3" }),
      expect.objectContaining({ id: "image-4" }),
      expect.objectContaining({ id: "image-5" }),
    ]);
  });
});
