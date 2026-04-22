export const PROJECT_THUMBNAIL_REFRESH_EVENT =
  "loomic:project-thumbnail-refresh";

const PROJECT_THUMBNAIL_REFRESH_STORAGE_KEY =
  "loomic:project-thumbnail-refresh:pending";

export type ProjectThumbnailRefreshDetail = {
  projectId: string;
  updatedAt: string;
};

function isProjectThumbnailRefreshDetail(
  value: unknown,
): value is ProjectThumbnailRefreshDetail {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ProjectThumbnailRefreshDetail).projectId === "string" &&
      typeof (value as ProjectThumbnailRefreshDetail).updatedAt === "string",
  );
}

function readPendingProjectThumbnailRefresh(): ProjectThumbnailRefreshDetail | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(
    PROJECT_THUMBNAIL_REFRESH_STORAGE_KEY,
  );
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isProjectThumbnailRefreshDetail(parsed) ? parsed : null;
  } catch (error) {
    console.warn(
      "[project-thumbnail-refresh] failed to parse queued refresh payload",
      error,
    );
    return null;
  }
}

export function emitProjectThumbnailRefresh(
  detail: ProjectThumbnailRefreshDetail,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    PROJECT_THUMBNAIL_REFRESH_STORAGE_KEY,
    JSON.stringify(detail),
  );
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

  window.addEventListener(
    PROJECT_THUMBNAIL_REFRESH_EVENT,
    handleEvent as EventListener,
  );

  return () => {
    window.removeEventListener(
      PROJECT_THUMBNAIL_REFRESH_EVENT,
      handleEvent as EventListener,
    );
  };
}
