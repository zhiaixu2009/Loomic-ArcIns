// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArchitectureChatControls } from "../src/components/architecture-chat-controls";
import type { ImageModelPreference } from "../src/hooks/use-image-model-preference";

const {
  imageModelPreferenceState,
  toggleFavoriteMock,
  refreshLibraryMock,
} = vi.hoisted(() => ({
  imageModelPreferenceState: {
    mode: "auto",
    models: [],
  } as ImageModelPreference,
  toggleFavoriteMock: vi.fn(),
  refreshLibraryMock: vi.fn(),
}));

const officialLibraryFixture = {
  topCategories: [
    {
      key: "render",
      name: "效果渲染",
      sortOrder: 1,
      templateCount: 2,
      children: [
        {
          key: "building-render",
          name: "建筑渲染",
          sortOrder: 1,
          templateCount: 1,
        },
        {
          key: "interior-render",
          name: "室内渲染",
          sortOrder: 2,
          templateCount: 1,
        },
      ],
    },
    {
      key: "old-house",
      name: "旧房改造",
      sortOrder: 2,
      templateCount: 1,
      children: [],
    },
  ],
  templates: [
    {
      id: "render-day",
      title: "建筑晴天渲染",
      promptText: "请基于当前建筑方案生成晴天写实效果图。",
      coverImageUrl: "https://example.com/render-day-cover.png",
      outputImageUrl: "https://example.com/render-day-output.png",
      previewImageUrls: [
        "https://example.com/render-day-cover.png",
        "https://example.com/render-day-output.png",
      ],
      referenceImageUrls: ["https://example.com/render-day-reference.png"],
      topCategoryKey: "render",
      topCategoryName: "效果渲染",
      leafCategoryKey: "building-render",
      leafCategoryName: "建筑渲染",
      sortOrder: 1,
    },
    {
      id: "render-interior",
      title: "室内黄昏渲染",
      promptText: "请基于当前室内空间生成黄昏氛围效果图。",
      coverImageUrl: "https://example.com/render-interior-cover.png",
      outputImageUrl: "https://example.com/render-interior-output.png",
      previewImageUrls: [
        "https://example.com/render-interior-cover.png",
        "https://example.com/render-interior-output.png",
      ],
      referenceImageUrls: ["https://example.com/render-interior-reference.png"],
      topCategoryKey: "render",
      topCategoryName: "效果渲染",
      leafCategoryKey: "interior-render",
      leafCategoryName: "室内渲染",
      sortOrder: 2,
    },
    {
      id: "old-house-facade",
      title: "旧房立面改造",
      promptText: "请基于当前旧房照片生成建筑立面改造方案。",
      coverImageUrl: "https://example.com/old-house-cover.png",
      outputImageUrl: "https://example.com/old-house-output.png",
      previewImageUrls: [
        "https://example.com/old-house-cover.png",
        "https://example.com/old-house-output.png",
      ],
      referenceImageUrls: ["https://example.com/old-house-reference.png"],
      topCategoryKey: "old-house",
      topCategoryName: "旧房改造",
      leafCategoryKey: "old-house",
      leafCategoryName: "旧房改造",
      sortOrder: 1,
    },
  ],
};

vi.mock("../src/hooks/use-image-model-preference", () => ({
  useImageModelPreference: () => ({
    preference: imageModelPreferenceState,
    setPreference: vi.fn(),
  }),
}));

vi.mock("../src/components/agent-model-selector", () => ({
  AgentModelSelector: (props: { fallbackLabel?: string }) => (
    <button type="button" data-testid="agent-model-selector">
      {props.fallbackLabel ?? "智能体"}
    </button>
  ),
}));

