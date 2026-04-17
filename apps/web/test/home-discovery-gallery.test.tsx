// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomeDiscoveryGallery } from "@/components/home-discovery-gallery";
import { homeDiscoverySeedCategories } from "@/lib/home-discovery-seeds";

describe("HomeDiscoveryGallery", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows all discovery cards by default", () => {
    render(
      <HomeDiscoveryGallery
        categories={homeDiscoverySeedCategories}
        onCaseSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("\u7075\u611f\u53d1\u73b0")).toBeInTheDocument();
    expect(
      screen.getByText(
        "\u70b9\u51fb\u5361\u7247\u540e\u4f1a\u76f4\u63a5\u6309\u8fd9\u6761\u6848\u4f8b\u601d\u8def\u65b0\u5efa Loomic \u9879\u76ee\uff0c\u5e76\u8fdb\u5165\u667a\u80fd\u4f53\u5bf9\u8bdd\u6d41\u3002",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "\u6587\u5316\u827a\u672f\u4e2d\u5fc3\u54c1\u724c\u63d0\u6848" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "\u590d\u53e4\u6c7d\u8f66\u6d77\u62a5\u4f01\u5212" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "\u732b\u7cfb\u5854\u7f57\u724c\u63d2\u753b\u96c6" }),
    ).toBeInTheDocument();
  });

  it("filters cards when a category tab is selected", async () => {
    render(
      <HomeDiscoveryGallery
        categories={homeDiscoverySeedCategories}
        onCaseSelect={vi.fn()}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "\u54c1\u724c\u8bbe\u8ba1" }),
    );

    expect(
      screen.getByRole("button", { name: "\u6587\u5316\u827a\u672f\u4e2d\u5fc3\u54c1\u724c\u63d0\u6848" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "\u590d\u53e4\u6c7d\u8f66\u6d77\u62a5\u4f01\u5212" }),
    ).not.toBeInTheDocument();
  });

  it("emits the internal Loomic seed payload when a card is clicked", async () => {
    const onCaseSelect = vi.fn();

    render(
      <HomeDiscoveryGallery
        categories={homeDiscoverySeedCategories}
        onCaseSelect={onCaseSelect}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "\u6587\u5316\u827a\u672f\u4e2d\u5fc3\u54c1\u724c\u63d0\u6848" }),
    );

    expect(onCaseSelect).toHaveBeenCalledWith({
      authorAvatarUrl:
        "https://jmcrxgenontlkxktpihl.supabase.co/storage/v1/object/public/project-assets/home-seeds/discovery/avatars/branding-design.svg",
      authorName: "Studio Arken",
      categoryKey: "branding-design",
      categoryLabel: "\u54c1\u724c\u8bbe\u8ba1",
      coverImageUrl:
        "https://jmcrxgenontlkxktpihl.supabase.co/storage/v1/object/public/project-assets/home-seeds/discovery/branding-design/cover.webp",
      id: "ji5ey5l",
      likeCount: 7,
      prompt:
        "\u8bf7\u57fa\u4e8e ART & Cultural Arts Center \u8fd9\u4e2a\u7075\u611f\u65b9\u5411\uff0c\u4e3a\u6211\u505a\u4e00\u5957\u6587\u5316\u827a\u672f\u4e2d\u5fc3\u54c1\u724c\u63a2\u7d22\u3002\u8f93\u51fa\u54c1\u724c\u5173\u952e\u8bcd\u3001\u4e3b\u89c6\u89c9\u65b9\u5411\u3001\u6d77\u62a5\u5ef6\u5c55\u548c\u793e\u4ea4\u5a92\u4f53\u89c6\u89c9\u63d0\u6848\uff0c\u6574\u4f53\u6c14\u8d28\u8981\u73b0\u4ee3\u3001\u6587\u5316\u611f\u5f3a\u3001\u9002\u5408\u827a\u672f\u6d3b\u52a8\u4f20\u64ad\u3002",
      title: "\u6587\u5316\u827a\u672f\u4e2d\u5fc3\u54c1\u724c\u63d0\u6848",
      viewCount: 549,
    });
  });
});
