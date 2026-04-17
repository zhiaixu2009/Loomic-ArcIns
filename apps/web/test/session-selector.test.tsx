// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SessionSelector } from "../src/components/session-selector";

describe("SessionSelector", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("normalizes the default English session title into Chinese in both trigger and list", async () => {
    render(
      <SessionSelector
        sessions={[
          {
            id: "session-1",
            title: "New Chat",
            updatedAt: "2026-04-14T10:00:00.000Z",
          },
        ]}
        activeSessionId="session-1"
        onSelect={vi.fn()}
        onNewChat={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("新对话")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /新对话/i }));

    expect(await screen.findAllByText("新对话")).toHaveLength(2);
  });
});