vi.mock("../src/hooks/use-official-prompt-template-library", () => ({
  useOfficialPromptTemplateLibrary: () => ({
    status: "ready",
    library: officialLibraryFixture,
    favoriteTemplateIds: new Set(["old-house-facade"]),
    favoritePendingIds: new Set(),
    isAuthenticated: true,
    authLoading: false,
    error: null,
    refresh: refreshLibraryMock,
    toggleFavorite: toggleFavoriteMock,
  }),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe("ArchitectureChatControls", () => {
  beforeEach(() => {
    imageModelPreferenceState.mode = "auto";
    imageModelPreferenceState.models = [];
  });

  it("renders the shared three-button strip and persists the combined output choice", async () => {
    render(
      <ArchitectureChatControls
        preset="home"
        onApplyTemplate={vi.fn()}
        outputMenuTestId="architecture-controls-output-menu"
      />,
    );

    expect(screen.getByTestId("agent-model-selector")).toHaveTextContent(
      "Banana Pro",
    );
    expect(
      screen.getByRole("button", { name: "自动 | 1K" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "模板" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "自动 | 1K" }));

    const outputMenu = screen.getByTestId("architecture-controls-output-menu");
    await userEvent.click(within(outputMenu).getByRole("button", { name: "16:9" }));
    await userEvent.click(within(outputMenu).getByRole("button", { name: "4K" }));

    expect(
      screen.getByRole("button", { name: "16:9 | 4K" }),
    ).toBeInTheDocument();
  });

  it("renders the official template browser with top categories, leaf tabs, details, favorites, and search", async () => {
    render(
      <ArchitectureChatControls
        preset="sidebar"
        onApplyTemplate={vi.fn()}
        templateMenuTestId="architecture-controls-template-menu"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "模板" }));

    const menu = screen.getByTestId("architecture-controls-template-menu");
    expect(within(menu).getByPlaceholderText("搜索模板")).toBeInTheDocument();
    expect(
      within(menu).getByTestId("template-browser-top-category-list"),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("button", { name: "效果渲染" }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("button", { name: "旧房改造" }),
    ).toBeInTheDocument();

    expect(
      within(menu).getByRole("button", { name: "建筑渲染" }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("button", { name: "室内渲染" }),
    ).toBeInTheDocument();
    expect(
      within(menu).queryByRole("button", { name: "旧房改造", pressed: true }),
    ).not.toBeInTheDocument();

    await userEvent.click(within(menu).getByRole("button", { name: "室内渲染" }));
    expect(
      within(menu).getByRole("button", { name: "室内黄昏渲染" }),
    ).toBeInTheDocument();
    expect(
      within(menu).queryByRole("button", { name: "建筑晴天渲染" }),
    ).not.toBeInTheDocument();

    expect(
      within(menu).getByTestId("template-browser-detail-panel"),
    ).toHaveTextContent("室内黄昏渲染");
    expect(
      within(menu).getByAltText("室内黄昏渲染 预览图 1"),
    ).toBeInTheDocument();

    await userEvent.type(within(menu).getByPlaceholderText("搜索模板"), "旧房");
    expect(
      within(menu).getByRole("button", { name: "旧房立面改造" }),
    ).toBeInTheDocument();
    expect(
      within(menu).queryByRole("button", { name: "室内黄昏渲染" }),
    ).not.toBeInTheDocument();

    await userEvent.click(within(menu).getByRole("button", { name: "收藏" }));
    expect(
      within(menu).getByRole("button", { name: "旧房立面改造" }),
    ).toBeInTheDocument();
    expect(
      within(menu).queryByRole("button", { name: "建筑晴天渲染" }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      within(
        within(menu).getByTestId("template-browser-detail-panel"),
      ).getByRole("button", { name: "取消收藏 旧房立面改造" }),
    );
    expect(toggleFavoriteMock).toHaveBeenCalledWith("old-house-facade");
  });

  it("applies the selected official template from the detail panel", async () => {
    const onApplyTemplate = vi.fn();

    render(
      <ArchitectureChatControls
        preset="home"
        onApplyTemplate={onApplyTemplate}
        templateMenuTestId="architecture-controls-template-menu"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "模板" }));

    const menu = screen.getByTestId("architecture-controls-template-menu");
    await userEvent.type(within(menu).getByPlaceholderText("搜索模板"), "旧房");
    await userEvent.click(within(menu).getByRole("button", { name: "旧房立面改造" }));
    await userEvent.click(within(menu).getByRole("button", { name: "使用模板" }));

    expect(onApplyTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "old-house-facade",
        label: "旧房立面改造",
        prompt: "请基于当前旧房照片生成建筑立面改造方案。",
        categoryId: "old-house",
        categoryLabel: "旧房改造",
      }),
    );
  });

  it("sizes the shared template popup adaptively for common viewport sizes", async () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function mockRect(this: HTMLElement) {
        if (this.getAttribute("aria-label") === "模板") {
          return {
            x: 240,
            y: 620,
            width: 72,
            height: 32,
            top: 620,
            right: 312,
            bottom: 652,
            left: 240,
            toJSON: () => ({}),
          } as DOMRect;
        }

        return {
          x: 0,
          y: 0,
          width: 120,
          height: 40,
          top: 0,
          right: 120,
          bottom: 40,
          left: 0,
          toJSON: () => ({}),
        } as DOMRect;
      });

    try {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: 1366,
      });
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: 720,
      });

      const firstRender = render(
        <ArchitectureChatControls
          preset="home"
          onApplyTemplate={vi.fn()}
          templateMenuTestId="architecture-controls-template-menu"
        />,
      );

      await userEvent.click(screen.getByRole("button", { name: "模板" }));

      await waitFor(() => {
        const menu = screen.getByTestId("architecture-controls-template-menu");
        const portal = menu.parentElement as HTMLElement | null;
        expect(portal).not.toBeNull();
        expect(portal?.style.width).toBe("1065px");
        expect(menu).toHaveStyle({ height: "664px" });
      });

      firstRender.unmount();

      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: 1920,
      });
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: 900,
      });

      render(
        <ArchitectureChatControls
          preset="home"
          onApplyTemplate={vi.fn()}
          templateMenuTestId="architecture-controls-template-menu"
        />,
      );

      await userEvent.click(screen.getByRole("button", { name: "模板" }));

      await waitFor(() => {
        const menu = screen.getByTestId("architecture-controls-template-menu");
        const portal = menu.parentElement as HTMLElement | null;
        expect(portal).not.toBeNull();
        expect(portal?.style.width).toBe("1120px");
        expect(menu).toHaveStyle({ height: "700px" });
      });
    } finally {
      rectSpy.mockRestore();
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalInnerWidth,
      });
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: originalInnerHeight,
      });
    }
  });
});
