import { describe, expect, it } from "vitest";

import * as CanvasEditorModule from "../src/components/canvas-editor";

describe("serializeCanvasContent", () => {
  it("omits resolved data urls when a storage url already exists", () => {
    const serializeCanvasContent = (
      CanvasEditorModule as Record<string, unknown>
    ).serializeCanvasContent as
      | ((input: {
          api: { getFiles?: () => Record<string, unknown> };
          appState: Record<string, unknown>;
          elements: readonly Record<string, unknown>[];
        }) => {
          appState: Record<string, unknown>;
          elements: Record<string, unknown>[];
          files: Record<string, Record<string, unknown>>;
        })
      | undefined;

    expect(serializeCanvasContent).toBeTypeOf("function");

    const payload = serializeCanvasContent!({
      api: {
        getFiles: () => ({
          "file-1": {
            id: "file-1",
            dataURL: "data:image/png;base64,AAAA",
            mimeType: "image/png",
            created: 123,
            storageUrl: "https://example.com/storage/file-1.png",
          },
        }),
      },
      appState: {
        viewBackgroundColor: "#ffffff",
        gridModeEnabled: false,
      },
      elements: [
        {
          id: "element-1",
          type: "image",
          fileId: "file-1",
        },
      ],
    });

    expect(payload.files["file-1"]).toEqual({
      id: "file-1",
      mimeType: "image/png",
      created: 123,
      storageUrl: "https://example.com/storage/file-1.png",
    });
  });
});
