// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithToast } from "./render-with-toast";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockCreateProject = vi.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => mockRouter),
}));

const mockSignOut = vi.fn();
const mockUser = { id: "u1", email: "test@test.com" };
const mockSession = { access_token: "token_123" };
const mockAuthValue = {
  user: mockUser,
  session: mockSession,
  loading: false,
  signOut: mockSignOut,
};
vi.mock("../src/lib/auth-context", () => ({
  useAuth: vi.fn(() => mockAuthValue),
}));

vi.mock("../src/hooks/use-create-project", () => ({
  useCreateProject: vi.fn(() => ({
    create: mockCreateProject,
    creating: false,
  })),
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import ProjectsPage from "../src/app/(workspace)/projects/page";

const viewerResponse = {
  profile: { id: "u1", email: "test@test.com", displayName: "Test", avatarUrl: null },
  workspace: { id: "w1", name: "My Workspace", type: "personal", ownerUserId: "u1" },
  membership: { workspaceId: "w1", userId: "u1", role: "owner" },
};

const workspace = { id: "w1", name: "My Workspace", type: "personal", ownerUserId: "u1" };

const projectsResponse = {
  projects: [
    {
      id: "p1", name: "Brand System", slug: "brand-system",
      description: "Primary brand project",
      workspace, primaryCanvas: { id: "c1", name: "Main Canvas", isPrimary: true },
      createdAt: "2026-03-23T00:00:00Z", updatedAt: "2026-03-23T10:00:00Z",
    },
    {
      id: "p2", name: "App Redesign", slug: "app-redesign",
      description: null,
      workspace, primaryCanvas: { id: "c2", name: "Main Canvas", isPrimary: true },
      createdAt: "2026-03-22T00:00:00Z", updatedAt: "2026-03-22T00:00:00Z",
    },
  ],
};

/**
 * URL-based mock that always returns success for viewer/projects.
 * Handles React 19 double-effect invocation in tests.
 */
function mockSuccessfulLoad(projectsOverride?: unknown) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/viewer")) {
      return Promise.resolve({ ok: true, status: 200, json: async () => viewerResponse });
    }
    if (url.includes("/api/projects")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => (projectsOverride ?? projectsResponse),
      });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  });
}

describe("Projects page", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SERVER_BASE_URL", "http://localhost:3001");
  });

  it("renders the architecture studio entry with workspace name and project cards", async () => {
    mockSuccessfulLoad();
    renderWithToast(<ProjectsPage />);

    expect(
      await screen.findByText((_, element) =>
        element?.tagName === "P" &&
        (element.textContent?.includes("Workspace: My Workspace") ?? false),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new architecture studio/i }),
    ).toBeInTheDocument();
    const brandItems = await screen.findAllByText("Brand System");
    expect(brandItems.length).toBeGreaterThanOrEqual(1);
    const redesignItems = await screen.findAllByText("App Redesign");
    expect(redesignItems.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Delete Brand System" })).toBeInTheDocument();
  });

  it("keeps the architecture entry visible and omits project cards when no projects load", async () => {
    mockSuccessfulLoad({ projects: [] });
    renderWithToast(<ProjectsPage />);

    expect(
      await screen.findByRole("button", { name: /new architecture studio/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Brand System")).not.toBeInTheDocument();
    expect(screen.queryByText("App Redesign")).not.toBeInTheDocument();
  });

  it("starts architecture studio creation from the hero CTA", async () => {
    mockSuccessfulLoad();
    renderWithToast(<ProjectsPage />);

    const button = await screen.findByRole("button", { name: /new architecture studio/i });
    await userEvent.click(button);
    expect(mockCreateProject).toHaveBeenCalledWith({ studioMode: "architecture" });
  });

  it("calls signOut and redirects on 401 from fetchViewer", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/viewer")) {
        return Promise.resolve({
          ok: false, status: 401,
          json: async () => ({ error: { code: "unauthorized", message: "Bad token" } }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });

    renderWithToast(<ProjectsPage />);
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("shows error banner with retry on 500 from fetchViewer — does NOT redirect", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/viewer")) {
        return Promise.resolve({
          ok: false, status: 500,
          json: async () => ({ error: { code: "bootstrap_failed", message: "Server error" } }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });

    renderWithToast(<ProjectsPage />);
    expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("calls signOut and redirects on 401 from fetchProjects", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/viewer")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => viewerResponse });
      }
      if (url.includes("/api/projects")) {
        return Promise.resolve({
          ok: false, status: 401,
          json: async () => ({ error: { code: "unauthorized", message: "Bad token" } }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });

    renderWithToast(<ProjectsPage />);
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("starts default project creation from the project grid create tile", async () => {
    mockSuccessfulLoad();
    renderWithToast(<ProjectsPage />);

    await screen.findByText("Brand System");

    const createTile = document.querySelector('div[role="button"][tabindex="0"]');
    expect(createTile).not.toBeNull();

    await userEvent.click(createTile as HTMLElement);

    expect(mockCreateProject).toHaveBeenCalledWith();
  });

  it("renders delete actions for existing project cards", async () => {
    mockSuccessfulLoad();
    renderWithToast(<ProjectsPage />);

    expect(await screen.findByRole("button", { name: "Delete Brand System" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete App Redesign" })).toBeInTheDocument();
  });
});
