// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchModelsMock,
  imageModelPreferenceState,
  setModelMock,
} = vi.hoisted(() => ({
  fetchModelsMock: vi.fn(),
  imageModelPreferenceState: { mode: "auto" as const, models: [] as string[] },
  setModelMock: vi.fn(),
}));

vi.mock("../src/hooks/use-agent-model", () => ({
  useAgentModel: () => ({
    model: null,
    setModel: setModelMock,
  }),
}));

vi.mock("../src/lib/server-api", () => ({
  fetchModels: fetchModelsMock,
}));

vi.mock("../src/hooks/use-image-model-preference", () => ({
  useImageModelPreference: () => ({
    preference: imageModelPreferenceState,
  }),
}));

vi.mock("../src/components/image-model-preference", () => ({
  ImageModelPreferencePopover: ({
    open,
  }: {
    open: boolean;
  }) => (open ? <div>图片模型弹层</div> : null),
}));

import { AgentModelSelector } from "../src/components/agent-model-selector";

describe("AgentModelSelector", () => {
  beforeEach(() => {
    fetchModelsMock.mockReset();
    setModelMock.mockReset();
    imageModelPreferenceState.mode = "auto";
    imageModelPreferenceState.models = [];
    fetchModelsMock.mockResolvedValue({
      models: [{ id: "gpt-5", name: "GPT-5", provider: "openai" }],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders Chinese trigger and menu copy for the default auto mode", async () => {
    render(<AgentModelSelector />);

    await userEvent.click(screen.getByRole("button", { name: /智能体/i }));

    expect(await screen.findByText("智能体模型")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "自动（跟随工作区默认）" }),
    ).toBeInTheDocument();
  });

  it("uses the image-model preference label when the architecture chip binds to image generation state", async () => {
    imageModelPreferenceState.mode = "manual";
    imageModelPreferenceState.models = ["google/nano-banana-2"];

    render(
      <AgentModelSelector source="image" fallbackLabel="Banana Pro" />,
    );

    expect(screen.getByRole("button", { name: "Banana2" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Banana2" }));

    expect(screen.getByText("图片模型弹层")).toBeInTheDocument();
  });
});
