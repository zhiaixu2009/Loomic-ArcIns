// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { usePathnameMock, replaceMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("../src/lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    loading: false,
  }),
}));

vi.mock("../src/components/app-sidebar", () => ({
  AppSidebar: () => <aside data-testid="app-sidebar">AppSidebar</aside>,
}));

vi.mock("../src/components/credits/credit-header-button", () => ({
  CreditHeaderButton: () => (
    <button type="button" data-testid="layout-credit-button">
      CreditHeaderButton
    </button>
  ),
}));

vi.mock("../src/components/loading-screen", () => ({
  LoadingScreen: () => <div>Loading</div>,
}));

vi.mock("../src/components/page-transition", () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import WorkspaceLayout from "../src/app/(workspace)/layout";

describe("WorkspaceLayout shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue("/projects");
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the workspace sidebar for standard workspace routes", () => {
    render(
      <WorkspaceLayout>
        <div>Projects content</div>
      </WorkspaceLayout>,
    );

    expect(screen.getByTestId("app-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("layout-credit-button")).toBeInTheDocument();
  });

  it("hides the global workspace chrome on immersive routes like /home and /canvas", () => {
    const { rerender } = render(
      <WorkspaceLayout>
        <div>Immersive content</div>
      </WorkspaceLayout>,
    );

    usePathnameMock.mockReturnValue("/home");
    rerender(
      <WorkspaceLayout>
        <div>Home content</div>
      </WorkspaceLayout>,
    );

    expect(screen.queryByTestId("app-sidebar")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("layout-credit-button"),
    ).not.toBeInTheDocument();

    usePathnameMock.mockReturnValue("/canvas");
    rerender(
      <WorkspaceLayout>
        <div>Canvas content</div>
      </WorkspaceLayout>,
    );

    expect(screen.queryByTestId("app-sidebar")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("layout-credit-button"),
    ).not.toBeInTheDocument();
  });
});
