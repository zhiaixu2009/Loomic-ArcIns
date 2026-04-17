// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CanvasFilesPanel } from "../src/components/canvas-files-panel";

function createMockApi(elements: Array<Record<string, unknown>>) {
  return {
    getSceneElements: () => elements,
    getFiles: () => ({
      "file-generated": {
        dataURL: "data:image/png;base64,generated",
      },
      "file-uploaded": {
        dataURL: "data:image/png;base64,uploaded",
      },
    }),
    onChange: vi.fn(() => () => {}),
  };
}

afterEach(() => {
  cleanup();
});

describe("CanvasFilesPanel", () => {
  it("shows only generated files in the embedded record section", async () => {
    const excalidrawApi = createMockApi([
      {
        id: "generated-1",
        type: "image",
        fileId: "file-generated",
        isDeleted: false,
        customData: {
          source: "generated",
          title: "\u591c\u666f\u6548\u679c\u56fe",
        },
      },
      {
        id: "uploaded-1",
        type: "image",
        fileId: "file-uploaded",
        isDeleted: false,
        customData: {
          source: "uploaded",
          title: "\u53c2\u8003\u56fe",
        },
      },
    ]);

    render(
      <CanvasFilesPanel
        excalidrawApi={excalidrawApi}
        open
        onClose={vi.fn()}
        variant="embedded"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("\u751f\u6210\u6587\u4ef6\u5217\u8868")).toBeInTheDocument();
    });

    expect(screen.getByText("\u591c\u666f\u6548\u679c\u56fe")).toBeInTheDocument();
    expect(
      screen.queryByText("\u53c2\u8003\u56fe"),
    ).not.toBeInTheDocument();
  });

  it("keeps a stable embedded shell when no generated files exist yet", async () => {
    const excalidrawApi = createMockApi([
      {
        id: "uploaded-1",
        type: "image",
        fileId: "file-uploaded",
        isDeleted: false,
        customData: {
          source: "uploaded",
          title: "\u53c2\u8003\u56fe",
        },
      },
    ]);

    const { container } = render(
      <CanvasFilesPanel
        excalidrawApi={excalidrawApi}
        open
        onClose={vi.fn()}
        variant="embedded"
      />,
    );

    await waitFor(() => {
      expect(excalidrawApi.onChange).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByText("\u751f\u6210\u6587\u4ef6\u5217\u8868"),
    ).toBeInTheDocument();
    expect(screen.getByText("\u6682\u65e0\u6587\u4ef6")).toBeInTheDocument();
    expect(
      screen.getByText("\u6682\u65e0\u751f\u6210\u6587\u4ef6"),
    ).toBeInTheDocument();
    expect(container).not.toBeEmptyDOMElement();
  });

  it("renders the dedicated immersive file-list panel", async () => {
    const excalidrawApi = createMockApi([
      {
        id: "generated-1",
        type: "image",
        fileId: "file-generated",
        isDeleted: false,
        customData: {
          source: "generated",
          title: "\u591c\u666f\u6548\u679c\u56fe",
        },
      },
    ]);

    render(
      <CanvasFilesPanel
        excalidrawApi={excalidrawApi}
        open
        onClose={vi.fn()}
        variant="immersive"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("canvas-files-panel-immersive"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("\u751f\u6210\u6587\u4ef6\u5217\u8868")).toBeInTheDocument();
    expect(screen.getByText("\u591c\u666f\u6548\u679c\u56fe")).toBeInTheDocument();
    expect(screen.getByText("\u6ca1\u6709\u66f4\u591a\u4e86")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "\u5173\u95ed\u6587\u4ef6\u5217\u8868" }),
    ).toBeInTheDocument();
  });
});
