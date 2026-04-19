// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArchitectureStudioRail } from "../src/components/architecture/architecture-studio-rail";
import { createEmptyArchitectureContext } from "../src/lib/architecture-canvas";
import { downloadJsonFile } from "../src/lib/download-file";

describe("Architecture share/export UI", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders export actions in the architecture rail and calls each handler", async () => {
    const onShareSnapshot = vi.fn();
    const onDownloadReviewPackage = vi.fn();
    const onDownloadExportManifest = vi.fn();

    render(
      <ArchitectureStudioRail
        architectureContext={createEmptyArchitectureContext()}
        chatOpen={false}
        filesOpen={false}
        layersOpen={false}
        onInsertBoard={() => {}}
        onInsertBoardStack={() => {}}
        onOpenChat={() => {}}
        onToggleFiles={() => {}}
        onToggleLayers={() => {}}
        onShareSnapshot={onShareSnapshot}
        onDownloadReviewPackage={onDownloadReviewPackage}
        onDownloadExportManifest={onDownloadExportManifest}
        exportActionState={{
          status: "idle",
          message: "Ready to share and export",
        }}
        projectName="Harbor Tower"
      />,
    );

    expect(screen.getByText(/share & export/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /share snapshot/i }));
    await userEvent.click(screen.getByRole("button", { name: /download review package/i }));
    await userEvent.click(screen.getByRole("button", { name: /download manifest/i }));

    expect(onShareSnapshot).toHaveBeenCalledTimes(1);
    expect(onDownloadReviewPackage).toHaveBeenCalledTimes(1);
    expect(onDownloadExportManifest).toHaveBeenCalledTimes(1);
  });

  it("shows pending/success/failure state and the latest snapshot URL", () => {
    const { rerender } = render(
      <ArchitectureStudioRail
        architectureContext={createEmptyArchitectureContext()}
        chatOpen={false}
        filesOpen={false}
        layersOpen={false}
        onInsertBoard={() => {}}
        onInsertBoardStack={() => {}}
        onOpenChat={() => {}}
        onToggleFiles={() => {}}
        onToggleLayers={() => {}}
        onShareSnapshot={() => {}}
        onDownloadReviewPackage={() => {}}
        onDownloadExportManifest={() => {}}
        exportActionState={{
          status: "pending",
          message: "Sharing snapshot...",
        }}
        projectName="Harbor Tower"
      />,
    );

    expect(screen.getByText(/sharing snapshot/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /share snapshot/i })).toBeDisabled();

    rerender(
      <ArchitectureStudioRail
        architectureContext={createEmptyArchitectureContext()}
        chatOpen={false}
        filesOpen={false}
        layersOpen={false}
        onInsertBoard={() => {}}
        onInsertBoardStack={() => {}}
        onOpenChat={() => {}}
        onToggleFiles={() => {}}
        onToggleLayers={() => {}}
        onShareSnapshot={() => {}}
        onDownloadReviewPackage={() => {}}
        onDownloadExportManifest={() => {}}
        exportActionState={{
          status: "success",
          message: "Snapshot shared successfully.",
        }}
        lastSnapshotUrl="https://cdn.example.com/snapshots/asset_123.png"
        projectName="Harbor Tower"
      />,
    );

    expect(screen.getByText(/snapshot shared successfully/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /latest snapshot/i })).toHaveAttribute(
      "href",
      "https://cdn.example.com/snapshots/asset_123.png",
    );

    rerender(
      <ArchitectureStudioRail
        architectureContext={createEmptyArchitectureContext()}
        chatOpen={false}
        filesOpen={false}
        layersOpen={false}
        onInsertBoard={() => {}}
        onInsertBoardStack={() => {}}
        onOpenChat={() => {}}
        onToggleFiles={() => {}}
        onToggleLayers={() => {}}
        onShareSnapshot={() => {}}
        onDownloadReviewPackage={() => {}}
        onDownloadExportManifest={() => {}}
        exportActionState={{
          status: "failure",
          message: "Failed to share snapshot.",
        }}
        projectName="Harbor Tower"
      />,
    );

    expect(screen.getByText(/failed to share snapshot/i)).toBeInTheDocument();
  });
});

describe("downloadJsonFile", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("creates a blob URL, clicks a temporary anchor, and revokes the URL", () => {
    const createObjectURL = vi.fn(() => "blob:manifest-download");
    const revokeObjectURL = vi.fn();
    const originalURL = globalThis.URL;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    vi.stubGlobal("URL", {
      ...originalURL,
      createObjectURL,
      revokeObjectURL,
    });

    downloadJsonFile({ manifestVersion: "1" }, "architecture-manifest.json");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const firstCreateObjectUrlCall = createObjectURL.mock.calls.at(0);
    expect(firstCreateObjectUrlCall).toBeDefined();
    const [firstBlobArg] = firstCreateObjectUrlCall as unknown as [Blob];
    expect(firstBlobArg).toBeInstanceOf(Blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:manifest-download");
  });
});
