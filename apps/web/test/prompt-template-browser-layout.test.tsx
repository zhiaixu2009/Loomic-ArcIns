// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PromptTemplateBrowser } from "../src/components/prompt-template-browser";
import type { OfficialPromptTemplateLibrary } from "../src/lib/prompt-template-library";

const libraryFixture: OfficialPromptTemplateLibrary = {
  topCategories: [
    {
      key: "render",
      name: "Render",
      sortOrder: 1,
      templateCount: 2,
      children: [
        {
          key: "building-render",
          name: "Building render",
          sortOrder: 1,
          templateCount: 2,
        },
      ],
    },
  ],
  templates: [
    {
      id: "render-day",
      title: "Sunny render",
      promptText: "Generate a crisp daytime architectural render.",
      coverImageUrl: "https://example.com/render-day-cover.png",
      outputImageUrl: "https://example.com/render-day-output.png",
      previewImageUrls: [
        "https://example.com/render-day-cover.png",
        "https://example.com/render-day-output.png",
      ],
      referenceImageUrls: ["https://example.com/render-day-reference.png"],
      topCategoryKey: "render",
      topCategoryName: "Render",
      leafCategoryKey: "building-render",
      leafCategoryName: "Building render",
      sortOrder: 1,
      useCount: 0,
      viewCount: 0,
      collectCount: 0,
    },
    {
      id: "render-dusk",
      title: "Dusk render",
      promptText: "Generate a moody dusk architectural render.",
      coverImageUrl: "https://example.com/render-dusk-cover.png",
      outputImageUrl: "https://example.com/render-dusk-output.png",
      previewImageUrls: [
        "https://example.com/render-dusk-cover.png",
        "https://example.com/render-dusk-output.png",
      ],
      referenceImageUrls: ["https://example.com/render-dusk-reference.png"],
      topCategoryKey: "render",
      topCategoryName: "Render",
      leafCategoryKey: "building-render",
      leafCategoryName: "Building render",
      sortOrder: 2,
      useCount: 0,
      viewCount: 0,
      collectCount: 0,
    },
  ],
};

describe("PromptTemplateBrowser layout", () => {
  it("keeps card rows at max-content height so image and title remain visible together", () => {
    render(
      <PromptTemplateBrowser
        library={libraryFixture}
        status="ready"
        error={null}
        favoriteTemplateIds={new Set()}
        onToggleFavorite={() => undefined}
        onApplyTemplate={() => undefined}
        dataTestId="prompt-template-browser"
        layout="comfortable"
      />,
    );

    const browser = screen.getByTestId("prompt-template-browser");
    const grid = within(browser).getByTestId("template-browser-card-grid");
    const firstCardButton = within(grid).getByRole("button", {
      name: "Sunny render",
    });
    const firstCardShell = firstCardButton.parentElement;
    const firstCardImageWrap = firstCardButton.firstElementChild as HTMLElement | null;

    expect(grid).toHaveClass("content-start", "auto-rows-max");
    expect(firstCardShell).not.toHaveClass("overflow-hidden");
    expect(firstCardButton).toHaveClass("overflow-hidden", "rounded-[8px]");
    expect(firstCardImageWrap).toHaveClass("aspect-[21/10]");
  });
});
