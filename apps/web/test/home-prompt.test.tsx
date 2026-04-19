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
} = vi.hoisted(() => ({
  imageModelPreferenceState: {
    mode: "auto",
    models: [],
  } as ImageModelPreference,
  setImageModelPreferenceMock: vi.fn(),
}));

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

  it("renders the home template menu as an architecture browser without generic wrappers", async () => {
    render(<HomePrompt onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "模板" }));

    const menu = screen.getByTestId("home-prompt-template-menu");
    const grid = within(menu).getByTestId("template-browser-item-grid");

    expect(within(menu).getByPlaceholderText("搜索")).toBeInTheDocument();
    expect(
      within(menu).getByTestId("template-browser-category-list"),
    ).toBeInTheDocument();
    expect(
      within(menu).queryByRole("button", { name: "全部" }),
    ).not.toBeInTheDocument();
    expect(
      within(menu).queryByRole("button", { name: "热度" }),
    ).not.toBeInTheDocument();
    expect(
      within(menu).queryByRole("button", { name: "最新" }),
    ).not.toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "效果渲染" })).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "总平填色" })).toBeInTheDocument();
    expect(
      within(grid).getByRole("button", { name: "建筑晴天渲染" }),
    ).toBeInTheDocument();
    expect(
      within(grid).queryByRole("button", { name: "建筑平面清新填色" }),
    ).not.toBeInTheDocument();

    await userEvent.click(within(menu).getByRole("button", { name: "总平填色" }));

    expect(
      within(grid).getByRole("button", { name: "建筑平面清新填色" }),
    ).toBeInTheDocument();
    expect(
      within(grid).queryByRole("button", { name: "建筑晴天渲染" }),
    ).not.toBeInTheDocument();
  });

  it("filters the home template browser through the live-style search input", async () => {
    render(<HomePrompt onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "模板" }));

    const menu = screen.getByTestId("home-prompt-template-menu");
    const grid = within(menu).getByTestId("template-browser-item-grid");

    await userEvent.click(within(menu).getByRole("button", { name: "分析图" }));
    await userEvent.type(within(menu).getByPlaceholderText("搜索"), "基地");

    expect(
      within(grid).getByRole("button", { name: "基地现状分析" }),
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
    await userEvent.click(screen.getByRole("button", { name: "分析图" }));
    await userEvent.click(screen.getByRole("button", { name: "基地现状分析" }));

    expect(
      screen.getByPlaceholderText("添加图片输入文案开始创作之旅..."),
    ).toHaveValue(
      "请基于当前场地现状资料，整理基地边界、周边关系、交通动线、视线资源与场地限制，输出一份可直接进入无限画布的现状分析提示。",
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
