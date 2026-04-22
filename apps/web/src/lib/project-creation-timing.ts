export const CREATE_PROJECT_REQUEST_STARTED_AT_KEY =
  "loomic:create-project-request-started-at";

export const CREATE_PROJECT_LAUNCH_ID_KEY =
  "loomic:create-project-launch-id";

export const LOADING_PREVIEW_OPENED_AT_KEY =
  "loomic:loading-preview-opened-at";

export const EXISTING_PROJECT_OPENING_MIN_VISIBLE_MS_TEST_OVERRIDE_KEY =
  "__LOOMIC_EXISTING_PROJECT_OPENING_MIN_VISIBLE_MS__";

const PROJECT_CREATION_TIMING_KEYS = [
  CREATE_PROJECT_REQUEST_STARTED_AT_KEY,
  CREATE_PROJECT_LAUNCH_ID_KEY,
  LOADING_PREVIEW_OPENED_AT_KEY,
] as const;

const DEFAULT_EXISTING_PROJECT_OPENING_MIN_VISIBLE_MS = 1_500;

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

  let rawValue: string | null = null;
  try {
    rawValue = sessionStorage.getItem(key);
  } catch {
    rawValue = null;
  }

  if (!rawValue) {
    return null;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function hasPendingProjectLaunch() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return Boolean(sessionStorage.getItem(CREATE_PROJECT_LAUNCH_ID_KEY));
  } catch {
    return false;
  }
}

export function readExistingProjectOpeningMinVisibleMs() {
  if (typeof window === "undefined") {
    return DEFAULT_EXISTING_PROJECT_OPENING_MIN_VISIBLE_MS;
  }

  const overrideValue = Reflect.get(
    window,
    EXISTING_PROJECT_OPENING_MIN_VISIBLE_MS_TEST_OVERRIDE_KEY,
  );

  if (
    typeof overrideValue === "number" &&
    Number.isFinite(overrideValue) &&
    overrideValue >= 0
  ) {
    return overrideValue;
  }

  return DEFAULT_EXISTING_PROJECT_OPENING_MIN_VISIBLE_MS;
}

export function clearProjectCreationTiming() {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of PROJECT_CREATION_TIMING_KEYS) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // sessionStorage cleanup failure is non-fatal
    }
  }
}
