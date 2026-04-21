// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HomeProjectsSkeleton } from "../src/components/skeletons/home-skeleton";

describe("HomeProjectsSkeleton", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps the homepage loading placeholders square to avoid first-render layout shifts", () => {
    render(<HomeProjectsSkeleton includeNewProjectPlaceholder projectCount={3} />);

    expect(screen.getByTestId("home-project-skeleton-new")).toHaveClass(
      "aspect-square",
    );

    const cards = [
      screen.getByTestId("home-project-skeleton-card-0"),
      screen.getByTestId("home-project-skeleton-card-1"),
      screen.getByTestId("home-project-skeleton-card-2"),
    ];

    cards.forEach((card) => {
      expect(card).toHaveClass("aspect-square");
    });
  });
});
