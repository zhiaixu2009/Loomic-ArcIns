import { describe, expect, it } from "vitest";

import { extractSelectedCanvasElements } from "../src/lib/canvas-selection";

describe("extractSelectedCanvasElements", () => {
  it("keeps a selected image displayable when the file only carries a storageUrl", () => {
    const selected = extractSelectedCanvasElements({
      elements: [
        {
          id: "image-1",
          type: "image",
          x: 12,
          y: 24,
          width: 320,
          height: 180,
          fileId: "file-1",
        },
      ],
      files: {
        "file-1": {
          storageUrl: "https://example.com/file-storage-reference.png",
        },
      },
      selectedElementIds: {
        "image-1": true,
      },
    });

    expect(selected).toEqual([
      expect.objectContaining({
        id: "image-1",
        type: "image",
        storageUrl: "https://example.com/file-storage-reference.png",
      }),
    ]);
  });
});
