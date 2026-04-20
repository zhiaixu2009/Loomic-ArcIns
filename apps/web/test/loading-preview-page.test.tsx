// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prefetchMock } = vi.hoisted(() => ({
  prefetchMock: vi.fn(),
}));

const { warmCanvasExperienceMock } = vi.hoisted(() => ({
  warmCanvasExperienceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    prefetch: prefetchMock,
  }),
}));

vi.mock("../src/components/loading-screen", () => ({
  LoadingScreen: () => <div>Loading</div>,
}));

vi.mock("../src/lib/canvas-experience-warmup", () => ({
  warmCanvasExperience: (...args: Parameters<typeof warmCanvasExperienceMock>) => {
    const [router] = args;
    router?.prefetch?.("/canvas");
    return warmCanvasExperienceMock(...args);
  },
}));

import LoadingPreviewPage from "../src/app/loading-preview/page";
import { LOADING_PREVIEW_OPENED_AT_KEY } from "../src/lib/project-creation-timing";

describe("LoadingPreviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("prefetches the canvas route and records when the preheat page was opened", async () => {
    render(<LoadingPreviewPage />);

    expect(screen.getByText("Loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(prefetchMock).toHaveBeenCalledWith("/canvas");
    });

    expect(warmCanvasExperienceMock).toHaveBeenCalledTimes(1);

    expect(Number(sessionStorage.getItem(LOADING_PREVIEW_OPENED_AT_KEY))).toBeGreaterThan(0);
  });
});
