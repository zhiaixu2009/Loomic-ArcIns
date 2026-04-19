import type { CanvasSelectedElement } from "../components/canvas-editor";

export type CanvasContextMenuMode =
  | "blank"
  | "selection"
  | "single-image"
  | "multi-image";

export type CanvasComposerCommand =
  | {
      id: string;
      type: "attach-selection";
    }
  | {
      id: string;
      type: "apply-template";
      prompt: string;
      attachSelection?: boolean;
    };

export type CanvasSceneOrderDirection =
  | "forward"
  | "backward"
  | "front"
  | "back";

export function getCanvasContextMenuMode(
  selectedCanvasElements?: CanvasSelectedElement[],
): CanvasContextMenuMode {
  const elements = selectedCanvasElements ?? [];
  if (elements.length === 0) {
    return "blank";
  }

  const imageElements = elements.filter(
    (element) =>
      element.type === "image" && Boolean(element.storageUrl || element.dataUrl),
  );

  if (imageElements.length > 1) {
    return "multi-image";
  }

  if (imageElements.length === 1) {
    return "single-image";
  }

  return "selection";
}

function createGroupId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `group_${Math.random().toString(36).slice(2, 10)}`;
}

function createDuplicatedElementId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `duplicate_${Math.random().toString(36).slice(2, 10)}`;
}

type ExcalidrawGroupApi = {
  getAppState: () => {
    selectedElementIds?: Record<string, boolean>;
    [key: string]: unknown;
  };
  getSceneElements: () => readonly Record<string, any>[];
  updateScene: (scene: {
    elements: Record<string, any>[];
    appState?: Record<string, unknown>;
    captureUpdate?: string;
  }) => void;
};

function getSelectedCanvasElementIds(api: ExcalidrawGroupApi) {
  return Object.entries(api.getAppState().selectedElementIds ?? {})
    .filter(([, selected]) => selected)
    .map(([id]) => id);
}

function normalizeExplicitCanvasElementIds(elementIds: readonly string[]) {
  return elementIds.filter((id): id is string => typeof id === "string" && id.length > 0);
}

function bumpSceneElement(element: Record<string, any>, updatedAt: number) {
  return {
    ...element,
    version: typeof element.version === "number" ? element.version + 1 : 1,
    versionNonce: Math.floor(Math.random() * 2_000_000_000),
    updated: updatedAt,
  };
}

export function groupSelectedCanvasElements(api: ExcalidrawGroupApi): {
  groupId: string | null;
  groupedCount: number;
} {
  const selectedIds = getSelectedCanvasElementIds(api);

  if (selectedIds.length < 2) {
    return {
      groupId: null,
      groupedCount: 0,
    };
  }

  const selectedIdSet = new Set(selectedIds);
  const groupId = createGroupId();
  const updatedAt = Date.now();

  const nextElements = api.getSceneElements().map((element) => {
    if (!selectedIdSet.has(String(element.id)) || element.isDeleted) {
      return element;
    }

    const currentGroupIds = Array.isArray(element.groupIds)
      ? element.groupIds.filter(
          (value: unknown): value is string => typeof value === "string",
        )
      : [];

    return {
      ...element,
      groupIds: currentGroupIds.includes(groupId)
        ? currentGroupIds
        : [...currentGroupIds, groupId],
      version: typeof element.version === "number" ? element.version + 1 : 1,
      versionNonce: Math.floor(Math.random() * 2_000_000_000),
      updated: updatedAt,
    };
  });

  api.updateScene({
    elements: nextElements as Record<string, any>[],
    captureUpdate: "IMMEDIATELY",
  });

  return {
    groupId,
    groupedCount: selectedIds.length,
  };
}

export function ungroupSelectedCanvasElements(
  api: ExcalidrawGroupApi,
): {
  ungroupedCount: number;
} {
  const selectedIds = getSelectedCanvasElementIds(api);
  if (selectedIds.length === 0) {
    return {
      ungroupedCount: 0,
    };
  }

  const selectedIdSet = new Set(selectedIds);
  const updatedAt = Date.now();
  let ungroupedCount = 0;

  const nextElements = api.getSceneElements().map((element) => {
    if (element.isDeleted || !selectedIdSet.has(String(element.id))) {
      return element;
    }

    if (!Array.isArray(element.groupIds) || element.groupIds.length === 0) {
      return element;
    }

    ungroupedCount += 1;
    return bumpSceneElement(
      {
        ...element,
        groupIds: [],
      },
      updatedAt,
    );
  });

  if (ungroupedCount === 0) {
    return {
      ungroupedCount: 0,
    };
  }

  api.updateScene({
    elements: nextElements as Record<string, any>[],
    captureUpdate: "IMMEDIATELY",
  });

  return {
    ungroupedCount,
  };
}

