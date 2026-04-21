import type { ArchitecturePromptTemplateSuggestion } from "./architecture-prompt-templates";
import { listPromptTemplateImageUrls } from "./prompt-template-images";

export type PromptTemplateAttachmentInput = {
  assetId: string;
  url: string;
  mimeType: string;
  name: string;
};

function inferImageMimeType(url: string) {
  const normalizedUrl = url.trim().toLowerCase();

  if (normalizedUrl.includes(".webp")) {
    return "image/webp";
  }
  if (normalizedUrl.includes(".jpeg") || normalizedUrl.includes(".jpg")) {
    return "image/jpeg";
  }
  if (normalizedUrl.includes(".gif")) {
    return "image/gif";
  }
  if (normalizedUrl.includes(".svg")) {
    return "image/svg+xml";
  }
  if (normalizedUrl.includes(".avif")) {
    return "image/avif";
  }

  return "image/png";
}

export function buildPromptTemplateAttachmentInputs(
  template: ArchitecturePromptTemplateSuggestion,
): PromptTemplateAttachmentInput[] {
  return listPromptTemplateImageUrls(template).map((url, index) => ({
    assetId: `template:${template.id}:${index}`,
    url,
    mimeType: inferImageMimeType(url),
    name: `${template.label} 参考图 ${index + 1}`,
  }));
}
