// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFetchViewer,
  mockGetSession,
  mockOnAuthStateChange,
  mockSignInWithOtp,
  mockSignInWithPassword,
  mockSignInWithOAuth,
  mockReplace,
  mockSearchParams,
} = vi.hoisted(() => ({
  mockFetchViewer: vi.fn().mockResolvedValue({
    workspace: { id: "w1" },
    profile: { id: "u1" },
    membership: { workspaceId: "w1", userId: "u1", role: "owner" },
  }),
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignInWithOtp: vi.fn().mockResolvedValue({ error: null }),
  mockSignInWithPassword: vi.fn().mockResolvedValue({
    data: {
      session: {
        access_token: "session-token",
        user: { id: "u1", email: "user@example.com" },
      },
    },
    error: null,
  }),
  mockSignInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
  mockReplace: vi.fn(),
  mockSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("../src/lib/server-api", () => ({
  fetchViewer: mockFetchViewer,
}));

vi.mock("../src/lib/supabase-browser", () => ({
  getSupabaseBrowserClient: vi.fn(() => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession,
    },
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: mockReplace })),
  useSearchParams: mockSearchParams,
}));

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="dynamic-landing-section" />,
}));

vi.mock("../src/components/landing/floating-nav", () => ({
  FloatingNav: () => <div data-testid="landing-floating-nav" />,
}));

vi.mock("../src/components/landing/hero-section", () => ({
  HeroSection: () => <div data-testid="landing-hero" />,
}));

vi.mock("../src/components/landing/trust-bar", () => ({
  TrustBar: () => <div data-testid="landing-trust-bar" />,
}));

import RootPage from "../src/app/page";
import { AuthProvider } from "../src/lib/auth-context";

describe("Root page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    cleanup();
  });

  it("uses the login experience as the root entry instead of the marketing landing page", async () => {
    render(
      <AuthProvider>
        <RootPage />
      </AuthProvider>,
    );

    expect(await screen.findByText("Loomic")).toBeInTheDocument();
    expect(screen.getByText("发送登录链接")).toBeInTheDocument();
    expect(screen.queryByTestId("landing-trust-bar")).not.toBeInTheDocument();
  });
});
