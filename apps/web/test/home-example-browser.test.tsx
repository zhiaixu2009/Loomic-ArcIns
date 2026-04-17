// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomeExampleBrowser } from "@/components/home-example-browser";
import { homeExampleSeedCategories } from "@/lib/home-example-seeds";

describe("HomeExampleBrowser", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows case cards directly without the old category chip row", async () => {
    render(
      <HomeExampleBrowser
        categories={homeExampleSeedCategories}
        onExampleSelect={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("设计包豪斯风海报"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "设计创作" }),
    ).not.toBeInTheDocument();
  });

  it("localizes the visible case titles to Chinese on the home screen", async () => {
    render(
      <HomeExampleBrowser
        categories={homeExampleSeedCategories}
        onExampleSelect={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("设计像素级网页界面"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Design pixel-perfect web interface."),
    ).not.toBeInTheDocument();
  });

  it("calls onExampleSelect when a visible case card is clicked", async () => {
    const onExampleSelect = vi.fn();

    render(
      <HomeExampleBrowser
        categories={homeExampleSeedCategories}
        onExampleSelect={onExampleSelect}
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", {
        name: "设计包豪斯风海报",
      }),
    );

    expect(onExampleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryKey: expect.any(String),
        categoryLabel: expect.any(String),
        title: "Design a Bauhaus-inspired poster.",
        prompt:
          "Make a poster for a music festival in the Bauhaus style. Use a limited color palette of pink, red, and cream. Abstract geometric shapes representing sound waves. Minimalist vertical text.",
        previewImages: expect.arrayContaining([
          expect.stringContaining("supabase.co"),
        ]),
      }),
    );
  });

  it("keeps returning the picked example payload for later prompt filling", async () => {
    const onExampleSelect = vi.fn();

    render(
      <HomeExampleBrowser
        categories={homeExampleSeedCategories}
        onExampleSelect={onExampleSelect}
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", {
        name: "设计陶瓷餐具套组",
      }),
    );

    expect(onExampleSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: "Design a ceramic dinnerware set.",
        prompt:
          "Generate a set of 5 images, each a ceramic tableware piece: 1 small bowl, 1 large bowl, 1 small plate, 1 large plate, 1 mug. They belong to the same set, harmoniously blends Scandinavian minimalism and Japanese wabi-sabi aesthetics - soft neutral tones, organic textures, imperfect hand-thrown forms, subtle glaze variations, natural lighting. Each piece is photographed against a seamless white background; even studio production photography lighting.",
        previewImages: expect.arrayContaining([
          expect.stringContaining("supabase.co"),
        ]),
        inputMentions: [],
      }),
    );
  });
});
