// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchImageModelsMock,
  fetchVideoModelsMock,
  setImageModeMock,
  setVideoModeMock,
  toggleImageModelMock,
  toggleVideoModelMock,
} = vi.hoisted(() => ({
  fetchImageModelsMock: vi.fn(),
  fetchVideoModelsMock: vi.fn(),
  setImageModeMock: vi.fn(),
  setVideoModeMock: vi.fn(),
  toggleImageModelMock: vi.fn(),
  toggleVideoModelMock: vi.fn(),
}));

vi.mock("../src/lib/server-api", () => ({
  fetchImageModels: fetchImageModelsMock,
  fetchVideoModels: fetchVideoModelsMock,
}));

vi.mock("../src/hooks/use-image-model-preference", () => ({
  useImageModelPreference: () => ({
    preference: { mode: "auto", models: ["google/nano-banana-2"] },
    setMode: setImageModeMock,
    toggleModel: toggleImageModelMock,
  }),
}));

vi.mock("../src/hooks/use-video-model-preference", () => ({
  useVideoModelPreference: () => ({
    preference: { mode: "auto", models: ["google/veo-3.1"] },
    setMode: setVideoModeMock,
    toggleModel: toggleVideoModelMock,
  }),
}));

import { ImageModelPreferencePopover } from "../src/components/image-model-preference";

function PopoverHarness() {
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={anchorRef} type="button">
        anchor
      </button>
      <ImageModelPreferencePopover
        open
        onClose={() => {}}
        anchorRef={anchorRef}
      />
    </>
  );
}

describe("ImageModelPreferencePopover", () => {
  beforeEach(() => {
    fetchImageModelsMock.mockReset();
    fetchVideoModelsMock.mockReset();
    setImageModeMock.mockReset();
    setVideoModeMock.mockReset();
    toggleImageModelMock.mockReset();
    toggleVideoModelMock.mockReset();

    fetchImageModelsMock.mockResolvedValue({
      models: [
        {
          id: "google/nano-banana-2",
          displayName: "Nano Banana 2",
          description: "默认图片模型",
          provider: "google",
        },
      ],
    });
    fetchVideoModelsMock.mockResolvedValue({
      models: [
        {
          id: "google/veo-3.1",
          displayName: "Veo 3.1",
          description: "默认视频模型",
          provider: "google",
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders Chinese tab, header, and mode descriptions for image and video preferences", async () => {
    render(<PopoverHarness />);

    expect(await screen.findByText("图片模型")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "图片" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "视频" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "自动" })).toBeInTheDocument();
    expect(
      screen.getByText("智能体会为每次图片任务自动选择最合适的模型"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "视频" }));

    expect(await screen.findByText("视频模型")).toBeInTheDocument();
    expect(
      screen.getByText("智能体会为每次视频任务自动选择最合适的模型"),
    ).toBeInTheDocument();
  });
});
