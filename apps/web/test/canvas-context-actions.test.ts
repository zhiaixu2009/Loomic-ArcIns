import { describe, expect, it, vi } from "vitest";

import type { CanvasSelectedElement } from "../src/components/canvas-editor";
import {
  deleteSelectedCanvasElements,
  duplicateSelectedCanvasElements,
  getCanvasContextMenuMode,
  groupSelectedCanvasElements,
  reorderCanvasElementsByLayerOrder,
  reorderSelectedCanvasElements,
  toggleLockSelectedCanvasElements,
} from "../src/lib/canvas-context-actions";

function createImageSelection(
  overrides: Partial<CanvasSelectedElement> = {},
): CanvasSelectedElement {
  return {
    id: "image-1",
    type: "image",
    x: 0,
    y: 0,
    width: 640,
    height: 480,
    fileId: "file-1",
    storageUrl: "https://example.com/image.png",
    ...overrides,
  };
}

describe("canvas-context-actions", () => {
  it("detects blank, single-image, multi-image, and generic-selection modes", () => {
    expect(getCanvasContextMenuMode([])).toBe("blank");
    expect(getCanvasContextMenuMode(undefined)).toBe("blank");
    expect(getCanvasContextMenuMode([createImageSelection()])).toBe(
      "single-image",
    );
    expect(
      getCanvasContextMenuMode([
        createImageSelection(),
        createImageSelection({
          id: "image-2",
          fileId: "file-2",
          storageUrl: "https://example.com/image-2.png",
        }),
      ]),
    ).toBe("multi-image");
    expect(
      getCanvasContextMenuMode([
        {
          id: "shape-1",
          type: "rectangle",
          x: 10,
          y: 10,
          width: 120,
          height: 80,
        },
      ]),
    ).toBe("selection");
  });

  it("groups selected canvas elements with one shared group id", () => {
    const updateScene = vi.fn();
    const api = {
      getAppState: () => ({
        selectedElementIds: {
          "image-1": true,
          "image-2": true,
        },
      }),
      getSceneElements: () => [
        {
          id: "image-1",
          type: "image",
          groupIds: [],
          version: 1,
        },
        {
          id: "image-2",
          type: "image",
          groupIds: [],
          version: 2,
        },
        {
          id: "shape-1",
          type: "rectangle",
          groupIds: [],
          version: 3,
        },
      ],
      updateScene,
    };

    const result = groupSelectedCanvasElements(api as any);

    expect(result.groupedCount).toBe(2);
    expect(result.groupId).toBeTruthy();
    expect(updateScene).toHaveBeenCalledTimes(1);

    const updatedElements = updateScene.mock.calls[0]?.[0]?.elements;
    expect(updatedElements[0].groupIds).toContain(result.groupId);
    expect(updatedElements[1].groupIds).toContain(result.groupId);
    expect(updatedElements[2].groupIds).toEqual([]);
  });

  it("does not update the scene when fewer than two elements are selected", () => {
    const updateScene = vi.fn();
    const api = {
      getAppState: () => ({
        selectedElementIds: {
          "image-1": true,
        },
      }),
      getSceneElements: () => [
        {
          id: "image-1",
          type: "image",
          groupIds: [],
          version: 1,
        },
      ],
      updateScene,
    };

    const result = groupSelectedCanvasElements(api as any);

    expect(result.groupedCount).toBe(0);
    expect(result.groupId).toBeNull();
    expect(updateScene).not.toHaveBeenCalled();
  });

  it("reorders selected elements across the scene stack", () => {
    const updateScene = vi.fn();
    const api = {
      getAppState: () => ({
        selectedElementIds: {
          "image-2": true,
        },
      }),
      getSceneElements: () => [
        { id: "image-1", type: "image", version: 1 },
        { id: "image-2", type: "image", version: 1 },
        { id: "image-3", type: "image", version: 1 },
        { id: "image-4", type: "image", version: 1 },
      ],
      updateScene,
    };

    const forward = reorderSelectedCanvasElements(api as any, "forward");
    const movedForwardIds = updateScene.mock.calls[0]?.[0]?.elements?.map(
      (element: { id: string }) => element.id,
    );
    const toFront = reorderSelectedCanvasElements(api as any, "front");
    const movedToFrontIds = updateScene.mock.calls[1]?.[0]?.elements?.map(
      (element: { id: string }) => element.id,
    );
    const toBack = reorderSelectedCanvasElements(api as any, "back");
    const movedToBackIds = updateScene.mock.calls[2]?.[0]?.elements?.map(
      (element: { id: string }) => element.id,
    );

    expect(forward.movedCount).toBe(1);
    expect(movedForwardIds).toEqual(["image-1", "image-3", "image-2", "image-4"]);
    expect(toFront.movedCount).toBe(1);
    expect(movedToFrontIds).toEqual(["image-1", "image-3", "image-4", "image-2"]);
    expect(toBack.movedCount).toBe(1);
    expect(movedToBackIds).toEqual(["image-2", "image-1", "image-3", "image-4"]);
  });

  it("reorders the scene from a layers-panel top-to-bottom order", () => {
    const updateScene = vi.fn();
    const api = {
      getAppState: () => ({
        selectedElementIds: {
          "image-1": true,
        },
      }),
      getSceneElements: () => [
        { id: "image-1", type: "image", version: 1 },
        { id: "image-2", type: "image", version: 1 },
        { id: "image-3", type: "image", version: 1 },
      ],
      updateScene,
    };

    const result = reorderCanvasElementsByLayerOrder(api as any, [
      "image-1",
      "image-3",
      "image-2",
    ]);
    const reorderedIds = updateScene.mock.calls[0]?.[0]?.elements?.map(
      (element: { id: string }) => element.id,
    );

    expect(result.movedCount).toBe(3);
    expect(reorderedIds).toEqual(["image-2", "image-3", "image-1"]);
  });

  it("toggles the locked state for the selected elements", () => {
    const updateScene = vi.fn();
    const api = {
      getAppState: () => ({
        selectedElementIds: {
          "image-1": true,
          "image-2": true,
        },
      }),
      getSceneElements: () => [
        { id: "image-1", type: "image", locked: false, version: 1 },
        { id: "image-2", type: "image", locked: false, version: 1 },
        { id: "shape-1", type: "rectangle", locked: false, version: 1 },
      ],
      updateScene,
    };

    const lockResult = toggleLockSelectedCanvasElements(api as any);
    const lockedElements = updateScene.mock.calls[0]?.[0]?.elements;

    expect(lockResult.affectedCount).toBe(2);
    expect(lockResult.locked).toBe(true);
    expect(lockedElements[0].locked).toBe(true);
    expect(lockedElements[1].locked).toBe(true);
    expect(lockedElements[2].locked).toBe(false);
  });

  it("deletes selected elements and clears the live selection", () => {
    const updateScene = vi.fn();
    const api = {
      getAppState: () => ({
        selectedElementIds: {
          "image-1": true,
          "image-2": true,
        },
        viewBackgroundColor: "#ffffff",
      }),
      getSceneElements: () => [
        { id: "image-1", type: "image", isDeleted: false, version: 1 },
        { id: "image-2", type: "image", isDeleted: false, version: 1 },
        { id: "shape-1", type: "rectangle", isDeleted: false, version: 1 },
      ],
      updateScene,
    };

    const result = deleteSelectedCanvasElements(api as any);
    const payload = updateScene.mock.calls[0]?.[0];

    expect(result.deletedCount).toBe(2);
    expect(payload.appState.selectedElementIds).toEqual({});
    expect(payload.elements[0].isDeleted).toBe(true);
    expect(payload.elements[1].isDeleted).toBe(true);
    expect(payload.elements[2].isDeleted).toBe(false);
  });

  it("duplicates the selected elements and switches the live selection to the clones", () => {
    const updateScene = vi.fn();
    const api = {
      getAppState: () => ({
        selectedElementIds: {
          "image-1": true,
        },
      }),
      getSceneElements: () => [
        {
          id: "image-1",
          type: "image",
          x: 120,
          y: 80,
          width: 640,
          height: 480,
          groupIds: [],
          version: 1,
          isDeleted: false,
        },
      ],
      updateScene,
    };

    const result = duplicateSelectedCanvasElements(api as any);
    const payload = updateScene.mock.calls[0]?.[0];
    const duplicatedElements = payload.elements;
    const original = duplicatedElements[0];
    const clone = duplicatedElements[1];

    expect(result.duplicatedCount).toBe(1);
    expect(duplicatedElements).toHaveLength(2);
    expect(clone.id).not.toBe(original.id);
    expect(clone.x).toBe(original.x + 10);
    expect(clone.y).toBe(original.y + 10);
    expect(payload.appState.selectedElementIds).toEqual({
      [clone.id]: true,
    });
  });
});
