// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/script", () => ({
  default: (props: React.ComponentProps<"script">) => <script {...props} />,
}));

vi.mock("../src/components/providers", () => ({
  Providers: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" "),
}));

vi.mock("next/font/google", () => {
  throw new Error("root layout should not depend on next/font/google during local builds");
});

describe("RootLayout build dependencies", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not import Google font helpers at module load time", async () => {
    const importedLayout = await import("../src/app/layout");

    expect(importedLayout.default).toBeTypeOf("function");
    expect(importedLayout.metadata.title).toBe("Loomic");
  });
});
