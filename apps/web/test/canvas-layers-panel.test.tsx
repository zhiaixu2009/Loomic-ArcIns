// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CanvasLayersPanel } from "../src/components/canvas-layers-panel";

type MockSceneElement = {
  id: string;
  type: string;
  isDeleted?: boolean;
  locked?: boolean;
  opacity?: number;
  customData?: Record<string, unknown>;
  version?: number;
  updated?: number;
};

function createLayerApi(
  elements: MockSceneElement[],
  options?: {
    deferAppStateWrites?: boolean;
    initialSelectedElementIds?: Record<string, boolean>;
  },
) {
  const listeners = new Set<() => void>();
  let sceneElements = [...elements];
  let appState: Record<string, any> = {
    selectedElementIds: options?.initialSelectedElementIds ?? {},
  };
  let pendingAppState: Record<string, any> | null = null;

  return {
    getSceneElements: () => sceneElements,
    getFiles: () => ({}),
    getAppState: () => appState,
    updateScene: vi.fn((scene: { elements?: MockSceneElement[]; appState?: Record<string, any> }) => {
      if (scene.elements) {
        sceneElements = [...scene.elements];
      }

      if (scene.appState) {
        if (options?.deferAppStateWrites && !scene.elements) {
          pendingAppState = {
            ...appState,
            ...scene.appState,
          };
        } else {
          appState = {
            ...appState,
            ...scene.appState,
          };
        }
      }

      listeners.forEach((listener) => listener());
    }),
    onChange: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function getLayerRow(name: string) {
  const label = screen.getByText(name);
  const row = label.closest("[data-testid^='canvas-layer-row-']");
  return row as HTMLElement | null;
}

describe("CanvasLayersPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("selects the clicked layer row in the canvas scene", async () => {
    const api = createLayerApi([
      {
        id: "image-a",
        type: "image",
        customData: { title: "效果图 A" },
      },
      {
        id: "image-b",
        type: "image",
        customData: { title: "效果图 B" },
      },
    ]);

    render(<CanvasLayersPanel excalidrawApi={api} open onClose={vi.fn()} />);

    const targetRow = getLayerRow("效果图 A");
    expect(targetRow).not.toBeNull();

    const selectButton = within(targetRow as HTMLElement).getByRole("button", {
      name: "效果图 A",
    });

    await userEvent.click(selectButton);

    expect(api.getAppState().selectedElementIds).toEqual({
      "image-a": true,
    });
  });

  it("locks the targeted layer from the row action instead of no-oping", async () => {
    const api = createLayerApi([
      {
        id: "image-a",
        type: "image",
        locked: false,
        customData: { title: "效果图 A" },
        version: 1,
      },
      {
        id: "image-b",
        type: "image",
        locked: false,
        customData: { title: "效果图 B" },
        version: 1,
      },
    ]);

    render(<CanvasLayersPanel excalidrawApi={api} open onClose={vi.fn()} />);

    const row = getLayerRow("效果图 A");
    expect(row).not.toBeNull();

    const lockButton = within(row as HTMLElement).getByRole("button", {
      name: "锁定图层",
    });
    await userEvent.click(lockButton);

    await waitFor(() => {
      const [firstElement, secondElement] = api.getSceneElements();
      expect(firstElement.locked).toBe(true);
      expect(secondElement.locked).toBe(false);
      expect(api.getAppState().selectedElementIds).toEqual({
        "image-a": true,
      });
    });
  });

  it("locks the targeted layer even if the canvas defers app-state selection writes", async () => {
    const api = createLayerApi(
      [
        {
          id: "image-a",
          type: "image",
          locked: false,
          customData: { title: "效果图 A" },
          version: 1,
        },
        {
          id: "image-b",
          type: "image",
          locked: false,
          customData: { title: "效果图 B" },
          version: 1,
        },
      ],
      {
        deferAppStateWrites: true,
        initialSelectedElementIds: {
          "image-b": true,
        },
      },
    );

    render(<CanvasLayersPanel excalidrawApi={api} open onClose={vi.fn()} />);

    const row = getLayerRow("效果图 A");
    expect(row).not.toBeNull();

    const lockButton = within(row as HTMLElement).getByRole("button", {
      name: "锁定图层",
    });
    await userEvent.click(lockButton);

    await waitFor(() => {
      const [firstElement, secondElement] = api.getSceneElements();
      expect(firstElement.locked).toBe(true);
      expect(secondElement.locked).toBe(false);
    });
  });

  it("hides the targeted layer from the row action instead of no-oping", async () => {
    const api = createLayerApi([
      {
        id: "image-a",
        type: "image",
        opacity: 100,
        customData: { title: "效果图 A" },
        version: 1,
      },
      {
        id: "image-b",
        type: "image",
        opacity: 100,
        customData: { title: "效果图 B" },
        version: 1,
      },
    ]);

    render(<CanvasLayersPanel excalidrawApi={api} open onClose={vi.fn()} />);

    const row = getLayerRow("效果图 B");
    expect(row).not.toBeNull();

    const visibilityButton = within(row as HTMLElement).getByRole("button", {
      name: "隐藏图层",
    });
    await userEvent.click(visibilityButton);

    await waitFor(() => {
      const [firstElement, secondElement] = api.getSceneElements();
      expect(firstElement.opacity ?? 100).toBe(100);
      expect(secondElement.opacity).toBe(0);
      expect(secondElement.customData?.hidden).toBe(true);
      expect(api.getAppState().selectedElementIds).toEqual({
        "image-b": true,
      });
    });
  });

  it("exposes the selected layer state to assistive technology", () => {
    const api = createLayerApi(
      [
        {
          id: "image-a",
          type: "image",
          customData: { title: "效果图 A" },
        },
        {
          id: "image-b",
          type: "image",
          customData: { title: "效果图 B" },
        },
      ],
      {
        initialSelectedElementIds: {
          "image-b": true,
        },
      },
    );

    render(<CanvasLayersPanel excalidrawApi={api} open onClose={vi.fn()} />);

    const selectedRow = getLayerRow("效果图 B");
    expect(selectedRow).not.toBeNull();

    const selectButton = within(selectedRow as HTMLElement).getByRole("button", {
      name: "效果图 B",
    });
    expect(selectButton.getAttribute("aria-current")).toBe("true");
  });
  it("reorders the live scene stack when a layer row is dragged above another row", async () => {
    const api = createLayerApi([
      {
        id: "image-a",
        type: "image",
        customData: { title: "鏁堟灉鍥?A" },
        version: 1,
      },
      {
        id: "image-b",
        type: "image",
        customData: { title: "鏁堟灉鍥?B" },
        version: 1,
      },
      {
        id: "image-c",
        type: "image",
        customData: { title: "鏁堟灉鍥?C" },
        version: 1,
      },
    ]);

    render(<CanvasLayersPanel excalidrawApi={api} open onClose={vi.fn()} />);

    const sourceRow = getLayerRow("鏁堟灉鍥?A");
    const targetRow = getLayerRow("鏁堟灉鍥?C");
    expect(sourceRow).not.toBeNull();
    expect(targetRow).not.toBeNull();

    fireEvent.dragStart(sourceRow as HTMLElement);
    fireEvent.dragOver(targetRow as HTMLElement);
    fireEvent.drop(targetRow as HTMLElement);

    await waitFor(() => {
      expect(api.getSceneElements().map((element) => element.id)).toEqual([
        "image-b",
        "image-c",
        "image-a",
      ]);
    });
  });
});
