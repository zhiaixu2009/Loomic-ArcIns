type PromptTemplateImageSource = {
  coverImageUrl?: string | null;
  outputImageUrl?: string | null;
  previewImageUrls?: string[] | null;
  referenceImageUrls?: string[] | null;
};

export function listPromptTemplateImageUrls(
  template: PromptTemplateImageSource,
) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of [
    ...(template.previewImageUrls ?? []),
    template.coverImageUrl,
    template.outputImageUrl,
    ...(template.referenceImageUrls ?? []),
  ]) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}
