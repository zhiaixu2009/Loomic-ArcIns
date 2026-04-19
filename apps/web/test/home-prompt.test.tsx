// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HomePrompt } from "../src/components/home-prompt";
import type { ImageModelPreference } from "../src/hooks/use-image-model-preference";

const {
  imageModelPreferenceState,
  setImageModelPreferenceMock,
  toggleFavoriteMock,
} = vi.hoisted(() => ({
  imageModelPreferenceState: {
    mode: "auto",
    models: [],
  } as ImageModelPreference,
  setImageModelPreferenceMock: vi.fn(),
  toggleFavoriteMock: vi.fn(),
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
    setPreference: setImageModelPreferenceMock,
  }),
}));

vi.mock("../src/hooks/use-video-model-preference", () => ({
  useVideoModelPreference: () => ({
    preference: { mode: "auto", models: [] },
  }),
}));

vi.mock("../src/components/agent-model-selector", () => ({
  AgentModelSelector: (props: { fallbackLabel?: string }) => (
    <button type="button" data-testid="agent-model-selector">
      {props.fallbackLabel ?? "智能体"}
    </button>
  ),
}));

vi.mock("../src/components/image-model-preference", () => ({
  ImageModelPreferencePopover: () => null,
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
    refresh: vi.fn(),
    toggleFavorite: toggleFavoriteMock,
  }),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe("HomePrompt", () => {
  beforeEach(() => {
    imageModelPreferenceState.mode = "auto";
    imageModelPreferenceState.models = [];
  });

  it("shows the shared home control strip with Banana Pro / 自动 | 1K / 模板 and an in-shell upload trigger", () => {
    render(<HomePrompt onSubmit={vi.fn()} />);

    expect(screen.getByTitle("上传参考图")).toBeInTheDocument();
    expect(screen.getByTestId("agent-model-selector")).toHaveTextContent(
      "Banana Pro",
    );
    expect(
      screen.getByRole("button", { name: "自动 | 1K" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "模板" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "自动" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "2K" }),
    ).not.toBeInTheDocument();

    const inputRow = screen.getByTestId("home-prompt-input-row");
    expect(
      within(inputRow).getByRole("button", { name: "上传参考图" }),
    ).toBeInTheDocument();
  });

  it("renders the home template menu from the shared official template browser", async () => {
    render(<HomePrompt onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "模板" }));

    const menu = screen.getByTestId("home-prompt-template-menu");
    const grid = within(menu).getByTestId("template-browser-card-grid");

    expect(within(menu).getByPlaceholderText("搜索模板")).toBeInTheDocument();
    expect(
      within(menu).getByTestId("template-browser-top-category-list"),
    ).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "效果渲染" })).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "旧房改造" })).toBeInTheDocument();
    expect(
      within(grid).getByRole("button", { name: "建筑晴天渲染" }),
    ).toBeInTheDocument();
    expect(
      within(grid).queryByRole("button", { name: "旧房立面改造" }),
    ).not.toBeInTheDocument();

    await userEvent.click(within(menu).getByRole("button", { name: "旧房改造" }));

    expect(
      within(grid).getByRole("button", { name: "旧房立面改造" }),
    ).toBeInTheDocument();
    expect(
      within(grid).queryByRole("button", { name: "建筑晴天渲染" }),
    ).not.toBeInTheDocument();
  });

  it("filters the home template browser through the shared search input", async () => {
    render(<HomePrompt onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "模板" }));

    const menu = screen.getByTestId("home-prompt-template-menu");
    const grid = within(menu).getByTestId("template-browser-card-grid");
    await userEvent.type(within(menu).getByPlaceholderText("搜索模板"), "旧房");

    expect(
      within(grid).getByRole("button", { name: "旧房立面改造" }),
    ).toBeInTheDocument();
    expect(
      within(grid).queryByRole("button", { name: "建筑晴天渲染" }),
    ).not.toBeInTheDocument();
  });

  it("injects the selected home template prompt and resets the image model to Banana Pro", async () => {
    imageModelPreferenceState.mode = "manual";
    imageModelPreferenceState.models = ["google/nano-banana-2"];

    render(<HomePrompt onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "模板" }));
    const menu = screen.getByTestId("home-prompt-template-menu");
    await userEvent.type(within(menu).getByPlaceholderText("搜索模板"), "旧房");
    await userEvent.click(within(menu).getByRole("button", { name: "旧房立面改造" }));
    await userEvent.click(within(menu).getByRole("button", { name: "使用模板" }));

    expect(
      screen.getByPlaceholderText("添加图片输入文案开始创作之旅..."),
    ).toHaveValue(
      "请基于当前旧房照片生成建筑立面改造方案。",
    );
    expect(setImageModelPreferenceMock).toHaveBeenCalledWith({
      mode: "manual",
      models: ["google/nano-banana-pro"],
    });
  });

  it("keeps uploaded reference thumbnails inside the home input row, prefers persisted urls, and hides rail scrollbars", () => {
    render(
      <HomePrompt
        onSubmit={vi.fn()}
        attachments={[
          {
            id: "attachment-1",
            preview: "blob:stale-preview",
            uploading: false,
            assetId: "asset-1",
            url: "https://example.com/persisted-reference.png",
            mimeType: "image/png",
            source: "upload",
            name: "参考图 1",
          },
        ]}
        onRemoveAttachment={vi.fn()}
      />,
    );

    const inputRow = screen.getByTestId("home-prompt-input-row");
    const attachmentImage = within(inputRow).getByAltText("参考图 1");
    expect(attachmentImage).toBeInTheDocument();
    expect(attachmentImage).toHaveAttribute(
      "src",
      "https://example.com/persisted-reference.png",
    );
    expect(
      within(inputRow).getByRole("button", { name: "上传参考图" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("home-prompt-attachment-rail")).toHaveStyle({
      scrollbarWidth: "none",
    });
  });
});
