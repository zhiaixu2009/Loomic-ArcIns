// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithToast } from "./render-with-toast";

const {
  createProjectMock,
  fetchProjectsMock,
  routerPushMock,
} = vi.hoisted(() => ({
  createProjectMock: vi.fn(),
  fetchProjectsMock: vi.fn(),
  routerPushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: vi.fn(),
  }),
}));

vi.mock("../src/lib/auth-context", () => ({
  useAuth: () => ({
    session: { access_token: "project-library-token" },
    signOut: vi.fn(),
    user: { id: "user-1" },
  }),
}));

vi.mock("../src/hooks/use-create-project", () => ({
  useCreateProject: () => ({
    create: createProjectMock,
    creating: false,
  }),
}));

vi.mock("../src/hooks/use-delete-project", () => ({
  useDeleteProject: () => ({
    pendingId: null,
    deleting: false,
    requestDelete: vi.fn(),
    confirmDelete: vi.fn(),
    cancelDelete: vi.fn(),
  }),
}));

vi.mock("../src/lib/server-api", () => ({
  ApiAuthError: class ApiAuthError extends Error {},
  fetchProjects: fetchProjectsMock,
}));

import { ProjectLibraryDialog } from "../src/components/project-library-dialog";

describe("ProjectLibraryDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    fetchProjectsMock.mockResolvedValue({
      projects: [
        {
          id: "project-1",
          name: "Harbor Complex",
          slug: "harbor-complex",
          description: "Primary architecture study",
          thumbnailUrl: null,
          workspace: {
            id: "workspace-1",
            name: "Workspace",
            ownerUserId: "user-1",
            type: "personal",
          },
          primaryCanvas: { id: "canvas-1", isPrimary: true, name: "Main Canvas" },
          createdAt: "2026-04-20T10:00:00.000Z",
          updatedAt: "2026-04-20T11:00:00.000Z",
        },
        {
          id: "project-2",
          name: "Mountain Lodge",
          slug: "mountain-lodge",
          description: "Hospitality concept",
          thumbnailUrl: null,
          workspace: {
            id: "workspace-1",
            name: "Workspace",
            ownerUserId: "user-1",
            type: "personal",
          },
          primaryCanvas: { id: "canvas-2", isPrimary: true, name: "Main Canvas" },
          createdAt: "2026-04-20T09:00:00.000Z",
          updatedAt: "2026-04-20T10:30:00.000Z",
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("opens as a standalone dialog, supports search, and filters to favorites without routing to /projects", async () => {
    renderWithToast(<ProjectLibraryDialog open onOpenChange={vi.fn()} />);

    const dialog = await screen.findByRole("dialog", { name: "项目库" });
    expect(dialog).toBeInTheDocument();

    await userEvent.type(
      within(dialog).getByRole("searchbox", { name: "搜索项目" }),
      "Harbor",
    );

    expect(within(dialog).getByText("Harbor Complex")).toBeInTheDocument();
    expect(within(dialog).queryByText("Mountain Lodge")).not.toBeInTheDocument();

    await userEvent.clear(
      within(dialog).getByRole("searchbox", { name: "搜索项目" }),
    );

    await screen.findByText("Harbor Complex");

    await userEvent.click(
      within(dialog).getByRole("button", {
        name: "收藏项目 Harbor Complex",
      }),
    );

    await userEvent.click(
      within(dialog).getByRole("button", { name: "收藏 1" }),
    );

    await waitFor(() => {
      expect(within(dialog).getByText("Harbor Complex")).toBeInTheDocument();
      expect(within(dialog).queryByText("Mountain Lodge")).not.toBeInTheDocument();
    });

    expect(routerPushMock).not.toHaveBeenCalledWith("/projects");
  });

  it("opens a selected project directly in canvas and closes the standalone library dialog", async () => {
    const onOpenChange = vi.fn();

    renderWithToast(<ProjectLibraryDialog open onOpenChange={onOpenChange} />);

    const dialog = await screen.findByRole("dialog", { name: "项目库" });

    await userEvent.click(
      within(dialog).getByRole("button", { name: "打开项目 Harbor Complex" }),
    );

    expect(routerPushMock).toHaveBeenCalledWith(
      "/canvas?id=canvas-1&studio=architecture",
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
