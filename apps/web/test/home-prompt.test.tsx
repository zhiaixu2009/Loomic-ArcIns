// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HomePrompt } from "../src/components/home-prompt";

const {
  imageModelPreferenceState,
  setImageModelPreferenceMock,
} = vi.hoisted(() => ({
  imageModelPreferenceState: { mode: "auto" as const, models: [] as string[] },
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

  it("shows the home prompt control strip with split 自动 / 1K buttons and an in-shell upload trigger", () => {
    render(<HomePrompt onSubmit={vi.fn()} />);

    expect(screen.getByTitle("上传参考图")).toBeInTheDocument();
    expect(screen.getByTestId("agent-model-selector")).toHaveTextContent(
      "Banana Pro",
    );
    expect(
      screen.getByRole("button", { name: "自动" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1K" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "模版" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "自动 1K" }),
    ).not.toBeInTheDocument();

    const inputRow = screen.getByTestId("home-prompt-input-row");
    expect(
      within(inputRow).getByRole("button", { name: "上传参考图" }),
    ).toBeInTheDocument();
  });

  it("injects a home template prompt into the textarea", async () => {
    imageModelPreferenceState.mode = "manual";
    imageModelPreferenceState.models = ["google/nano-banana-2"];

    render(<HomePrompt onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "模版" }));
    await userEvent.click(
      screen.getByRole("button", { name: "场地分析框架" }),
    );

    expect(
      screen.getByPlaceholderText("添加图片输入文案开始创作之旅..."),
    ).toHaveValue(
      "请围绕当前项目整理场地关系、动线、视线与功能分区，输出一份可以直接进入无限画布的场地分析框架。",
    );
    expect(setImageModelPreferenceMock).toHaveBeenCalledWith({
      mode: "manual",
      models: ["google/nano-banana-pro"],
    });
  });
});