export function reorderSelectedCanvasElements(
  api: ExcalidrawGroupApi,
  direction: CanvasSceneOrderDirection,
): {
  movedCount: number;
} {
  const selectedIds = getSelectedCanvasElementIds(api);
  if (selectedIds.length === 0) {
    return {
      movedCount: 0,
    };
  }

  const selectedIdSet = new Set(selectedIds);
  const currentElements = api.getSceneElements().slice() as Record<string, any>[];
  const nextElements = currentElements.slice();

  const isSelected = (element: Record<string, any> | undefined) =>
    Boolean(element && !element.isDeleted && selectedIdSet.has(String(element.id)));

  let movedCount = 0;

  if (direction === "forward") {
    for (let index = nextElements.length - 2; index >= 0; index -= 1) {
      const currentElement = nextElements[index];
      const nextElement = nextElements[index + 1];
      if (!currentElement || !nextElement) {
        continue;
      }
      if (isSelected(currentElement) && !isSelected(nextElement)) {
        [nextElements[index], nextElements[index + 1]] = [
          nextElement,
          currentElement,
        ];
        movedCount += 1;
      }
    }
  } else if (direction === "backward") {
    for (let index = 1; index < nextElements.length; index += 1) {
      const currentElement = nextElements[index];
      const previousElement = nextElements[index - 1];
      if (!currentElement || !previousElement) {
        continue;
      }
      if (isSelected(currentElement) && !isSelected(previousElement)) {
        [nextElements[index - 1], nextElements[index]] = [
          currentElement,
          previousElement,
        ];
        movedCount += 1;
      }
    }
  } else {
    const selectedElements = nextElements.filter((element) => isSelected(element));
    const unselectedElements = nextElements.filter((element) => !isSelected(element));
    const reorderedElements =
      direction === "front"
        ? [...unselectedElements, ...selectedElements]
        : [...selectedElements, ...unselectedElements];

    movedCount = reorderedElements.some(
      (element, index) => element.id !== nextElements[index]?.id,
    )
      ? selectedElements.length
      : 0;

    nextElements.splice(0, nextElements.length, ...reorderedElements);
  }

  if (movedCount === 0) {
    return {
      movedCount: 0,
    };
  }

  api.updateScene({
    elements: nextElements,
    captureUpdate: "IMMEDIATELY",
  });

  return {
    movedCount,
  };
}

export function reorderCanvasElementsByLayerOrder(
  api: ExcalidrawGroupApi,
  layerOrder: readonly string[],
): {
  movedCount: number;
} {
  const normalizedLayerOrder = normalizeExplicitCanvasElementIds(layerOrder);
  if (normalizedLayerOrder.length === 0) {
    return {
      movedCount: 0,
    };
  }

  const currentElements = api.getSceneElements() as Record<string, any>[];
  const liveElements = currentElements.filter((element) => !element.isDeleted);
  if (liveElements.length === 0) {
    return {
      movedCount: 0,
    };
  }

  const liveElementById = new Map(
    liveElements.map((element) => [String(element.id), element]),
  );
  const explicitLayerIds = normalizedLayerOrder.filter((id) =>
    liveElementById.has(id),
  );
  const explicitLayerIdSet = new Set(explicitLayerIds);
  const currentDisplayOrder = liveElements.map((element) => String(element.id)).reverse();
  const mergedDisplayOrder = [
    ...explicitLayerIds,
    ...currentDisplayOrder.filter((id) => !explicitLayerIdSet.has(id)),
  ];
  const nextLiveElements = mergedDisplayOrder
    .slice()
    .reverse()
    .map((id) => liveElementById.get(id))
    .filter((element): element is Record<string, any> => Boolean(element));
  const nextLiveIds = nextLiveElements.map((element) => String(element.id));
  const currentLiveIds = liveElements.map((element) => String(element.id));
  const movedCount = nextLiveIds.filter((id, index) => id !== currentLiveIds[index]).length;

  if (movedCount === 0) {
    return {
      movedCount: 0,
    };
  }

  let nextLiveIndex = 0;
  const nextElements = currentElements.map((element) => {
    if (element.isDeleted) {
      return element;
    }

    const nextElement = nextLiveElements[nextLiveIndex];
    nextLiveIndex += 1;
    return nextElement ?? element;
  });

  api.updateScene({
    elements: nextElements,
    captureUpdate: "IMMEDIATELY",
  });

  return {
    movedCount,
  };
}

export function toggleLockCanvasElements(
  api: ExcalidrawGroupApi,
  elementIds: readonly string[],
): {
  affectedCount: number;
  locked: boolean | null;
} {
  const normalizedElementIds = normalizeExplicitCanvasElementIds(elementIds);
  if (normalizedElementIds.length === 0) {
    return {
      affectedCount: 0,
      locked: null,
    };
  }

  const selectedIdSet = new Set(normalizedElementIds);
  const selectedElements = api
    .getSceneElements()
    .filter((element) => !element.isDeleted && selectedIdSet.has(String(element.id)));

  if (selectedElements.length === 0) {
    return {
      affectedCount: 0,
      locked: null,
    };
  }

  const nextLocked = !selectedElements.every((element) => Boolean(element.locked));
  const updatedAt = Date.now();
  const nextElements = api.getSceneElements().map((element) => {
    if (element.isDeleted || !selectedIdSet.has(String(element.id))) {
      return element;
    }

    return bumpSceneElement(
      {
        ...element,
        locked: nextLocked,
      },
      updatedAt,
    );
  });

  api.updateScene({
    elements: nextElements as Record<string, any>[],
    captureUpdate: "IMMEDIATELY",
  });

  return {
    affectedCount: selectedElements.length,
    locked: nextLocked,
  };
}

