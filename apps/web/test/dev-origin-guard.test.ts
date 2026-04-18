import { describe, expect, it, vi } from "vitest";

import {
  redirectToCanonicalLoopbackOrigin,
  resolveCanonicalLoopbackUrl,
} from "../src/components/dev-origin-guard";

describe("dev origin guard", () => {
  it("normalizes localhost urls to the canonical 127 loopback origin", () => {
    expect(
      resolveCanonicalLoopbackUrl(
        "http://localhost:3000/canvas?id=abc&studio=architecture#draft",
      ),
    ).toBe("http://127.0.0.1:3000/canvas?id=abc&studio=architecture#draft");
  });

  it("does not rewrite urls that already use 127.0.0.1", () => {
    expect(
      resolveCanonicalLoopbackUrl(
        "http://127.0.0.1:3000/home?tab=recent",
      ),
    ).toBeNull();
  });

  it("redirects localhost sessions through the provided replace callback", () => {
    const replace = vi.fn();

    const redirectedTo = redirectToCanonicalLoopbackOrigin(
      {
        href: "http://localhost:3000/home?tab=recent",
      } as Pick<Location, "href">,
      replace,
    );

    expect(redirectedTo).toBe("http://127.0.0.1:3000/home?tab=recent");
    expect(replace).toHaveBeenCalledWith(
      "http://127.0.0.1:3000/home?tab=recent",
    );
  });
});
