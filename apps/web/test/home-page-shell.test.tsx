// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  createProjectMock,
  creatingState,
  fetchProjectsMock,
  openProjectLibraryMock,
  requestDeleteMock,
  routerPrefetchMock,
  routerPushMock,
  routerReplaceMock,
  scheduleCanvasExperienceWarmupMock,
} = vi.hoisted(() => ({
  createProjectMock: vi.fn(),
  creatingState: {
    current: false,
  },
  fetchProjectsMock: vi.fn(),
  openProjectLibraryMock: vi.fn(),
  requestDeleteMock: vi.fn(),
  routerPrefetchMock: vi.fn(),
  routerPushMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  scheduleCanvasExperienceWarmupMock: vi.fn(),
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
    creating: creatingState.current,
  }),
}));

vi.mock("../src/hooks/use-delete-project", () => ({
  useDeleteProject: () => ({
    pendingId: null,
    deleting: false,
    requestDelete: requestDeleteMock,
    confirmDelete: vi.fn(),
    cancelDelete: vi.fn(),
  }),
}));

vi.mock("../src/hooks/use-image-attachments", () => ({
  useImageAttachments: () => ({
    attachments: [],
    addFiles: vi.fn(),
    removeAttachment: vi.fn(),
    replaceTemplateAttachments: vi.fn(),
    clearAll: vi.fn(),
    isUploading: false,
    readyAttachments: [],
  }),
}));

vi.mock("../src/components/project-library-provider", () => ({
  useProjectLibrary: () => ({
    openProjectLibrary: openProjectLibraryMock,
  }),
}));

vi.mock("../src/lib/server-api", () => ({
  ApiAuthError: class ApiAuthError extends Error {},
  fetchProjects: fetchProjectsMock,
}));

vi.mock("../src/lib/canvas-experience-warmup", () => ({
  scheduleCanvasExperienceWarmup: scheduleCanvasExperienceWarmupMock,
}));

