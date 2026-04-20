export const CREATE_PROJECT_REQUEST_STARTED_AT_KEY =
  "loomic:create-project-request-started-at";

export const CREATE_PROJECT_LAUNCH_ID_KEY =
  "loomic:create-project-launch-id";

export const LOADING_PREVIEW_OPENED_AT_KEY =
  "loomic:loading-preview-opened-at";

export function createProjectLaunchId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `project-launch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readSessionTimingNumber(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = sessionStorage.getItem(key);
  if (!rawValue) {
    return null;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}
