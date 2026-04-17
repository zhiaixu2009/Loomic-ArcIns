import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SOURCE_FILES = [
  "../src/app/(workspace)/home/page.tsx",
  "../src/components/home-prompt.tsx",
  "../src/components/home-example-browser.tsx",
  "../src/components/new-project-dialog.tsx",
  "../src/app/canvas/page.tsx",
  "../src/components/chat-input.tsx",
  "../src/components/canvas/canvas-context-menu.tsx",
  "../src/components/canvas/canvas-selection-action-bar.tsx",
  "../src/components/canvas-tool-menu.tsx",
] as const;

const BANNED_WARM_TOKENS = [
  "#fbfaf7",
  "#faf7f2",
  "#f4efe6",
  "#f7f3eb",
  "#fffdf8",
  "#f6f4ef",
  "#f8f1e4",
  "#e6dfd2",
  "#e7dfd3",
  "#e3d4bc",
  "#d8ccb7",
  "#d7ccb9",
  "#d7c8ad",
  "#ddd3c4",
  "#eee5d9",
  "#8c7d68",
  "#8a7d69",
  "#8a6b43",
  "#7f725c",
  "#7b5e28",
  "#7a6c5b",
  "#715f48",
  "#6f6352",
  "#5f5545",
  "#5f5243",
  "rgba(148,132,105",
  "rgba(83,63,28",
  "rgba(110,87,42",
  "rgba(148, 132, 105",
  "rgba(83, 63, 28",
  "rgba(110, 87, 42",
  "border-accent",
  "bg-accent/20",
  "text-accent-foreground",
] as const;

const BANNED_LARGE_PANEL_RADIUS_TOKENS = [
  "rounded-[20px]",
  "rounded-[24px]",
  "rounded-[28px]",
  "rounded-xl",
  "rounded-2xl",
] as const;

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("architecture neutral palette", () => {
  it.each(SOURCE_FILES)(
    "removes warm palette tokens from %s",
    (relativePath) => {
      const source = readSource(relativePath);

      for (const token of BANNED_WARM_TOKENS) {
        expect(source).not.toContain(token);
      }
    },
  );

  it.each([
    "../src/app/(workspace)/home/page.tsx",
    "../src/components/home-prompt.tsx",
    "../src/components/home-example-browser.tsx",
    "../src/components/new-project-dialog.tsx",
  ])("keeps home-facing panels at or below 10px radius in %s", (relativePath) => {
    const source = readSource(relativePath);

    for (const token of BANNED_LARGE_PANEL_RADIUS_TOKENS) {
      expect(source).not.toContain(token);
    }
  });
});
