import { describe, expect, it } from "vitest";

import { extractSelectedCanvasElements } from "../src/lib/canvas-selection";

describe("canvas-selection", () => {
  it("extracts a live image selection snapshot with storage metadata", () => {
    const selected = extractSelectedCanvasElements({
      elements: [
        {
          id: "image-1",
          type: "image",
          x: 120,
          y: 80,
          width: 640,
          height: 480,
          fileId: "file-1",
          customData: {
            storageUrl: "https://example.com/runtime-reference.png",
          },
        },
        {
          id: "shape-1",
          type: "rectangle",
          x: 10,
          y: 20,
          width: 160,
          height: 90,
        },
      ],
      files: {
        "file-1": {
          dataURL: "data:image/png;base64,ZmFrZQ==",
        },
      },
      selectedElementIds: {
        "image-1": true,
      },
    });

    expect(selected).toEqual([
      {
        id: "image-1",
        type: "image",
        x: 120,
        y: 80,
        width: 640,
        height: 480,
        fileId: "file-1",
        dataUrl: "data:image/png;base64,ZmFrZQ==",
        storageUrl: "https://example.com/runtime-reference.png",
      },
    ]);
  });

  it("falls back to initial file storage urls when the live file map only has inline data", () => {
    const selected = extractSelectedCanvasElements({
      elements: [
        {
          id: "image-1",
          type: "image",
          x: 20,
          y: 30,
          width: 320,
          height: 180,
          fileId: "file-1",
        },
      ],
      files: {
        "file-1": {
          dataURL: "data:image/png;base64,ZmFrZTI=",
        },
      },
      initialFiles: {
        "file-1": {
          storageUrl: "https://example.com/initial-reference.png",
        },
      },
      selectedElementIds: {
        "image-1": true,
      },
    });

    expect(selected).toEqual([
      {
        id: "image-1",
        type: "image",
        x: 20,
        y: 30,
        width: 320,
        height: 180,
        fileId: "file-1",
        dataUrl: "data:image/png;base64,ZmFrZTI=",
        storageUrl: "https://example.com/initial-reference.png",
      },
    ]);
  });
});
