export type StudioMode = "architecture" | "classic";

type BuildCanvasUrlOptions = {
  prompt?: string;
  sessionId?: string;
  studio?: StudioMode;
};

export function buildCanvasUrl(
  canvasId: string,
  options: BuildCanvasUrlOptions = {},
) {
  const params = new URLSearchParams({ id: canvasId });

  if (options.sessionId) {
    params.set("session", options.sessionId);
  }

  if (options.prompt) {
    params.set("prompt", options.prompt);
  }

  if (options.studio && options.studio !== "classic") {
    params.set("studio", options.studio);
  }

  return `/canvas?${params.toString()}`;
}

export function isArchitectureStudio(
  studio: string | null | undefined,
): studio is "architecture" {
  return studio === "architecture";
}
