// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../src/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../src/components/dev-origin-guard", () => ({
  DevOriginGuard: () => null,
}));

vi.mock("../src/components/toast", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../src/components/credits/tier-limit-toast", () => ({
  TierLimitToastProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../src/components/project-library-provider", () => ({
  ProjectLibraryProvider: ({ children }: { children: React.ReactNode }) => (
    <>
      <div data-testid="project-library-provider-marker" />
      {children}
    </>
  ),
}));

import { Providers } from "../src/components/providers";

describe("Providers", () => {
  afterEach(() => {
    cleanup();
  });

  it("mounts the shared project-library provider at the root app provider layer", () => {
    render(
      <Providers>
        <div data-testid="providers-child">child</div>
      </Providers>,
    );

    expect(
      screen.getByTestId("project-library-provider-marker"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("providers-child")).toBeInTheDocument();
  });
});
