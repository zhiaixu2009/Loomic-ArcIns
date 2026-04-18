// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { resolveBrowserAssetUrl } from "../src/lib/browser-asset-url";

describe("resolveBrowserAssetUrl", () => {
  it("rewrites docker-only local asset hosts to the current browser hostname", () => {
    const source =
      "http://host.docker.internal:54321/storage/v1/object/public/assets/reference.png";

    const resolved = resolveBrowserAssetUrl(source);
    const parsed = new URL(resolved);

    expect(parsed.hostname).toBe(window.location.hostname);
    expect(parsed.port).toBe("54321");
    expect(parsed.pathname).toBe(
      "/storage/v1/object/public/assets/reference.png",
    );
  });

  it("keeps remote and inline asset urls unchanged", () => {
    expect(
      resolveBrowserAssetUrl("https://example.com/assets/reference.png"),
    ).toBe("https://example.com/assets/reference.png");
    expect(resolveBrowserAssetUrl("data:image/png;base64,ZmFrZQ==")).toBe(
      "data:image/png;base64,ZmFrZQ==",
    );
    expect(resolveBrowserAssetUrl("blob:https://example.com/id-1")).toBe(
      "blob:https://example.com/id-1",
    );
  });
});
