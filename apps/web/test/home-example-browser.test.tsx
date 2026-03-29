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

  it("expands design examples after clicking the Design chip", async () => {
    render(
      <HomeExampleBrowser
        categories={homeExampleSeedCategories}
        onExampleSelect={vi.fn()}
      />,
    );

    expect(
      screen.queryByText("Design a Bauhaus-inspired poster."),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Design" }));

    expect(
      await screen.findByText("Design a Bauhaus-inspired poster."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Brainstorm beautiful interiors."),
    ).toBeInTheDocument();
  });

  it("auto-selects the first example when a category chip is clicked", async () => {
    const onExampleSelect = vi.fn();

    render(
      <HomeExampleBrowser
        categories={homeExampleSeedCategories}
        onExampleSelect={onExampleSelect}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Design" }));

    expect(onExampleSelect).toHaveBeenCalledWith({
      categoryKey: "design",
      categoryLabel: "Design",
      title: "Design a Bauhaus-inspired poster.",
      prompt:
        "Nano Banana Make a poster for a music festival in the Bauhaus style. Use a limited color palette of pink, red, and cream. Abstract geometric shapes representing sound waves. Minimalist vertical text.",
      images: [
        "https://a.lovart.ai/artifacts/agent/K0m2ODcBB2SX6wT9.png?x-oss-process=image/resize,w_200,m_lfit/format,webp",
        "https://a.lovart.ai/artifacts/agent/XlTxECjJUyepQFco.png?x-oss-process=image/resize,w_200,m_lfit/format,webp",
        "https://a.lovart.ai/artifacts/agent/ivFCPIXpvf9A6nHD.png?x-oss-process=image/resize,w_200,m_lfit/format,webp",
      ],
    });
  });

  it("calls onExampleSelect with the picked example payload", async () => {
    const onExampleSelect = vi.fn();

    render(
      <HomeExampleBrowser
        categories={homeExampleSeedCategories}
        onExampleSelect={onExampleSelect}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Design" }));
    await userEvent.click(
      await screen.findByRole("button", {
        name: /Design a ceramic dinnerware set\./i,
      }),
    );

    expect(onExampleSelect).toHaveBeenLastCalledWith({
      categoryKey: "design",
      categoryLabel: "Design",
      title: "Design a ceramic dinnerware set.",
      prompt:
        "Generate a set of 5 images, each a ceramic tableware piece: 1 small bowl, 1 large bowl, 1 small plate, 1 large plate, 1 mug. They belong to the same set, harmoniously blends Scandinavian minimalism and Japanese wabi-sabi aesthetics - soft neutral tones, organic textures, imperfect hand-thrown forms, subtle glaze variations, natural lighting. Each piece is photographed against a seamless white background; even studio production photography lighting.",
      images: [
        "https://a.lovart.ai/artifacts/agent/f8qarZSaklJXPt2U.png?x-oss-process=image/resize,w_200,m_lfit/format,webp",
        "https://a.lovart.ai/artifacts/agent/wkuQnEx8Ih8msjvh.png?x-oss-process=image/resize,w_200,m_lfit/format,webp",
        "https://a.lovart.ai/artifacts/agent/Wzf1CrglDuBKryQ7.png?x-oss-process=image/resize,w_200,m_lfit/format,webp",
      ],
    });
  });
});
