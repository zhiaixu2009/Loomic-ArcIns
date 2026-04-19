// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatInput } from "../src/components/chat-input";
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

describe("ChatInput", () => {
  beforeEach(() => {
    imageModelPreferenceState.mode = "auto";
    imageModelPreferenceState.models = [];
  });

  it("uses the PRD-matched immersive placeholder copy when no references are attached", () => {
    render(
      <ChatInput immersiveArchitecture onSend={vi.fn()} onAddFiles={vi.fn()} />,
    );

    expect(
      screen.getByPlaceholderText("添加图片输入文案开始创作之旅..."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "添加图片" }),
    ).toBeInTheDocument();
  });

  it("shows selected canvas images as persistent reference chips and injects a template prompt", async () => {
    render(
      <ChatInput
        onSend={vi.fn()}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            dataUrl: "data:image/png;base64,ZmFrZQ==",
          },
        ]}
        templateSuggestions={[
          {
            id: "preserve-view",
            label: "保留视角深化立面",
            prompt:
              "请基于已选参考图，保持当前视角和主体构图，深化建筑立面、材质与灯光氛围。",
          },
        ]}
      />,
    );

    expect(screen.getByText("已关联参考图")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "基于已选参考图继续细化，描述希望保留或改动的内容",
      ),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "保留视角深化立面" }),
    );

    expect(screen.getByLabelText("输入消息")).toHaveValue(
      "请基于已选参考图，保持当前视角和主体构图，深化建筑立面、材质与灯光氛围。",
    );
  });

  it("exposes an explicit send-to-chat action for selected canvas references", async () => {
    const onAttachSelectedCanvasImages = vi.fn();

    render(
      <ChatInput
        onSend={vi.fn()}
        onAttachSelectedCanvasImages={onAttachSelectedCanvasImages}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            dataUrl: "data:image/png;base64,ZmFrZQ==",
          },
        ]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "发送至对话" }),
    );

    expect(onAttachSelectedCanvasImages).toHaveBeenCalledTimes(1);
  });

  it("uses the attached-reference placeholder when the conversation already holds canvas refs", () => {
    render(<ChatInput onSend={vi.fn()} attachedReferenceCount={2} />);

    expect(
      screen.getByPlaceholderText(
        "已接入对话参考图，继续描述希望保留或改动的内容",
      ),
    ).toBeInTheDocument();
  });

  it("switches to the multi-reference placeholder when multiple canvas images are selected", () => {
    render(
      <ChatInput
        onSend={vi.fn()}
        onAttachSelectedCanvasImages={vi.fn()}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            dataUrl: "data:image/png;base64,ZmFrZQ==",
          },
          {
            id: "image-2",
            type: "image",
            x: 40,
            y: 20,
            width: 640,
            height: 480,
            fileId: "file-2",
            dataUrl: "data:image/png;base64,ZmFrZTI=",
          },
        ]}
      />,
    );

    expect(
      screen.getByPlaceholderText(
        "基于所选多张参考图继续生成，说明想保留的共同点、差异点与融合方向",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "整组发送至对话" }),
    ).toBeInTheDocument();
  });

  it("shows multi-reference ordering controls and emits move requests", async () => {
    const onMoveSelectedCanvasImage = vi.fn();

    render(
      <ChatInput
        onSend={vi.fn()}
        onAttachSelectedCanvasImages={vi.fn()}
        onMoveSelectedCanvasImage={onMoveSelectedCanvasImage}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            dataUrl: "data:image/png;base64,ZmFrZQ==",
          },
          {
            id: "image-2",
            type: "image",
            x: 40,
            y: 20,
            width: 640,
            height: 480,
            fileId: "file-2",
            dataUrl: "data:image/png;base64,ZmFrZTI=",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "将参考图 1 向后移动" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "将参考图 1 向前移动" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "将参考图 2 向前移动" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "将参考图 2 向后移动" }),
    ).toBeDisabled();

    await userEvent.click(
      screen.getByRole("button", { name: "将参考图 1 向后移动" }),
    );

    expect(onMoveSelectedCanvasImage).toHaveBeenCalledWith("image-1", "right");
  });

  it("accepts a one-shot external draft injection without auto-sending", async () => {
    const onSend = vi.fn();
    const { rerender } = render(<ChatInput onSend={onSend} />);

    rerender(
      <ChatInput
        onSend={onSend}
        externalDraft={{
          id: "command-1",
          prompt:
            "请基于已选多图总结共同的建筑语言，输出后续效果图策略。",
        }}
      />,
    );

    expect(await screen.findByLabelText("输入消息")).toHaveValue(
      "请基于已选多图总结共同的建筑语言，输出后续效果图策略。",
    );
    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows selected image thumbnails in immersive architecture mode instead of hiding selection state", () => {
    render(
      <ChatInput
        immersiveArchitecture
        onSend={vi.fn()}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            dataUrl: "data:image/png;base64,ZmFrZQ==",
          },
        ]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "发送至对话" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("已关联参考图")).not.toBeInTheDocument();
    expect(screen.getByAltText("参考图 1")).toBeInTheDocument();
    expect(screen.getByLabelText("输入消息")).toBeInTheDocument();
  });

  it("renders immersive multi-image pending chips with in-chip arrows, visible disabled edges, and dismiss buttons", async () => {
    const onMoveSelectedCanvasImage = vi.fn();
    const onRemoveSelectedCanvasImage = vi.fn();

    render(
      <ChatInput
        immersiveArchitecture
        onSend={vi.fn()}
        onMoveSelectedCanvasImage={onMoveSelectedCanvasImage}
        onRemoveSelectedCanvasImage={onRemoveSelectedCanvasImage}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            dataUrl: "data:image/png;base64,ZmFrZQ==",
          },
          {
            id: "image-2",
            type: "image",
            x: 40,
            y: 20,
            width: 640,
            height: 480,
            fileId: "file-2",
            dataUrl: "data:image/png;base64,ZmFrZTI=",
          },
        ]}
      />,
    );

    const chips = screen.getAllByTestId("chat-input-selected-canvas-chip");
    expect(chips).toHaveLength(2);

    const firstChip = chips[0]!;
    expect(
      within(firstChip).getByRole("button", {
        name: "移除待选参考图 1",
      }),
    ).toBeInTheDocument();
    expect(
      within(firstChip).getByRole("button", {
        name: "将参考图 1 向前移动",
      }),
    ).toBeDisabled();
    expect(
      within(firstChip).getByRole("button", {
        name: "将参考图 1 向后移动",
      }),
    ).toBeEnabled();
    expect(within(firstChip).queryByText(/^1$/)).not.toBeInTheDocument();

    await userEvent.click(
      within(firstChip).getByRole("button", {
        name: "将参考图 1 向后移动",
      }),
    );
    await userEvent.click(
      within(firstChip).getByRole("button", {
        name: "移除待选参考图 1",
      }),
    );

    expect(onMoveSelectedCanvasImage).toHaveBeenCalledWith("image-1", "right");
    expect(onRemoveSelectedCanvasImage).toHaveBeenCalledWith("image-1");
  });

  it("avoids duplicating the same canvas reference in immersive mode after it has already been attached", () => {
    render(
      <ChatInput
        immersiveArchitecture
        onSend={vi.fn()}
        attachedReferenceCount={1}
        attachments={[
          {
            id: "attachment-1",
            preview: "https://example.com/reference.png",
            uploading: false,
            assetId: "image-1",
            url: "https://example.com/reference.png",
            mimeType: "image/png",
            source: "canvas-ref",
          },
        ]}
        onRemoveAttachment={vi.fn()}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            storageUrl: "https://example.com/reference.png",
          },
        ]}
      />,
    );

    expect(
      screen.getByPlaceholderText(
        "已接入对话参考图，继续描述希望保留或改动的内容",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByAltText("参考图 1")).not.toBeInTheDocument();
    expect(screen.getByAltText("画布参考图")).toBeInTheDocument();
  });

  it("uses the shared architecture control strip in immersive mode and exposes template actions from the bottom bar", async () => {
    imageModelPreferenceState.mode = "manual";
    imageModelPreferenceState.models = ["google/nano-banana-2"];

    render(
      <ChatInput
        immersiveArchitecture
        onSend={vi.fn()}
        templateSuggestions={[
          {
            id: "preserve-view",
            label: "保留视角深化立面",
            prompt:
              "请基于当前建筑参考图，保持主体视角与构图关系，进一步细化立面层次与材质细节。",
          },
        ]}
      />,
    );

    expect(screen.getByTestId("agent-model-selector")).toHaveTextContent(
      "Banana Pro",
    );
    expect(
      screen.getByRole("button", { name: "自动 | 1K" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "模板" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "自动 / 2K" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "模板" }));

    expect(
      screen.getByRole("button", { name: "保留视角深化立面" }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "保留视角深化立面" }),
    );

    expect(setImageModelPreferenceMock).toHaveBeenCalledWith({
      mode: "manual",
      models: ["google/nano-banana-pro"],
    });
    expect(screen.getByLabelText("输入消息")).toHaveValue(
      "请基于当前建筑参考图，保持主体视角与构图关系，进一步细化立面层次与材质细节。",
    );
  });

  it("keeps the immersive attachment rail visually tight to the text area and bottom controls", () => {
    render(
      <ChatInput
        immersiveArchitecture
        onSend={vi.fn()}
        attachments={[
          {
            id: "attachment-1",
            preview: "https://example.com/reference.png",
            uploading: false,
            assetId: "asset-1",
            url: "https://example.com/reference.png",
            mimeType: "image/png",
            source: "upload",
          },
        ]}
        onRemoveAttachment={vi.fn()}
      />,
    );

    const inlineRail = screen.getByTestId("chat-input-immersive-inline-rail");
    const inputBlock = inlineRail.nextElementSibling as HTMLElement | null;
    const controlRow = screen.getByTestId("chat-input-immersive-control-row");

    expect(inputBlock).not.toBeNull();
    expect(inputBlock).toHaveClass("mt-1.5");
    expect(inputBlock).not.toHaveClass("mt-3");
    expect(controlRow).toHaveClass("mt-2", "pt-2");
    expect(controlRow).not.toHaveClass("mt-3", "pt-3");
  });

  it("keeps the empty immersive composer compact instead of bottom-aligning the textarea below the add tile", () => {
    render(
      <ChatInput
        immersiveArchitecture
        onSend={vi.fn()}
        onAddFiles={vi.fn()}
      />,
    );

    const shell = screen.getByTestId("chat-input-immersive-shell");
    const inlineRail = screen.getByTestId("chat-input-immersive-inline-rail");
    const inputRow = screen.getByTestId("chat-input-immersive-input-row");
    const inputStack = inputRow.parentElement as HTMLElement | null;

    expect(shell).not.toHaveClass("h-[272px]");
    expect(shell).toHaveClass("max-h-[272px]");
    expect(inlineRail).toHaveClass("min-h-[60px]");
    expect(inlineRail).not.toHaveClass("min-h-[68px]");
    expect(inputStack).not.toBeNull();
    expect(inputStack).not.toHaveClass("flex-1");
    expect(inputRow).toHaveClass("items-start");
    expect(inputRow).not.toHaveClass("flex-1");
    expect(inputRow).not.toHaveClass("items-end");
    expect(
      within(inlineRail).getByRole("button", { name: "添加图片" }),
    ).toBeInTheDocument();
  });

  it("uses a two-line immersive text baseline and only grows upward after the content exceeds it", async () => {
    render(<ChatInput immersiveArchitecture onSend={vi.fn()} />);

    const textarea = screen.getByLabelText("输入消息") as HTMLTextAreaElement;
    let mockedScrollHeight = 44;

    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      get: () => mockedScrollHeight,
    });

    fireEvent.change(textarea, { target: { value: "单行内容" } });

    await waitFor(() => {
      expect(textarea).toHaveClass("min-h-[56px]", "max-h-[112px]");
      expect(textarea).not.toHaveClass("min-h-[80px]");
      expect(textarea.style.height).toBe("56px");
    });

    mockedScrollHeight = 96;
    fireEvent.change(textarea, { target: { value: "第一行\n第二行\n第三行" } });

    await waitFor(() => {
      expect(textarea.style.height).toBe("96px");
    });
  });

  it("keeps the immersive composer shell fixed and places pending chips in a dedicated meta rail", () => {
    render(
      <ChatInput
        immersiveArchitecture
        onSend={vi.fn()}
        selectedCanvasElements={[
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 640,
            height: 480,
            fileId: "file-1",
            dataUrl: "data:image/png;base64,ZmFrZQ==",
          },
          {
            id: "image-2",
            type: "image",
            x: 40,
            y: 20,
            width: 640,
            height: 480,
            fileId: "file-2",
            dataUrl: "data:image/png;base64,ZmFrZTI=",
          },
        ]}
      />,
    );

    const shell = screen.getByTestId("chat-input-immersive-shell");
    expect(shell).toHaveAttribute("data-layout", "fixed");

    const metaRail = screen.getByTestId("chat-input-immersive-inline-rail");
    expect(
      within(metaRail).getAllByTestId("chat-input-selected-canvas-chip"),
    ).toHaveLength(2);
    expect(
      within(metaRail).getByRole("button", { name: "添加图片" }),
    ).toBeInTheDocument();
    expect(
      within(metaRail).getAllByTestId("chat-input-selected-canvas-chip")[0],
    ).toHaveClass("h-[68px]", "w-[68px]");

    const inputRow = screen.getByTestId("chat-input-immersive-input-row");
    expect(within(inputRow).getByLabelText("输入消息")).toBeInTheDocument();
    expect(
      within(inputRow).queryByRole("button", { name: "添加图片" }),
    ).not.toBeInTheDocument();

    const controlRow = screen.getByTestId("chat-input-immersive-control-row");
    expect(
      within(controlRow).queryByRole("button", { name: "添加图片" }),
    ).not.toBeInTheDocument();
  });

  it("opens an aspect-ratio menu from the merged immersive output button and keeps the selected ratio label", async () => {
    render(<ChatInput immersiveArchitecture onSend={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "自动 | 1K" }));

    expect(screen.getByRole("button", { name: "16:9" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4:3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "21:9" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "16:9" }));

    expect(screen.getByRole("button", { name: "16:9 | 1K" })).toBeInTheDocument();
    expect(screen.queryByText("自动 | 1K")).not.toBeInTheDocument();
  });

  it("opens a resolution menu from the merged immersive output button and keeps the selected resolution label", async () => {
    render(<ChatInput immersiveArchitecture onSend={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "自动 | 1K" }));

    expect(screen.getByRole("button", { name: "1K" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2K" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4K" })).toBeInTheDocument();
    expect(
      screen.getByText(/高分辨率实际生成受账号权限影响/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "4K" }));

    expect(screen.getByRole("button", { name: "自动 | 4K" })).toBeInTheDocument();
    expect(screen.queryByText("自动 | 1K")).not.toBeInTheDocument();
  });

  it("renders the immersive template menu as category-to-item hierarchy instead of a flat list", async () => {
    render(
      <ChatInput
        immersiveArchitecture
        onSend={vi.fn()}
        templateSuggestions={[
          {
            id: "render-1",
            label: "保留视角深化立面",
            prompt:
              "请基于当前建筑参考图，保持主体视角与构图关系，进一步细化立面层次与材质细节。",
            categoryId: "render",
            categoryLabel: "效果渲染",
          },
          {
            id: "site-1",
            label: "总平填色优化",
            prompt:
              "请基于当前总平图，增强场地层次、道路辨识度与绿化填色效果。",
            categoryId: "site-color",
            categoryLabel: "总平填色",
          },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "模板" }));

    expect(
      screen.getByRole("button", { name: "效果渲染" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "总平填色" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "保留视角深化立面" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "总平填色优化" }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "总平填色" }),
    );

    expect(
      screen.getByRole("button", { name: "总平填色优化" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "保留视角深化立面" }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "总平填色优化" }),
    );

    expect(screen.getByLabelText("输入消息")).toHaveValue(
      "请基于当前总平图，增强场地层次、道路辨识度与绿化填色效果。",
    );
  });

  it("anchors the immersive template browser to the template button instead of sending it far above the composer", async () => {
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function mockRect(this: HTMLElement) {
        const ariaLabel = this.getAttribute("aria-label");
        const testId = this.getAttribute("data-testid");

        if (ariaLabel === "模板") {
          return {
            x: 760,
            y: 820,
            width: 64,
            height: 32,
            top: 820,
            right: 824,
            bottom: 852,
            left: 760,
            toJSON: () => ({}),
          } as DOMRect;
        }

        if (testId === "chat-input-template-menu") {
          return {
            x: 0,
            y: 0,
            width: 430,
            height: 248,
            top: 0,
            right: 430,
            bottom: 248,
            left: 0,
            toJSON: () => ({}),
          } as DOMRect;
        }

        return {
          x: 0,
          y: 0,
          width: 120,
          height: 40,
          top: 0,
          right: 120,
          bottom: 40,
          left: 0,
          toJSON: () => ({}),
        } as DOMRect;
      });

    try {
      render(
        <ChatInput
          immersiveArchitecture
          onSend={vi.fn()}
          templateSuggestions={[
            {
              id: "render-1",
              label: "保留视角深化立面",
              prompt:
                "请基于当前建筑参考图，保持主体视角与构图关系，进一步细化立面层次与材质细节。",
              categoryId: "render",
              categoryLabel: "效果渲染",
            },
          ]}
        />,
      );

      await userEvent.click(screen.getByRole("button", { name: "模板" }));

      await waitFor(() => {
        const portal = screen.getByTestId("chat-input-template-menu");
        expect(portal.style.top).toBe("808px");
        expect(portal.style.transform).toBe("translateY(-100%)");
      });
    } finally {
      rectSpy.mockRestore();
    }
  });
});
