import { describe, expect, it } from "vitest";

import {
  ARCHITECTURE_BOARD_KINDS,
  deriveArchitectureContextFromScene,
  insertArchitectureBoardIntoScene,
  insertArchitectureBoardStackIntoScene,
  type ArchitectureBoardKind,
  type ArchitectureSceneElement,
} from "../src/lib/architecture-canvas";

const VIEWPORT_APP_STATE = {
  scrollX: 0,
  scrollY: 0,
  width: 1600,
  height: 900,
  zoom: { value: 1 },
} as const;

function getArchitectureMeta(element: ArchitectureSceneElement) {
  const customData = element.customData as Record<string, unknown> | undefined;
  const architecture = customData?.architecture;
  if (!architecture || typeof architecture !== "object") {
    return null;
  }
  return architecture as Record<string, unknown>;
}

function getBoardRoot(
  elements: readonly ArchitectureSceneElement[],
  kind: ArchitectureBoardKind,
) {
  return elements.find((element) => {
    const meta = getArchitectureMeta(element);
    return (
      meta?.role === "board-root" &&
      meta?.boardKind === kind
    );
  });
}

describe("architecture-canvas helpers", () => {
  it("inserts a single board with stable architecture metadata and skips duplicates", () => {
    const inserted = insertArchitectureBoardIntoScene({
      appState: VIEWPORT_APP_STATE,
      boardKind: "site_analysis",
      elements: [],
    });

    expect(inserted.inserted).toBe(true);
    expect(inserted.insertedRootElementId).toBeTruthy();

    const root = getBoardRoot(inserted.elements, "site_analysis");
    expect(root).toBeDefined();
    expect(root?.type).toBe("rectangle");

    const rootMeta = root ? getArchitectureMeta(root) : null;
    expect(rootMeta?.boardKind).toBe("site_analysis");
    expect(rootMeta?.boardId).toBe("architecture-board-site_analysis");
    expect(rootMeta?.role).toBe("board-root");

    const secondInsert = insertArchitectureBoardIntoScene({
      appState: VIEWPORT_APP_STATE,
      boardKind: "site_analysis",
      elements: inserted.elements,
    });

    expect(secondInsert.inserted).toBe(false);
    expect(secondInsert.elements).toHaveLength(inserted.elements.length);
  });

  it("lays out the full studio stack while preserving already inserted boards", () => {
    const first = insertArchitectureBoardIntoScene({
      appState: VIEWPORT_APP_STATE,
      boardKind: "reference_board",
      elements: [],
    });

    const stacked = insertArchitectureBoardStackIntoScene({
      appState: VIEWPORT_APP_STATE,
      elements: first.elements,
    });

    expect(stacked.insertedKinds).toHaveLength(ARCHITECTURE_BOARD_KINDS.length - 1);
    expect(stacked.elements.length).toBeGreaterThan(first.elements.length);

    const context = deriveArchitectureContextFromScene({
      elements: stacked.elements,
      selectedElementIds: [],
    });

    expect(context.boards).toHaveLength(ARCHITECTURE_BOARD_KINDS.length);
    expect(context.boards.every((board) => board.status === "seeded")).toBe(true);
  });

  it("derives active board and selected object types from scene selection", () => {
    const stacked = insertArchitectureBoardStackIntoScene({
      appState: VIEWPORT_APP_STATE,
      elements: [],
    });

    const selectedElement = stacked.elements.find((element) => {
      const meta = getArchitectureMeta(element);
      return meta?.boardKind === "massing_options" && meta?.objectType === "massing_option";
    });

    expect(selectedElement).toBeDefined();

    const context = deriveArchitectureContextFromScene({
      elements: stacked.elements,
      selectedElementIds: selectedElement ? [selectedElement.id] : [],
    });

    expect(context.activeBoardId).toBe("architecture-board-massing_options");
    expect(context.objectTypesInSelection).toContain("massing_option");
    expect(
      context.boards.find((board) => board.kind === "massing_options")?.status,
    ).toBe("active");
    expect(context.selectedElementIds).toEqual(
      selectedElement ? [selectedElement.id] : [],
    );
  });

  it("returns missing statuses for every board on an empty scene", () => {
    const context = deriveArchitectureContextFromScene({
      elements: [],
      selectedElementIds: ["element-a", "element-b"],
    });

    expect(context.boards).toHaveLength(ARCHITECTURE_BOARD_KINDS.length);
    expect(context.boards.every((board) => board.status === "missing")).toBe(true);
    expect(context.activeBoardId).toBeUndefined();
    expect(context.selectedElementIds).toEqual(["element-a", "element-b"]);
  });
});
