// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  createProjectMock,
  openProjectLibraryMock,
  routerPushMock,
} = vi.hoisted(() => ({
  createProjectMock: vi.fn(),
  openProjectLibraryMock: vi.fn(),
  routerPushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock("../src/hooks/use-create-project", () => ({
  useCreateProject: () => ({
    create: createProjectMock,
  }),
}));

vi.mock("../src/components/toast", () => ({
  useToast: () => ({
    error: vi.fn(),
  }),
}));

vi.mock("../src/lib/server-api", () => ({
  deleteProject: vi.fn(),
}));

vi.mock("../src/components/project-library-provider", () => ({
  useProjectLibrary: () => ({
    openProjectLibrary: openProjectLibraryMock,
  }),
}));

vi.mock("../src/components/icons/loomic-logo", () => ({
  LoomicLogo: () => <span>L</span>,
}));

vi.mock("../src/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuTrigger: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuGroup: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />,
  DropdownMenuShortcut: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  DropdownMenuItem: ({
    children,
    onClick,
    onSelect,
  }: React.PropsWithChildren<{
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onSelect?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  }>) => (
    <button
      type="button"
      onClick={(event) => {
        onSelect?.(event);
        onClick?.(event);
      }}
    >
      {children}
    </button>
  ),
}));

import { CanvasLogoMenu } from "../src/components/canvas-logo-menu";

describe("CanvasLogoMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("flushes pending canvas changes and routes home from the 主页 menu item", async () => {
    const onBeforeNavigate = vi.fn().mockResolvedValue(undefined);

    render(
      <CanvasLogoMenu
        accessToken="token"
        projectId="project-1"
        canvasId="canvas-1"
        excalidrawApi={null}
        onBeforeNavigate={onBeforeNavigate}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "主页" }));

    await waitFor(() => {
      expect(onBeforeNavigate).toHaveBeenCalledTimes(1);
    });
    expect(routerPushMock).toHaveBeenCalledWith("/home");
  });

  it("still routes home when canvas flush never settles", async () => {
    vi.useFakeTimers();
    const onBeforeNavigate = vi.fn(
      () => new Promise<void>(() => undefined),
    );

    render(
      <CanvasLogoMenu
        accessToken="token"
        projectId="project-1"
        canvasId="canvas-1"
        excalidrawApi={null}
        onBeforeNavigate={onBeforeNavigate}
      />,
    );

    await act(async () => {
      screen.getByRole("button", { name: "主页" }).click();
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(onBeforeNavigate).toHaveBeenCalledTimes(1);
    expect(routerPushMock).toHaveBeenCalledWith("/home");
  });

  it("opens the standalone 项目库 dialog instead of routing to /projects", async () => {
    render(
      <CanvasLogoMenu
        accessToken="token"
        projectId="project-1"
        canvasId="canvas-1"
        excalidrawApi={null}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "项目库" }));

    expect(openProjectLibraryMock).toHaveBeenCalledTimes(1);
    expect(routerPushMock).not.toHaveBeenCalledWith("/projects");
  });
});
