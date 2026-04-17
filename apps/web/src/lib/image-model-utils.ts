import type { ImageGenerationPreference } from "@loomic/shared";

export const TEMPLATE_RECOMMENDED_IMAGE_MODEL_ID = "google/nano-banana-pro";
export const TEMPLATE_RECOMMENDED_IMAGE_MODEL_LABEL = "Banana Pro";

const IMAGE_MODEL_CHIP_LABELS: Record<string, string> = {
  "google/nano-banana-pro": "Banana Pro",
  "google/nano-banana-2": "Banana2",
  "google/nano-banana": "Banana",
};

function formatFallbackImageModelLabel(modelId: string) {
  const rawLabel = modelId.split("/").pop() ?? modelId;
  return rawLabel
    .split("-")
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      if (/^\d+$/.test(segment)) {
        return segment;
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(" ");
}

export function getImageModelChipLabel(
  preference: ImageGenerationPreference | null | undefined,
  fallbackLabel = TEMPLATE_RECOMMENDED_IMAGE_MODEL_LABEL,
) {
  if (
    !preference ||
    preference.mode !== "manual" ||
    !Array.isArray(preference.models) ||
    preference.models.length === 0
  ) {
    return fallbackLabel;
  }

  if (preference.models.length > 1) {
    return "手动";
  }

  const [modelId] = preference.models;
  if (!modelId) {
    return fallbackLabel;
  }

  return (
    IMAGE_MODEL_CHIP_LABELS[modelId] ?? formatFallbackImageModelLabel(modelId)
  );
}

export function buildTemplateRecommendedImagePreference(
  modelId = TEMPLATE_RECOMMENDED_IMAGE_MODEL_ID,
): ImageGenerationPreference {
  return {
    mode: "manual",
    models: [modelId],
  };
}
