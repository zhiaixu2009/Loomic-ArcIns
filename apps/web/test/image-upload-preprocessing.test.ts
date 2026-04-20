// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import {
  ImageUploadPreparationError,
  prepareImageFileForInteractiveUpload,
} from "../src/lib/image-upload-preprocessing";

describe("prepareImageFileForInteractiveUpload", () => {
  it("keeps small raster images unchanged when they are already lightweight", async () => {
    const file = new File([new Uint8Array(512 * 1024)], "small.png", {
      type: "image/png",
    });
    const readImageDimensions = vi.fn().mockResolvedValue({
      width: 1280,
      height: 720,
    });
    const transcodeRasterImage = vi.fn();

    const result = await prepareImageFileForInteractiveUpload(file, undefined, {
      readImageDimensions,
      transcodeRasterImage,
    });

    expect(result.file).toBe(file);
    expect(result.optimized).toBe(false);
    expect(result.width).toBe(1280);
    expect(result.height).toBe(720);
    expect(transcodeRasterImage).not.toHaveBeenCalled();
  });

  it("optimizes large raster images before they are uploaded", async () => {
    const file = new File([new Uint8Array(256)], "large.png", {
      type: "image/png",
    });
    const optimizedFile = new File([new Uint8Array(512)], "large.webp", {
      type: "image/webp",
    });
    const readImageDimensions = vi.fn().mockResolvedValue({
      width: 3200,
      height: 2400,
    });
    const transcodeRasterImage = vi.fn().mockResolvedValue({
      file: optimizedFile,
      width: 2048,
      height: 1536,
    });

    const result = await prepareImageFileForInteractiveUpload(
      file,
      {
        maxBytes: 1024,
      },
      {
        readImageDimensions,
        transcodeRasterImage,
      },
    );

    expect(transcodeRasterImage).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        maxBytes: expect.any(Number),
        maxDimension: expect.any(Number),
      }),
    );
    expect(result.file).toBe(optimizedFile);
    expect(result.optimized).toBe(true);
    expect(result.width).toBe(2048);
    expect(result.height).toBe(1536);
  });

  it("rejects raster files that remain above the upload limit after optimization", async () => {
    const file = new File([new Uint8Array(256)], "too-large.png", {
      type: "image/png",
    });
    const readImageDimensions = vi.fn().mockResolvedValue({
      width: 4200,
      height: 2800,
    });
    const transcodeRasterImage = vi.fn().mockResolvedValue({
      file: new File([new Uint8Array(2048)], "still-large.webp", {
        type: "image/webp",
      }),
      width: 2048,
      height: 1365,
    });

    await expect(
      prepareImageFileForInteractiveUpload(
        file,
        {
          maxBytes: 1024,
        },
        {
          readImageDimensions,
          transcodeRasterImage,
        },
      ),
    ).rejects.toBeInstanceOf(ImageUploadPreparationError);
  });
});
