// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  createProjectMock,
  fetchProjectsMock,
  loadHomeExampleCategoriesMock,
  routerPrefetchMock,
  routerPushMock,
  routerReplaceMock,
} = vi.hoisted(() => ({
  createProjectMock: vi.fn(),
  fetchProjectsMock: vi.fn(),
  loadHomeExampleCategoriesMock: vi.fn(),
  routerPrefetchMock: vi.fn(),
  routerPushMock: vi.fn(),
  routerReplaceMock: vi.fn(),
}));

vi.mock("framer-motion", async () => {
  const ReactModule = await import("react");
  return {
    motion: new Proxy(
      {},
      {
        get: (_target, tag: string) =>
          ReactModule.forwardRef(function MotionStub(
            props: Record<string, unknown>,
            ref,
          ) {
            const { children, ...rest } =
              props as React.PropsWithChildren<Record<string, unknown>>;
            return ReactModule.createElement(
              tag,
              { ...(rest as object), ref },
              children as React.ReactNode,
            );
          }),
      },
    ),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: routerReplaceMock,
    prefetch: routerPrefetchMock,
  }),
}));

vi.mock("../src/lib/auth-context", () => ({
  useAuth: () => ({
    session: { access_token: "token-home" },
    signOut: vi.fn(),
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

vi.mock("../src/hooks/use-image-attachments", () => ({
  useImageAttachments: () => ({
    attachments: [],
    addFiles: vi.fn(),
    removeAttachment: vi.fn(),
    clearAll: vi.fn(),
    isUploading: false,
    readyAttachments: [],
  }),
}));

vi.mock("../src/lib/server-api", () => ({
  ApiAuthError: class ApiAuthError extends Error {},
  fetchProjects: fetchProjectsMock,
}));

vi.mock("../src/lib/home-example-library", () => ({
  loadHomeExampleCategories: loadHomeExampleCategoriesMock,
}));

vi.mock("../src/components/home-prompt", () => ({
  HomePrompt: React.forwardRef(function HomePromptStub(_props, _ref) {
    return <div data-testid="home-prompt">HomePrompt</div>;
  }),
}));

vi.mock("../src/components/home-example-browser", () => ({
  HomeExampleBrowser: () => <div data-testid="home-example-browser" />,
}));

vi.mock("../src/components/skeletons/home-skeleton", () => ({
  HomeProjectsSkeleton: () => <div data-testid="home-projects-skeleton" />,
}));

vi.mock("../src/components/delete-project-dialog", () => ({
  DeleteProjectDialog: () => null,
}));

import HomePage from "../src/app/(workspace)/home/page";

describe("HomePage shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchProjectsMock.mockResolvedValue({
      projects: [
        {
          id: "project-1",
          name: "Harbor Complex",
          primaryCanvas: { id: "canvas-1" },
          thumbnailUrl: null,
          updatedAt: "2026-04-14T10:00:00.000Z",
        },
      ],
    });
    loadHomeExampleCategoriesMock.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("rewrites docker-only project thumbnail urls to the active browser hostname before rendering", async () => {
    fetchProjectsMock.mockResolvedValue({
      projects: [
        {
          id: "project-thumb-1",
          name: "Harbor Complex",
          primaryCanvas: { id: "canvas-1" },
          thumbnailUrl:
            "http://host.docker.internal:54321/storage/v1/object/public/project-assets/workspace-1/project-thumb-1/thumbnail.webp",
          updatedAt: "2026-04-14T10:00:00.000Z",
        },
      ],
    });

    render(<HomePage />);

    const projectTitle = await screen.findByText("Harbor Complex");
    const projectCard = projectTitle.closest("article");
    const projectThumbnail = projectCard?.querySelector("img");

    expect(projectThumbnail).not.toBeNull();

    const parsedUrl = new URL((projectThumbnail as HTMLImageElement).src);
    expect(parsedUrl.hostname).toBe(window.location.hostname);
    expect(parsedUrl.port).toBe("54321");
    expect(parsedUrl.pathname).toBe(
      "/storage/v1/object/public/project-assets/workspace-1/project-thumb-1/thumbnail.webp",
    );
  });

  it("prefetches each recent project canvas route after loading recent projects", async () => {
    render(<HomePage />);

    await screen.findByText("Harbor Complex");

    expect(routerPrefetchMock).toHaveBeenCalledWith(
      "/canvas?id=canvas-1&studio=architecture",
    );
  });

  it("renders recent project cards with the updated date visible and keeps the media wrapper positioned", async () => {
    fetchProjectsMock.mockResolvedValue({
      projects: [
        {
          id: "project-thumb-1",
          name: "Harbor Complex",
          primaryCanvas: { id: "canvas-1" },
          thumbnailUrl:
            "http://host.docker.internal:54321/storage/v1/object/public/project-assets/workspace-1/project-thumb-1/thumbnail.webp",
          updatedAt: "2026-04-14T10:00:00.000Z",
        },
      ],
    });

    render(<HomePage />);

    const projectTitle = await screen.findByText("Harbor Complex");
    const projectCard = projectTitle.closest("article");

    expect(projectCard).not.toBeNull();
    expect(
      within(projectCard as HTMLElement).getByText(/2026-04-14/),
    ).toBeInTheDocument();
    expect(
      within(projectCard as HTMLElement).getByTestId(
        "recent-project-card-media-project-thumb-1",
      ),
    ).toHaveClass("relative");
  });

  it("renders the white architecture home shell with site navigation, product-title h1, recent projects, and a single reference-case entry", async () => {
    render(<HomePage />);

    const shell = await screen.findByTestId("home-page-shell");
    expect(shell).toHaveAttribute("data-theme", "light-architecture");
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "AI创作无限画布Agent",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("让设计灵感来的更快一些！")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })[0]).toBeInTheDocument();
    expect(screen.getByRole("link")).toBeInTheDocument();
    expect(screen.getByTestId("home-prompt")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "打开参考案例" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("home-example-browser")).not.toBeInTheDocument();
  });

  it("opens the reference-case browser from the single entry card instead of rendering the grid inline", async () => {
    render(<HomePage />);

    expect(screen.queryByTestId("home-example-browser")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "打开参考案例" }),
    );

    const dialog = await screen.findByRole("dialog", { name: "参考案例" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByTestId("home-example-browser")).toBeInTheDocument();
  });

  it("keeps the new project card as the first recent-project entry while projects are still loading", () => {
    fetchProjectsMock.mockReturnValue(new Promise(() => {}));

    render(<HomePage />);

    const [recentProjectsHeading] = screen.getAllByRole("heading", { level: 2 });
    const recentProjectsSection = recentProjectsHeading!.closest("section");

    expect(recentProjectsSection).not.toBeNull();
    expect(
      within(recentProjectsSection as HTMLElement).getAllByRole("button")[0],
    ).toHaveTextContent("新建项目");
    expect(screen.getByTestId("home-projects-skeleton")).toBeInTheDocument();
  });

  it("opens the add-project dialog shell from the new project card before any project is created", async () => {
    render(<HomePage />);

    await userEvent.click(screen.getByRole("button", { name: /新建项目/ }));

    expect(createProjectMock).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "添加项目" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("项目名称")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "导入画布项目" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "上传项目文件" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "取消" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "确定" })).toBeInTheDocument();
  });

  it("submits the custom project name only after the dialog confirmation", async () => {
    render(<HomePage />);

    await userEvent.click(screen.getByRole("button", { name: /新建项目/ }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialog).getByLabelText("项目名称"),
      "Harbor Studio",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "确定" }));

    expect(createProjectMock).toHaveBeenCalledWith({
      name: "Harbor Studio",
      studioMode: "architecture",
    });
  });
});
