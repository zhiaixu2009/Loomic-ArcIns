// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { PromptTemplateBrowser } from "../src/components/prompt-template-browser";
import type { OfficialPromptTemplateLibrary } from "../src/lib/prompt-template-library";

const libraryFixture: OfficialPromptTemplateLibrary = {
  topCategories: [
    {
      key: "render",
      name: "效果渲染",
      sortOrder: 1,
      templateCount: 4,
      children: [
        {
          key: "building-render",
          name: "建筑渲染",
          sortOrder: 1,
          templateCount: 2,
        },
        {
          key: "interior-render",
          name: "室内渲染",
          sortOrder: 2,
          templateCount: 2,
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
      useCount: 0,
      viewCount: 0,
      collectCount: 0,
    },
    {
      id: "render-dusk",
      title: "建筑黄昏渲染",
      promptText: "请基于当前建筑方案生成黄昏氛围效果图。",
      coverImageUrl: "https://example.com/render-dusk-cover.png",
      outputImageUrl: "https://example.com/render-dusk-output.png",
      previewImageUrls: [
        "https://example.com/render-dusk-cover.png",
        "https://example.com/render-dusk-output.png",
      ],
      referenceImageUrls: ["https://example.com/render-dusk-reference.png"],
      topCategoryKey: "render",
      topCategoryName: "效果渲染",
      leafCategoryKey: "building-render",
      leafCategoryName: "建筑渲染",
      sortOrder: 2,
      useCount: 0,
      viewCount: 0,
      collectCount: 0,
    },
    {
      id: "interior-day",
      title: "室内日景渲染",
      promptText: "请基于当前室内空间生成明亮写实效果图。",
      coverImageUrl: "https://example.com/interior-day-cover.png",
      outputImageUrl: "https://example.com/interior-day-output.png",
      previewImageUrls: [
        "https://example.com/interior-day-cover.png",
        "https://example.com/interior-day-output.png",
      ],
      referenceImageUrls: ["https://example.com/interior-day-reference.png"],
      topCategoryKey: "render",
      topCategoryName: "效果渲染",
      leafCategoryKey: "interior-render",
      leafCategoryName: "室内渲染",
      sortOrder: 3,
      useCount: 0,
      viewCount: 0,
      collectCount: 0,
    },
    {
      id: "interior-dusk",
      title: "室内黄昏渲染",
      promptText: "请基于当前室内空间生成黄昏氛围效果图。",
      coverImageUrl: "https://example.com/interior-dusk-cover.png",
      outputImageUrl: "https://example.com/interior-dusk-output.png",
      previewImageUrls: [
        "https://example.com/interior-dusk-cover.png",
        "https://example.com/interior-dusk-output.png",
      ],
      referenceImageUrls: ["https://example.com/interior-dusk-reference.png"],
      topCategoryKey: "render",
      topCategoryName: "效果渲染",
      leafCategoryKey: "interior-render",
      leafCategoryName: "室内渲染",
      sortOrder: 4,
      useCount: 0,
      viewCount: 0,
      collectCount: 0,
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
      useCount: 0,
      viewCount: 0,
      collectCount: 0,
    },
  ],
};

function PromptTemplateBrowserHarness() {
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<Set<string>>(
    () => new Set(["old-house-facade"]),
  );

  return (
    <PromptTemplateBrowser
      library={libraryFixture}
      status="ready"
      error={null}
      favoriteTemplateIds={favoriteTemplateIds}
      onToggleFavorite={(templateId) => {
        setFavoriteTemplateIds((current) => {
          const next = new Set(current);
          if (next.has(templateId)) {
            next.delete(templateId);
          } else {
            next.add(templateId);
          }
          return next;
        });
      }}
      onApplyTemplate={() => undefined}
      dataTestId="prompt-template-browser"
      layout="comfortable"
    />
  );
}

describe("PromptTemplateBrowser", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses the tighter popup geometry and denser adaptive grid required by the latest UI spec", () => {
    render(
      <PromptTemplateBrowser
        library={libraryFixture}
        status="ready"
        error={null}
        favoriteTemplateIds={new Set(["old-house-facade"])}
        onToggleFavorite={() => undefined}
        onApplyTemplate={() => undefined}
        dataTestId="prompt-template-browser"
        layout="comfortable"
      />,
    );

    const browser = screen.getByTestId("prompt-template-browser");
    const grid = within(browser).getByTestId("template-browser-card-grid");
    const detailPanel = within(browser).getByTestId("template-browser-detail-panel");
    const title = within(grid).getByText("建筑晴天渲染");
    const topCategoryList = within(browser).getByTestId(
      "template-browser-top-category-list",
    );
    const activeCategoryButton = within(topCategoryList).getByRole("button", {
      name: "效果渲染",
    });

    expect(browser).toHaveClass("rounded-[10px]");
    expect(browser).toHaveStyle({
      height: "clamp(520px, calc(100vh - 56px), 700px)",
    });
    expect(browser.firstElementChild?.nextElementSibling).toHaveClass(
      "md:grid-cols-[168px_minmax(0,1fr)]",
      "xl:grid-cols-[168px_minmax(0,1fr)_300px]",
    );
    expect(grid).toHaveClass("grid-cols-2", "lg:grid-cols-3");
    expect(detailPanel).toHaveClass("flex", "h-full", "min-h-0");
    expect(topCategoryList).toHaveClass("gap-1.5");
    expect(activeCategoryButton).toHaveClass("min-h-[44px]");
    expect(title).toHaveClass("line-clamp-2", "min-h-[2.25rem]");
  });

  it("keeps the current category and detail selection stable when a template favorite is toggled", async () => {
    render(<PromptTemplateBrowserHarness />);

    const leafTabs = screen.getByTestId("template-browser-leaf-tabs");
    await userEvent.click(within(leafTabs).getByRole("button", { name: "室内渲染" }));

    const cardGrid = screen.getByTestId("template-browser-card-grid");
    await userEvent.click(within(cardGrid).getByRole("button", { name: "室内黄昏渲染" }));

    const detailPanel = screen.getByTestId("template-browser-detail-panel");
    expect(detailPanel).toHaveTextContent("室内黄昏渲染");
    expect(
      screen.getByRole("button", { name: "效果渲染", pressed: true }),
    ).toBeInTheDocument();

    await userEvent.click(
      within(detailPanel).getByRole("button", { name: "收藏 室内黄昏渲染" }),
    );

    expect(detailPanel).toHaveTextContent("室内黄昏渲染");
    expect(
      screen.getByRole("button", { name: "效果渲染", pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "室内渲染", pressed: true }),
    ).toBeInTheDocument();
  });
});
