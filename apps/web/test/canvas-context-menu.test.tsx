// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CanvasContextMenu } from "../src/components/canvas/canvas-context-menu";

afterEach(() => {
  cleanup();
});

describe("CanvasContextMenu", () => {
  it("renders the compact blank-canvas menu without description cards", async () => {
    const onClose = vi.fn();
    const onPaste = vi.fn();

    render(
      <div className="relative">
        <CanvasContextMenu
          open
          mode="blank"
          position={{ x: 120, y: 80 }}
          onClose={onClose}
          actions={[
            {
              id: "paste",
              label: "粘贴",
              onSelect: onPaste,
            },
            {
              id: "show-all",
              label: "显示画布所有元素",
              onSelect: vi.fn(),
            },
            {
              id: "export-canvas",
              label: "导出画布",
              onSelect: vi.fn(),
            },
            {
              id: "import-canvas",
              label: "导入画布",
              onSelect: vi.fn(),
            },
          ]}
        />
      </div>,
    );

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.queryByText("空白画布")).not.toBeInTheDocument();
    expect(
      screen.queryByText("从这里开始插入参考、建筑板块或直接打开右侧智能体。"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "粘贴" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "显示画布所有元素" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出画布" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导入画布" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "粘贴" }));

    expect(onPaste).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the single-image menu using the real action inventory", () => {
    render(
      <div className="relative">
        <CanvasContextMenu
          open
          mode="single-image"
          position={{ x: 220, y: 140 }}
          onClose={vi.fn()}
          actions={[
            {
              id: "copy",
              label: "复制",
              onSelect: vi.fn(),
            },
            {
              id: "paste",
              label: "粘贴",
              onSelect: vi.fn(),
            },
            {
              id: "move-forward",
              label: "上移一层",
              onSelect: vi.fn(),
            },
            {
              id: "move-backward",
              label: "下移一层",
              onSelect: vi.fn(),
            },
            {
              id: "move-front",
              label: "移到顶层",
              onSelect: vi.fn(),
            },
            {
              id: "move-back",
              label: "移到底层",
              onSelect: vi.fn(),
            },
            {
              id: "attach-selection",
              label: "发送至对话",
              onSelect: vi.fn(),
            },
            {
              id: "group-selection",
              label: "创建编组",
              onSelect: vi.fn(),
            },
            {
              id: "ungroup-selection",
              label: "解除编组",
              onSelect: vi.fn(),
            },
            {
              id: "merge-selection",
              label: "合并图层",
              onSelect: vi.fn(),
            },
            {
              id: "toggle-visibility",
              label: "显示/隐藏",
              onSelect: vi.fn(),
            },
            {
              id: "lock-selection",
              label: "锁定/解锁",
              onSelect: vi.fn(),
            },
            {
              id: "export-selection",
              label: "导出",
              onSelect: vi.fn(),
            },
            {
              id: "delete-selection",
              label: "删除",
              onSelect: vi.fn(),
            },
          ]}
        />
      </div>,
    );

    expect(screen.queryByText("单图参考")).not.toBeInTheDocument();
    expect(
      screen.queryByText("把当前图片送入对话，或把模板写入右侧输入框继续生成。"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "粘贴" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上移一层" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下移一层" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "移到顶层" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "移到底层" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送至对话" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建编组" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "解除编组" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "合并图层" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "显示/隐藏" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "锁定/解锁" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
  });

  it("renders the compact multi-image menu and forwards action callbacks", async () => {
    const onMerge = vi.fn();

    render(
      <div className="relative">
        <CanvasContextMenu
          open
          mode="multi-image"
          position={{ x: 320, y: 200 }}
          onClose={vi.fn()}
          actions={[
            {
              id: "attach-selection",
              label: "发送至对话",
              onSelect: vi.fn(),
            },
            {
              id: "group-selection",
              label: "创建编组",
              onSelect: vi.fn(),
            },
            {
              id: "ungroup-selection",
              label: "解除编组",
              onSelect: vi.fn(),
            },
            {
              id: "merge-selection",
              label: "合并图层",
              onSelect: onMerge,
            },
            {
              id: "toggle-visibility",
              label: "显示/隐藏",
              onSelect: vi.fn(),
            },
            {
              id: "lock-selection",
              label: "锁定/解锁",
              onSelect: vi.fn(),
            },
            {
              id: "export-selection",
              label: "导出",
              onSelect: vi.fn(),
            },
            {
              id: "delete-selection",
              label: "删除",
              onSelect: vi.fn(),
            },
          ]}
        />
      </div>,
    );

    expect(screen.queryByText("多图参考组")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "合并图层" }),
    );

    expect(onMerge).toHaveBeenCalledTimes(1);
  });

  it("repositions the menu back into the viewport when the requested anchor would push it under the bottom edge", async () => {
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 720,
      writable: true,
    });

    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute?.("role") === "menu") {
          return {
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            bottom: 420,
            right: 220,
            width: 220,
            height: 420,
            toJSON: () => ({}),
          } as DOMRect;
        }

        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          width: 0,
          height: 0,
          toJSON: () => ({}),
        } as DOMRect;
      });

    try {
      render(
        <div className="relative">
          <CanvasContextMenu
            open
            mode="single-image"
            position={{ x: 640, y: 680 }}
            onClose={vi.fn()}
            actions={[
              {
                id: "attach-selection",
                label: "发送至对话",
                onSelect: vi.fn(),
              },
            ]}
          />
        </div>,
      );

      await waitFor(() => {
        const anchor = screen.getByRole("menu").parentElement;
        expect(anchor).not.toBeNull();
        expect(parseFloat(anchor!.style.top)).toBeLessThan(680);
      });
    } finally {
      rectSpy.mockRestore();
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: originalInnerHeight,
        writable: true,
      });
    }
  });
});