vi.mock("../src/components/home-prompt", () => ({
  HomePrompt: React.forwardRef(function HomePromptStub(_props, _ref) {
    return <div data-testid="home-prompt">HomePrompt</div>;
  }),
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
    creatingState.current = false;
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
    expect(parsedUrl.searchParams.get("v")).toBe("2026-04-14T10:00:00.000Z");
  });

  it("prefetches each recent project canvas route after loading recent projects", async () => {
    render(<HomePage />);

    await screen.findByText("Harbor Complex");

    await waitFor(() => {
      expect(routerPrefetchMock).toHaveBeenCalledWith(
        "/canvas?id=canvas-1&studio=architecture",
      );
    });
  });

  it("refreshes homepage projects after the window regains focus so updated thumbnails can be reloaded", async () => {
    render(<HomePage />);

    await screen.findByText("Harbor Complex");
    expect(fetchProjectsMock).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("focus"));

    await waitFor(() => {
      expect(fetchProjectsMock).toHaveBeenCalledTimes(2);
    });
  });

  it("refreshes homepage projects after an explicit project-thumbnail refresh signal", async () => {
    render(<HomePage />);

    await screen.findByText("Harbor Complex");
    expect(fetchProjectsMock).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new CustomEvent("loomic:project-thumbnail-refresh", {
        detail: {
          projectId: "project-1",
          updatedAt: "2026-04-22T09:00:00.000Z",
        },
      }),
    );

    await waitFor(() => {
      expect(fetchProjectsMock).toHaveBeenCalledTimes(2);
    });
  });

  it("schedules a generic canvas warmup on mount so new-project navigation can reuse cached route resources", () => {
    render(<HomePage />);

    expect(scheduleCanvasExperienceWarmupMock).toHaveBeenCalledTimes(1);
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

  it("keeps recent project titles on a single line and uses a non-clipping footer layout inside square cards", async () => {
    render(<HomePage />);

    const title = await screen.findByTestId("recent-project-card-title-project-1");
    const footer = screen.getByTestId("recent-project-card-footer-project-1");

    expect(title).toHaveClass("truncate");
    expect(title).toHaveClass("whitespace-nowrap");
    expect(footer).toHaveClass("min-h-0");
    expect(footer).not.toHaveClass("min-h-[92px]");
  });

  it("prioritizes recent projects with thumbnails before filling the homepage limit with blank cards", async () => {
    fetchProjectsMock.mockResolvedValue({
      projects: [
        {
          id: "project-blank-1",
          name: "Blank One",
          primaryCanvas: { id: "canvas-blank-1" },
          thumbnailUrl: null,
          updatedAt: "2026-04-20T10:00:00.000Z",
        },
        {
          id: "project-blank-2",
          name: "Blank Two",
          primaryCanvas: { id: "canvas-blank-2" },
          thumbnailUrl: null,
          updatedAt: "2026-04-20T09:00:00.000Z",
        },
        {
          id: "project-thumb-1",
          name: "Thumb One",
          primaryCanvas: { id: "canvas-thumb-1" },
          thumbnailUrl:
            "http://host.docker.internal:54321/storage/v1/object/public/project-assets/workspace-1/project-thumb-1/thumbnail.webp",
          updatedAt: "2026-04-20T08:00:00.000Z",
        },
        {
          id: "project-thumb-2",
          name: "Thumb Two",
          primaryCanvas: { id: "canvas-thumb-2" },
          thumbnailUrl:
            "http://host.docker.internal:54321/storage/v1/object/public/project-assets/workspace-1/project-thumb-2/thumbnail.webp",
          updatedAt: "2026-04-20T07:00:00.000Z",
        },
        {
          id: "project-thumb-3",
          name: "Thumb Three",
          primaryCanvas: { id: "canvas-thumb-3" },
          thumbnailUrl:
            "http://host.docker.internal:54321/storage/v1/object/public/project-assets/workspace-1/project-thumb-3/thumbnail.webp",
          updatedAt: "2026-04-20T06:00:00.000Z",
        },
      ],
    });

    render(<HomePage />);

    await screen.findByText("Thumb One");

    const projectCards = Array.from(
      screen
        .getByTestId("home-project-grid")
        .querySelectorAll<HTMLElement>("article[data-testid^='recent-project-card-']"),
    );
    const cardTitles = projectCards
      .map((card) => card.querySelector("p")?.textContent?.trim() ?? "")
      .filter(Boolean);

    expect(cardTitles.slice(0, 5)).toEqual([
      "Thumb One",
      "Thumb Two",
      "Thumb Three",
      "Blank One",
      "Blank Two",
    ]);
  });

  it("keeps the new-project tile and existing recent-project tiles square, and exposes a delete action on existing projects", async () => {
    render(<HomePage />);

    const projectGrid = screen.getByTestId("home-project-grid");
    const newProjectTile = screen.getByRole("button", { name: "新建项目" });
    const projectTitle = await screen.findByText("Harbor Complex");
    const projectCard = projectTitle.closest("article");

    expect(projectGrid).toHaveClass("xl:grid-cols-6");
    expect(projectGrid).not.toHaveClass(
      "grid-cols-[repeat(auto-fit,minmax(220px,1fr))]",
    );
    expect(newProjectTile).toHaveClass("aspect-square");
    expect(projectCard).not.toBeNull();
    expect(projectCard).toHaveClass("aspect-square");
    expect(
      within(projectCard as HTMLElement).getByRole("button", {
        name: "删除项目 Harbor Complex",
      }),
    ).toBeInTheDocument();
  });

  it("requests deletion from the existing project-card delete action without opening the canvas", async () => {
    render(<HomePage />);

    const projectTitle = await screen.findByText("Harbor Complex");
    const projectCard = projectTitle.closest("article");

    await userEvent.click(
      within(projectCard as HTMLElement).getByRole("button", {
        name: "删除项目 Harbor Complex",
      }),
    );

    expect(requestDeleteMock).toHaveBeenCalledWith("project-1");
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("renders the white architecture home shell with site navigation, product-title h1, recent projects, and no legacy reference-case area", async () => {
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
    expect(screen.getByRole("heading", { level: 2, name: "最近项目" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /视频教程/ })).toBeInTheDocument();
    expect(screen.getByTestId("home-prompt")).toBeInTheDocument();
    expect(screen.queryByTestId("home-example-browser")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-project-limit-warning")).not.toBeInTheDocument();
  });

  it("keeps the new project card as the first recent-project entry while projects are still loading", () => {
    fetchProjectsMock.mockReturnValue(new Promise(() => {}));

    render(<HomePage />);

    expect(
      within(screen.getByTestId("home-project-grid")).getAllByRole("button")[0],
    ).toHaveTextContent("新建项目");
    expect(screen.getByTestId("home-projects-skeleton")).toBeInTheDocument();
  });

  it("keeps the home shell visible during create pending instead of switching to a full-page loading screen", async () => {
    creatingState.current = true;

    render(<HomePage />);

    expect(await screen.findByTestId("home-page-shell")).toBeInTheDocument();
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
    expect(screen.getByTestId("home-new-project-card")).toBeDisabled();
  });

  it("opens the add-project dialog shell from the new project card before any project is created", async () => {
    render(<HomePage />);

    await userEvent.click(screen.getByTestId("home-new-project-card"));

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

    await userEvent.click(screen.getByTestId("home-new-project-card"));

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

  it("caps the homepage project area at 100 cards and warns the user to delete old projects before creating more", async () => {
    fetchProjectsMock.mockResolvedValue({
      projects: Array.from({ length: 101 }, (_, index) => ({
        id: `project-${index + 1}`,
        name: `Project ${index + 1}`,
        primaryCanvas: { id: `canvas-${index + 1}` },
        thumbnailUrl:
          index % 2 === 0
            ? `http://host.docker.internal:54321/storage/v1/object/public/project-assets/workspace-1/project-${index + 1}/thumbnail.webp`
            : null,
        updatedAt: "2026-04-20T10:00:00.000Z",
      })),
    });

    render(<HomePage />);

    const warning = await screen.findByTestId("home-project-limit-warning");
    expect(warning).toHaveTextContent("100");
    expect(screen.getByTestId("home-new-project-card")).toBeDisabled();

    const grid = screen.getByTestId("home-project-grid");
    const projectCards = Array.from(
      grid.querySelectorAll<HTMLElement>("article[data-testid^='recent-project-card-']"),
    );

    expect(projectCards).toHaveLength(100);
  });
});
