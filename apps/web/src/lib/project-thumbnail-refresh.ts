export const PROJECT_THUMBNAIL_REFRESH_EVENT =
  "loomic:project-thumbnail-refresh";

const PROJECT_THUMBNAIL_REFRESH_STORAGE_KEY =
  "loomic:project-thumbnail-refresh:pending";
const PROJECT_THUMBNAIL_REFRESH_BROADCAST_STORAGE_KEY =
  "loomic:project-thumbnail-refresh:broadcast";

export type ProjectThumbnailRefreshDetail = {
  projectId: string;
  updatedAt: string;
  projectName?: string;
  canvasId?: string;
  thumbnailDataUrl?: string;
};

function isProjectThumbnailRefreshDetail(
  value: unknown,
): value is ProjectThumbnailRefreshDetail {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ProjectThumbnailRefreshDetail).projectId === "string" &&
      typeof (value as ProjectThumbnailRefreshDetail).updatedAt === "string" &&
      ((value as ProjectThumbnailRefreshDetail).projectName === undefined ||
        typeof (value as ProjectThumbnailRefreshDetail).projectName === "string") &&
      ((value as ProjectThumbnailRefreshDetail).canvasId === undefined ||
        typeof (value as ProjectThumbnailRefreshDetail).canvasId === "string") &&
      ((value as ProjectThumbnailRefreshDetail).thumbnailDataUrl === undefined ||
        typeof (value as ProjectThumbnailRefreshDetail).thumbnailDataUrl === "string"),
  );
}

function parseProjectThumbnailRefreshDetail(
  raw: string | null,
): ProjectThumbnailRefreshDetail | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isProjectThumbnailRefreshDetail(parsed) ? parsed : null;
  } catch (error) {
    console.warn(
      "[project-thumbnail-refresh] failed to parse refresh payload",
      error,
    );
    return null;
  }
}

function readPendingProjectThumbnailRefresh(): ProjectThumbnailRefreshDetail | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(
    PROJECT_THUMBNAIL_REFRESH_STORAGE_KEY,
  );
  return parseProjectThumbnailRefreshDetail(raw);
}

export function emitProjectThumbnailRefresh(
  detail: ProjectThumbnailRefreshDetail,
) {
  if (typeof window === "undefined") {
    return;
  }

  const serializedDetail = JSON.stringify(detail);

  try {
    window.sessionStorage.setItem(
      PROJECT_THUMBNAIL_REFRESH_STORAGE_KEY,
      serializedDetail,
    );
  } catch (error) {
    console.warn(
      "[project-thumbnail-refresh] failed to persist same-tab refresh payload",
      error,
    );
  }

  try {
    window.localStorage.setItem(
      PROJECT_THUMBNAIL_REFRESH_BROADCAST_STORAGE_KEY,
      serializedDetail,
    );
  } catch (error) {
    console.warn(
      "[project-thumbnail-refresh] failed to broadcast cross-tab refresh payload",
      error,
    );
  }

  window.dispatchEvent(
    new CustomEvent(PROJECT_THUMBNAIL_REFRESH_EVENT, {
      detail,
    }),
  );
  console.info("[project-thumbnail-refresh] dispatched refresh signal", detail);
}

export function consumePendingProjectThumbnailRefresh() {
  const detail = readPendingProjectThumbnailRefresh();

  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(PROJECT_THUMBNAIL_REFRESH_STORAGE_KEY);
  }

  return detail;
}

export function addProjectThumbnailRefreshListener(
  listener: (detail: ProjectThumbnailRefreshDetail) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleEvent = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (!isProjectThumbnailRefreshDetail(detail)) {
      return;
    }

    listener(detail);
  };
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== PROJECT_THUMBNAIL_REFRESH_BROADCAST_STORAGE_KEY) {
      return;
    }

    const detail = parseProjectThumbnailRefreshDetail(event.newValue);
    if (!detail) {
      return;
    }

    listener(detail);
  };

  window.addEventListener(
    PROJECT_THUMBNAIL_REFRESH_EVENT,
    handleEvent as EventListener,
  );
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(
      PROJECT_THUMBNAIL_REFRESH_EVENT,
      handleEvent as EventListener,
    );
    window.removeEventListener("storage", handleStorageEvent);
  };
}
