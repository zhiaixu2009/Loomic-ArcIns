// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useImageAttachments } from "../src/hooks/use-image-attachments";

const { prepareImageFileForInteractiveUploadMock, uploadFileMock } = vi.hoisted(
  () => ({
    prepareImageFileForInteractiveUploadMock: vi.fn(),
    uploadFileMock: vi.fn(),
  }),
);

vi.mock("../src/lib/image-upload-preprocessing", () => ({
  prepareImageFileForInteractiveUpload:
    prepareImageFileForInteractiveUploadMock,
}));

vi.mock("../src/lib/server-api", () => ({
  uploadFile: uploadFileMock,
}));

describe("useImageAttachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:preview"),
        revokeObjectURL: vi.fn(),
      }),
    );
  });

  it("uploads the prepared image file instead of the raw original file", async () => {
    const rawFile = new File([new Uint8Array(7 * 1024 * 1024)], "raw.png", {
      type: "image/png",
    });
    const optimizedFile = new File([new Uint8Array(1024 * 1024)], "raw.webp", {
      type: "image/webp",
    });

    prepareImageFileForInteractiveUploadMock.mockResolvedValue({
      file: optimizedFile,
      width: 2048,
      height: 1365,
      optimized: true,
    });
    uploadFileMock.mockResolvedValue({
      asset: { id: "asset_1" },
      url: "https://example.com/asset_1.webp",
    });

    const { result } = renderHook(() =>
      useImageAttachments("token_123", "project_123"),
    );

    await act(async () => {
      await result.current.addFiles([rawFile]);
    });

    await waitFor(() => {
      expect(uploadFileMock).toHaveBeenCalledWith(
        "token_123",
        optimizedFile,
        "project_123",
      );
    });

    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0]?.uploading).toBe(false);
    expect(result.current.attachments[0]?.url).toBe(
      "https://example.com/asset_1.webp",
    );
  });
});
