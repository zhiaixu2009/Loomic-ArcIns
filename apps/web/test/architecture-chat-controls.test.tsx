// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArchitectureChatControls } from "../src/components/architecture-chat-controls";
import {
  ARCHITECTURE_PROMPT_TEMPLATE_CATEGORIES,
  flattenArchitecturePromptTemplates,
} from "../src/lib/architecture-prompt-templates";
import type { ImageModelPreference } from "../src/hooks/use-image-model-preference";

const {
  imageModelPreferenceState,
} = vi.hoisted(() => ({
  imageModelPreferenceState: {
    mode: "auto",
    models: [],
  } as ImageModelPreference,
}));

vi.mock("../src/hooks/use-image-model-preference", () => ({
  useImageModelPreference: () => ({
    preference: imageModelPreferenceState,
    setPreference: vi.fn(),
  }),
}));

vi.mock("../src/components/agent-model-selector", () => ({
  AgentModelSelector: (props: { fallbackLabel?: string }) => (
    <button type="button" data-testid="agent-model-selector">
      {props.fallbackLabel ?? "智能体"}
    </button>
  ),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe("ArchitectureChatControls", () => {
  beforeEach(() => {
    imageModelPreferenceState.mode = "auto";
    imageModelPreferenceState.models = [];
  });

  it("renders the shared three-button strip and persists the combined output choice", async () => {
    render(
      <ArchitectureChatControls
        preset="home"
        templateSuggestions={flattenArchitecturePromptTemplates()}
        onApplyTemplate={vi.fn()}
        outputMenuTestId="architecture-controls-output-menu"
      />,
    );

    expect(screen.getByTestId("agent-model-selector")).toHaveTextContent(
      "Banana Pro",
    );
    expect(
      screen.getByRole("button", { name: "自动 | 1K" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "模板" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "自动 | 1K" }));

    const outputMenu = screen.getByTestId("architecture-controls-output-menu");
    await userEvent.click(within(outputMenu).getByRole("button", { name: "16:9" }));
    await userEvent.click(within(outputMenu).getByRole("button", { name: "4K" }));

    expect(
      screen.getByRole("button", { name: "16:9 | 4K" }),
    ).toBeInTheDocument();
  });

  it("exposes every architecture template option as a usable action", async () => {
    const onApplyTemplate = vi.fn();
    const templateSuggestions = flattenArchitecturePromptTemplates();

    render(
      <ArchitectureChatControls
        preset="sidebar"
        templateSuggestions={templateSuggestions}
        onApplyTemplate={onApplyTemplate}
        templateMenuTestId="architecture-controls-template-menu"
      />,
    );

    const templateButton = screen.getByRole("button", { name: "模板" });

    for (const category of ARCHITECTURE_PROMPT_TEMPLATE_CATEGORIES) {
      for (const template of category.templates) {
        await userEvent.click(templateButton);
        const menu = screen.getByTestId("architecture-controls-template-menu");
        await userEvent.click(
          within(menu).getByRole("button", { name: category.label }),
        );
        await userEvent.click(
          within(menu).getByRole("button", { name: template.label }),
        );

        expect(onApplyTemplate).toHaveBeenLastCalledWith(
          expect.objectContaining({
            id: template.id,
            prompt: template.prompt,
            categoryId: category.id,
            categoryLabel: category.label,
          }),
        );
      }
    }

    expect(onApplyTemplate).toHaveBeenCalledTimes(templateSuggestions.length);
  });
});
