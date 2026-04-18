"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ImageOutputPreference } from "@loomic/shared";

const STORAGE_KEY = "loomic:image-output-preference";

export const DEFAULT_IMAGE_OUTPUT_PREFERENCE: ImageOutputPreference = {
  aspectRatio: "auto",
  resolution: "2K",
};

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

let cachedRaw: string | null = null;
let cachedPreference: ImageOutputPreference = DEFAULT_IMAGE_OUTPUT_PREFERENCE;

function normalizePreference(
  preference?: Partial<ImageOutputPreference> | null,
): ImageOutputPreference {
  if (!preference) {
    return DEFAULT_IMAGE_OUTPUT_PREFERENCE;
  }

  const aspectRatio =
    preference.aspectRatio === "16:9" ||
    preference.aspectRatio === "4:3" ||
    preference.aspectRatio === "1:1" ||
    preference.aspectRatio === "3:4" ||
    preference.aspectRatio === "9:16" ||
    preference.aspectRatio === "21:9"
      ? preference.aspectRatio
      : "auto";

  const resolution =
    preference.resolution === "1K" ||
    preference.resolution === "2K" ||
    preference.resolution === "4K"
      ? preference.resolution
      : "2K";

  return {
    aspectRatio,
    resolution,
  };
}

function getSnapshot(): ImageOutputPreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedPreference = raw
        ? normalizePreference(JSON.parse(raw) as Partial<ImageOutputPreference>)
        : DEFAULT_IMAGE_OUTPUT_PREFERENCE;
    }
    return cachedPreference;
  } catch {
    return DEFAULT_IMAGE_OUTPUT_PREFERENCE;
  }
}

function getServerSnapshot(): ImageOutputPreference {
  return DEFAULT_IMAGE_OUTPUT_PREFERENCE;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function useImageOutputPreference() {
  const preference = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setPreference = useCallback((next: ImageOutputPreference) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitChange();
  }, []);

  const setAspectRatio = useCallback(
    (aspectRatio: ImageOutputPreference["aspectRatio"]) => {
      setPreference({
        ...preference,
        aspectRatio,
      });
    },
    [preference, setPreference],
  );

  const setResolution = useCallback(
    (resolution: ImageOutputPreference["resolution"]) => {
      setPreference({
        ...preference,
        resolution,
      });
    },
    [preference, setPreference],
  );

  const activeImageOutputPreference =
    preference.aspectRatio !== DEFAULT_IMAGE_OUTPUT_PREFERENCE.aspectRatio ||
    preference.resolution !== DEFAULT_IMAGE_OUTPUT_PREFERENCE.resolution
      ? preference
      : undefined;

  return {
    preference,
    setPreference,
    setAspectRatio,
    setResolution,
    activeImageOutputPreference,
  };
}
