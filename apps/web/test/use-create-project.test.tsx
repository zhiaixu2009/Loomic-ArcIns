// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createProjectMock,
  errorToastMock,
  pushMock,
  replaceMock,
  signOutMock,
  warmCanvasExperienceMock,
} = vi.hoisted(() => ({
  createProjectMock: vi.fn(),
  errorToastMock: vi.fn(),
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  signOutMock: vi.fn(),
  warmCanvasExperienceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}));

vi.mock("../src/lib/auth-context", () => ({
  useAuth: () => ({
    session: { access_token: "token-home" },
    signOut: signOutMock,
  }),
}));

vi.mock("../src/components/toast", () => ({
  useToast: () => ({
    error: errorToastMock,
  }),
}));

vi.mock("../src/lib/server-api", async () => {
  const actual = await vi.importActual("../src/lib/server-api");
  return {
    ...actual,
    createProject: createProjectMock,
  };
});

vi.mock("../src/lib/canvas-experience-warmup", () => ({
  warmCanvasExperience: warmCanvasExperienceMock,
}));

import { useCreateProject } from "../src/hooks/use-create-project";
import { UNTITLED_PROJECT_NAME } from "../src/lib/canvas-localization";
import {
  CREATE_PROJECT_LAUNCH_ID_KEY,
  CREATE_PROJECT_REQUEST_STARTED_AT_KEY,
  LOADING_PREVIEW_OPENED_AT_KEY,
} from "../src/lib/project-creation-timing";

function createOpenedTabDouble() {
  const location = {
    href: "",
    replace: vi.fn((nextHref: string) => {
      location.href = nextHref;
    }),
  };

  return {
    document: {
      close: vi.fn(),
      write: vi.fn(),
    },
    history: {
      replaceState: vi.fn(),
    },
    location,
    close: vi.fn(),
  };
}

describe("useCreateProject", () => {
  beforeEach(() => {
    createProjectMock.mockReset();
    errorToastMock.mockReset();
    pushMock.mockReset();
    replaceMock.mockReset();
    signOutMock.mockReset();
    sessionStorage.clear();

    createProjectMock.mockResolvedValue({
      project: {
        id: "project-1",
        primaryCanvas: { id: "canvas-1" },
      },
    });
  });

  it("creates a new project with the localized default title", async () => {
    const openedTab = createOpenedTabDouble();
    vi.spyOn(window, "open").mockReturnValue(openedTab as unknown as Window);

    const { result } = renderHook(() => useCreateProject());

    await act(async () => {
      await result.current.create();
    });

    expect(window.open).toHaveBeenCalledWith("", "_blank");
    expect(openedTab.document.write).toHaveBeenCalledTimes(1);
    expect(openedTab.document.close).toHaveBeenCalledTimes(1);
    expect(openedTab.history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/loading-preview",
    );
    expect(warmCanvasExperienceMock).toHaveBeenCalledTimes(1);
    expect(createProjectMock).toHaveBeenCalledWith("token-home", {
      name: UNTITLED_PROJECT_NAME,
    });
    expect(Number(sessionStorage.getItem(CREATE_PROJECT_REQUEST_STARTED_AT_KEY))).toBeGreaterThan(0);
    expect(Number(sessionStorage.getItem(LOADING_PREVIEW_OPENED_AT_KEY))).toBeGreaterThan(0);
    expect(sessionStorage.getItem(CREATE_PROJECT_LAUNCH_ID_KEY)).toBeTruthy();
    expect(openedTab.location.replace).toHaveBeenCalledTimes(1);
    expect(openedTab.location.href).toContain("/canvas?id=canvas-1");
    expect(openedTab.location.href).toContain("studio=architecture");
  });

  it("passes the custom project name through to the create-project API", async () => {
    const openedTab = createOpenedTabDouble();
    vi.spyOn(window, "open").mockReturnValue(openedTab as unknown as Window);

    const { result } = renderHook(() => useCreateProject());

    await act(async () => {
      await result.current.create({ name: "Client HQ", studioMode: "architecture" });
    });

    expect(createProjectMock).toHaveBeenCalledWith("token-home", {
      name: "Client HQ",
    });
    expect(openedTab.location.href).toContain("/canvas?id=canvas-1");
    expect(openedTab.location.href).toContain("studio=architecture");
  });
});
