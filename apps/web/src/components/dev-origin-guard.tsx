"use client";

import { useEffect } from "react";

export function resolveCanonicalLoopbackUrl(currentUrl: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(currentUrl);
  } catch {
    return null;
  }

  if (parsedUrl.hostname !== "localhost") {
    return null;
  }

  parsedUrl.hostname = "127.0.0.1";
  return parsedUrl.toString();
}

export function redirectToCanonicalLoopbackOrigin(
  locationLike: Pick<Location, "href">,
  replace: (nextUrl: string) => void,
) {
  const nextUrl = resolveCanonicalLoopbackUrl(locationLike.href);

  if (!nextUrl || nextUrl === locationLike.href) {
    return null;
  }

  replace(nextUrl);
  return nextUrl;
}

export function DevOriginGuard() {
  useEffect(() => {
    redirectToCanonicalLoopbackOrigin(window.location, (nextUrl) => {
      window.location.replace(nextUrl);
    });
  }, []);

  return null;
}
