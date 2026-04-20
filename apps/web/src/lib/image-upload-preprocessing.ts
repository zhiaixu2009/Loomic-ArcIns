"use client";

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
const DEFAULT_OPTIMIZE_THRESHOLD_BYTES = 3 * 1024 * 1024;
const DEFAULT_MAX_IMAGE_DIMENSION = 2048;
const LOSSY_QUALITY_STEPS = [0.88, 0.8, 0.72, 0.64] as const;
const RASTER_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const PASSTHROUGH_IMAGE_TYPES = new Set(["image/gif", "image/svg+xml"]);

export class ImageUploadPreparationError extends Error {
  readonly code: "image_too_large" | "image_processing_failed";

  constructor(
    code: "image_too_large" | "image_processing_failed",
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = "ImageUploadPreparationError";
  }
}

export type PreparedImageUpload = {
  file: File;
  width: number;
  height: number;
  optimized: boolean;
};

type TranscodedRasterImage = {
  file: File;
  width: number;
  height: number;
};

type PrepareImageUploadDeps = {
  readImageDimensions: (file: Blob) => Promise<{ width: number; height: number }>;
  transcodeRasterImage: (
    file: File,
    options: {
      maxBytes: number;
      maxDimension: number;
    },
  ) => Promise<TranscodedRasterImage>;
};

export async function prepareImageFileForInteractiveUpload(
  file: File,
  options?: {
    maxBytes?: number;
    maxDimension?: number;
    optimizeThresholdBytes?: number;
  },
  deps?: Partial<PrepareImageUploadDeps>,
): Promise<PreparedImageUpload> {
  const maxBytes = options?.maxBytes ?? MAX_IMAGE_UPLOAD_BYTES;
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_IMAGE_DIMENSION;
  const optimizeThresholdBytes =
    options?.optimizeThresholdBytes ?? DEFAULT_OPTIMIZE_THRESHOLD_BYTES;
  const resolvedDeps: PrepareImageUploadDeps = {
    readImageDimensions: deps?.readImageDimensions ?? readImageDimensions,
    transcodeRasterImage: deps?.transcodeRasterImage ?? transcodeRasterImage,
  };

  const { width, height } = await resolvedDeps.readImageDimensions(file);
  const exceedsDimensionLimit = Math.max(width, height) > maxDimension;
  const exceedsByteLimit = file.size > maxBytes;
  const isRaster = RASTER_IMAGE_TYPES.has(file.type);

  if (!isRaster) {
    if (exceedsByteLimit) {
      throw new ImageUploadPreparationError(
        "image_too_large",
        "图片超过 10MB，请选择更小的图片。",
      );
    }

    if (!PASSTHROUGH_IMAGE_TYPES.has(file.type)) {
      console.warn("[image-upload] passing through unsupported optimization type", {
        mimeType: file.type,
        fileName: file.name,
        byteSize: file.size,
      });
    }

    return {
      file,
      width,
      height,
      optimized: false,
    };
  }

  const shouldOptimize =
    exceedsByteLimit ||
    exceedsDimensionLimit ||
    file.size > optimizeThresholdBytes;

  if (!shouldOptimize) {
    return {
      file,
      width,
      height,
      optimized: false,
    };
  }

  const transcoded = await resolvedDeps.transcodeRasterImage(file, {
    maxBytes,
    maxDimension,
  });

  const mustUseTranscoded = exceedsByteLimit || exceedsDimensionLimit;
  const useTranscoded =
    mustUseTranscoded || transcoded.file.size < file.size;
  const nextFile = useTranscoded ? transcoded.file : file;
  const nextWidth = useTranscoded ? transcoded.width : width;
  const nextHeight = useTranscoded ? transcoded.height : height;

  if (nextFile.size > maxBytes) {
    throw new ImageUploadPreparationError(
      "image_too_large",
      "图片处理后仍超过 10MB，请选择更小的图片。",
    );
  }

  return {
    file: nextFile,
    width: nextWidth,
    height: nextHeight,
    optimized: nextFile !== file,
  };
}

export async function readImageDimensions(
  file: Blob,
): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(objectUrl);
    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(
        new ImageUploadPreparationError(
          "image_processing_failed",
          "无法读取图片内容。",
        ),
      );
    reader.readAsDataURL(blob);
  });
}

async function transcodeRasterImage(
  file: File,
  options: {
    maxBytes: number;
    maxDimension: number;
  },
): Promise<TranscodedRasterImage> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(objectUrl);
    const targetSize = scaleToFit(
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
      options.maxDimension,
    );
    const canvas = document.createElement("canvas");
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new ImageUploadPreparationError(
        "image_processing_failed",
        "无法处理图片。",
      );
    }

    context.drawImage(image, 0, 0, targetSize.width, targetSize.height);

    const targetMimeType = pickTargetMimeType(file.type);
    const qualitySteps =
      targetMimeType === "image/png" ? [undefined] : LOSSY_QUALITY_STEPS;

    let bestBlob: Blob | null = null;
    for (const quality of qualitySteps) {
      const blob = await canvasToBlob(canvas, targetMimeType, quality);
      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
      }
      if (blob.size <= options.maxBytes) {
        bestBlob = blob;
        break;
      }
    }

    if (!bestBlob) {
      throw new ImageUploadPreparationError(
        "image_processing_failed",
        "无法处理图片。",
      );
    }

    return {
      file: new File(
        [bestBlob],
        replaceFileExtension(file.name, extensionForMimeType(targetMimeType)),
        {
          type: targetMimeType,
          lastModified: file.lastModified,
        },
      ),
      width: targetSize.width,
      height: targetSize.height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function scaleToFit(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(
        new ImageUploadPreparationError(
          "image_processing_failed",
          "无法加载图片。",
        ),
      );
    image.src = src;
  });

  return image;
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new ImageUploadPreparationError(
              "image_processing_failed",
              "无法导出图片。",
            ),
          );
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function pickTargetMimeType(mimeType: string): string {
  if (mimeType === "image/jpeg") {
    return "image/jpeg";
  }

  return "image/webp";
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "img";
  }
}

function replaceFileExtension(fileName: string, nextExtension: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `${baseName || "image"}.${nextExtension}`;
}
