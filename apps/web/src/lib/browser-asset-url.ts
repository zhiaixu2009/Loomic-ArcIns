"use client";

const DOCKER_ONLY_BROWSER_HOSTS = new Set([
  "host.docker.internal",
  "gateway.docker.internal",
]);

function getBrowserHostname() {
  if (typeof window === "undefined") {
    return null;
  }

  const hostname = window.location.hostname?.trim();
  if (!hostname || hostname === "0.0.0.0") {
    return "127.0.0.1";
  }

  return hostname;
}

export function resolveBrowserAssetUrl(url: string | null | undefined) {
  if (!url) {
    return url ?? "";
  }

  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("file:")
  ) {
    return url;
  }

  try {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://127.0.0.1";
    const parsedUrl = new URL(url, base);

    if (!DOCKER_ONLY_BROWSER_HOSTS.has(parsedUrl.hostname)) {
      return url;
    }

    const browserHostname = getBrowserHostname();
    if (!browserHostname) {
      return url;
    }

    parsedUrl.hostname = browserHostname;
    return parsedUrl.toString();
  } catch {
    return url;
  }
}