export function toggleLockSelectedCanvasElements(
  api: ExcalidrawGroupApi,
): {
  affectedCount: number;
  locked: boolean | null;
} {
  return toggleLockCanvasElements(api, getSelectedCanvasElementIds(api));
}

export function toggleVisibilityCanvasElements(
  api: ExcalidrawGroupApi,
  elementIds: readonly string[],
): {
  affectedCount: number;
  hidden: boolean | null;
} {
  const normalizedElementIds = normalizeExplicitCanvasElementIds(elementIds);
  if (normalizedElementIds.length === 0) {
    return {
      affectedCount: 0,
      hidden: null,
    };
  }

  const selectedIdSet = new Set(normalizedElementIds);
  const selectedElements = api
    .getSceneElements()
    .filter((element) => !element.isDeleted && selectedIdSet.has(String(element.id)));

  if (selectedElements.length === 0) {
    return {
      affectedCount: 0,
      hidden: null,
    };
  }

  const nextHidden = !selectedElements.every(
    (element) => element.opacity === 0 || element.customData?.hidden === true,
  );
  const updatedAt = Date.now();

  const nextElements = api.getSceneElements().map((element) => {
    if (element.isDeleted || !selectedIdSet.has(String(element.id))) {
      return element;
    }

    const nextCustomData = {
      ...(element.customData ?? {}),
      hidden: nextHidden,
    };

    return bumpSceneElement(
      {
        ...element,
        opacity: nextHidden ? 0 : 100,
        customData: nextCustomData,
      },
      updatedAt,
    );
  });

  api.updateScene({
    elements: nextElements as Record<string, any>[],
    captureUpdate: "IMMEDIATELY",
  });

  return {
    affectedCount: selectedElements.length,
    hidden: nextHidden,
  };
}

export function toggleVisibilitySelectedCanvasElements(
  api: ExcalidrawGroupApi,
): {
  affectedCount: number;
  hidden: boolean | null;
} {
  return toggleVisibilityCanvasElements(api, getSelectedCanvasElementIds(api));
}

export function deleteSelectedCanvasElements(
  api: ExcalidrawGroupApi,
): {
  deletedCount: number;
} {
  const selectedIds = getSelectedCanvasElementIds(api);
  if (selectedIds.length === 0) {
    return {
      deletedCount: 0,
    };
  }

  const selectedIdSet = new Set(selectedIds);
  const updatedAt = Date.now();
  let deletedCount = 0;

  const nextElements = api.getSceneElements().map((element) => {
    if (element.isDeleted || !selectedIdSet.has(String(element.id))) {
      return element;
    }

    deletedCount += 1;
    return bumpSceneElement(
      {
        ...element,
        isDeleted: true,
      },
      updatedAt,
    );
  });

  if (deletedCount === 0) {
    return {
      deletedCount: 0,
    };
  }

  api.updateScene({
    elements: nextElements as Record<string, any>[],
    appState: {
      ...api.getAppState(),
      selectedElementIds: {},
    },
    captureUpdate: "IMMEDIATELY",
  });

  return {
    deletedCount,
  };
}

export function duplicateSelectedCanvasElements(
  api: ExcalidrawGroupApi,
): {
  duplicatedCount: number;
  duplicatedIds: string[];
} {
  const selectedIds = getSelectedCanvasElementIds(api);
  if (selectedIds.length === 0) {
    return {
      duplicatedCount: 0,
      duplicatedIds: [],
    };
  }

  const selectedIdSet = new Set(selectedIds);
  const offset = 10;
  const duplicatedIds: string[] = [];
  const clones = api
    .getSceneElements()
    .filter((element) => !element.isDeleted && selectedIdSet.has(String(element.id)))
    .map((element) => {
      const duplicatedId = createDuplicatedElementId();
      duplicatedIds.push(duplicatedId);
      return {
        ...element,
        id: duplicatedId,
        x: (element.x ?? 0) + offset,
        y: (element.y ?? 0) + offset,
      };
    });

  if (clones.length === 0) {
    return {
      duplicatedCount: 0,
      duplicatedIds: [],
    };
  }

  const nextSelectedElementIds = Object.fromEntries(
    duplicatedIds.map((id) => [id, true]),
  );

  api.updateScene({
    elements: [...api.getSceneElements(), ...clones] as Record<string, any>[],
    appState: {
      ...api.getAppState(),
      selectedElementIds: nextSelectedElementIds,
    },
    captureUpdate: "IMMEDIATELY",
  });

  return {
    duplicatedCount: clones.length,
    duplicatedIds,
  };
}
