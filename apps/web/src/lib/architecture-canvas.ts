const BOARD_WIDTH = 560;
const BOARD_HEIGHT = 360;
const BOARD_GAP_X = 120;
const BOARD_GAP_Y = 84;
const STACK_GAP_Y = BOARD_HEIGHT + 72;

export const ARCHITECTURE_BOARD_KINDS = [
  "reference_board",
  "site_analysis",
  "massing_options",
  "render_variations",
  "storyboard_shots",
  "video_output",
] as const;

export const ARCHITECTURE_OBJECT_TYPES = [
  "site_analysis",
  "massing_option",
  "facade_direction",
  "render_variation",
  "storyboard_shot",
  "presentation_video_shot",
  "review_checkpoint",
] as const;

export const ARCHITECTURE_BOARD_STATUSES = [
  "missing",
  "seeded",
  "active",
] as const;

export const ARCHITECTURE_STRATEGY_DISPOSITIONS = [
  "proposed",
  "selected",
  "rejected",
] as const;

export type ArchitectureBoardKind = (typeof ARCHITECTURE_BOARD_KINDS)[number];
export type ArchitectureObjectType = (typeof ARCHITECTURE_OBJECT_TYPES)[number];
export type ArchitectureBoardStatus = (typeof ARCHITECTURE_BOARD_STATUSES)[number];
export type ArchitectureStrategyDisposition = (typeof ARCHITECTURE_STRATEGY_DISPOSITIONS)[number];

export type ArchitectureStrategyOption = {
  optionId: string;
  title: string;
  summary: string;
  disposition: ArchitectureStrategyDisposition;
};

export type ArchitectureBoard = {
  boardId: string;
  kind: ArchitectureBoardKind;
  title: string;
  status: ArchitectureBoardStatus;
  elementIds: string[];
  anchor: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  objectTypes: ArchitectureObjectType[];
};

export type ArchitectureContext = {
  studio: "architecture";
  boards: ArchitectureBoard[];
  activeBoardId?: string;
  selectedElementIds: string[];
  objectTypesInSelection: ArchitectureObjectType[];
  strategyOptions: ArchitectureStrategyOption[];
};

type ArchitectureElementRole = "board-root" | "board-title" | "board-placeholder";

type ArchitectureElementMetadata = {
  boardId: string;
  boardKind: ArchitectureBoardKind;
  role: ArchitectureElementRole;
  objectType?: ArchitectureObjectType;
  strategyOption?: ArchitectureStrategyOption;
};

export type ArchitectureSceneElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDeleted?: boolean;
  text?: string;
  customData?: Record<string, unknown>;
  [key: string]: unknown;
};

type ArchitectureSceneAppState = {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
  zoom?: { value?: number };
};

type ArchitecturePlaceholderTemplate = {
  prompt: string;
  objectType?: ArchitectureObjectType;
};

type ArchitectureBoardTemplate = {
  kind: ArchitectureBoardKind;
  title: string;
  subtitle: string;
  accentColor: string;
  objectTypes: ArchitectureObjectType[];
  placeholders: ArchitecturePlaceholderTemplate[];
};

type BoardInsertArgs = {
  elements: readonly ArchitectureSceneElement[];
  boardKind: ArchitectureBoardKind;
  appState: ArchitectureSceneAppState;
};

type BoardStackInsertArgs = {
  elements: readonly ArchitectureSceneElement[];
  appState: ArchitectureSceneAppState;
};

type DeriveArchitectureContextArgs = {
  elements: readonly ArchitectureSceneElement[];
  selectedElementIds: readonly string[];
};

type CreateBoardElementsArgs = {
  kind: ArchitectureBoardKind;
  anchor: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type SceneBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export const ARCHITECTURE_BOARD_TEMPLATES: Record<
  ArchitectureBoardKind,
  ArchitectureBoardTemplate
> = {
  reference_board: {
    kind: "reference_board",
    title: "Reference board",
    subtitle: "Gather precedent images, materials, and tonal direction.",
    accentColor: "#334155",
    objectTypes: [],
    placeholders: [
      { prompt: "Pin site-adjacent references and precedent projects." },
      { prompt: "Note material direction, lighting, and atmosphere anchors." },
      { prompt: "Capture constraints before strategy selection." },
    ],
  },
  site_analysis: {
    kind: "site_analysis",
    title: "Site analysis",
    subtitle: "Frame constraints, opportunities, and first-pass risks.",
    accentColor: "#166534",
    objectTypes: ["site_analysis", "review_checkpoint"],
    placeholders: [
      { prompt: "Map access, orientation, and local context", objectType: "site_analysis" },
      { prompt: "Annotate zoning, height, and environmental limits", objectType: "site_analysis" },
      { prompt: "Add review checkpoint for strategy lock", objectType: "review_checkpoint" },
    ],
  },
  massing_options: {
    kind: "massing_options",
    title: "Massing options",
    subtitle: "Compare 2-3 volume strategies before rendering.",
    accentColor: "#7C2D12",
    objectTypes: ["massing_option", "facade_direction", "review_checkpoint"],
    placeholders: [
      { prompt: "Option A: base massing + rationale", objectType: "massing_option" },
      { prompt: "Option B: alternate envelope direction", objectType: "massing_option" },
      { prompt: "Capture facade direction + selection notes", objectType: "facade_direction" },
    ],
  },
  render_variations: {
    kind: "render_variations",
    title: "Render variations",
    subtitle: "Evaluate facade, lighting, and camera compositions.",
    accentColor: "#7C3AED",
    objectTypes: ["render_variation", "review_checkpoint"],
    placeholders: [
      { prompt: "Render set 1: day-lighting baseline", objectType: "render_variation" },
      { prompt: "Render set 2: dusk + material emphasis", objectType: "render_variation" },
      { prompt: "Checkpoint: selected render direction", objectType: "review_checkpoint" },
    ],
  },
  storyboard_shots: {
    kind: "storyboard_shots",
    title: "Storyboard shots",
    subtitle: "Sequence presentation beats for walkthrough narrative.",
    accentColor: "#0F766E",
    objectTypes: ["storyboard_shot", "review_checkpoint"],
    placeholders: [
      { prompt: "Shot 01: contextual reveal", objectType: "storyboard_shot" },
      { prompt: "Shot 02: pedestrian sequence", objectType: "storyboard_shot" },
      { prompt: "Shot 03: signature facade moment", objectType: "storyboard_shot" },
    ],
  },
  video_output: {
    kind: "video_output",
    title: "Video output",
    subtitle: "Consolidate script, edits, and approval comments.",
    accentColor: "#111827",
    objectTypes: ["presentation_video_shot", "review_checkpoint"],
    placeholders: [
      { prompt: "Clip list + sequencing notes", objectType: "presentation_video_shot" },
      { prompt: "Voice-over and pacing adjustments", objectType: "presentation_video_shot" },
      { prompt: "Final approval checkpoint", objectType: "review_checkpoint" },
    ],
  },
};

export function boardIdForKind(kind: ArchitectureBoardKind): string {
  return `architecture-board-${kind}`;
}

export function createEmptyArchitectureContext(
  selectedElementIds: readonly string[] = [],
): ArchitectureContext {
  return {
    studio: "architecture",
    boards: ARCHITECTURE_BOARD_KINDS.map((kind, index) => {
      const template = ARCHITECTURE_BOARD_TEMPLATES[kind];
      return {
        boardId: boardIdForKind(kind),
        kind,
        title: template.title,
        status: "missing" as const,
        elementIds: [],
        anchor: {
          x: 0,
          y: index * (BOARD_HEIGHT + BOARD_GAP_Y),
          width: BOARD_WIDTH,
          height: BOARD_HEIGHT,
        },
        objectTypes: [...template.objectTypes],
      };
    }),
    selectedElementIds: [...selectedElementIds],
    objectTypesInSelection: [],
    strategyOptions: [],
  };
}

export function insertArchitectureBoardIntoScene(args: BoardInsertArgs): {
  elements: ArchitectureSceneElement[];
  inserted: boolean;
  boardId: string;
  insertedRootElementId?: string;
} {
  const boardId = boardIdForKind(args.boardKind);
  const existingRoot = findBoardRootByKind(args.elements, args.boardKind);
  if (existingRoot) {
    return {
      elements: [...args.elements],
      inserted: false,
      boardId,
      insertedRootElementId: existingRoot.id,
    };
  }

  const anchor = resolveSingleBoardAnchor(args.elements, args.appState);
  const created = createBoardElements({
    kind: args.boardKind,
    anchor,
  });

  return {
    elements: [...args.elements, ...created.elements],
    inserted: true,
    boardId,
    insertedRootElementId: created.rootElementId,
  };
}

export function insertArchitectureBoardStackIntoScene(
  args: BoardStackInsertArgs,
): {
  elements: ArchitectureSceneElement[];
  insertedKinds: ArchitectureBoardKind[];
  insertedRootElementId?: string;
} {
  const existingKinds = new Set(
    ARCHITECTURE_BOARD_KINDS.filter((kind) => findBoardRootByKind(args.elements, kind)),
  );

  const missingKinds = ARCHITECTURE_BOARD_KINDS.filter(
    (kind) => !existingKinds.has(kind),
  );

  if (missingKinds.length === 0) {
    return {
      elements: [...args.elements],
      insertedKinds: [],
    };
  }

  const startAnchor = resolveStackAnchor(args.elements, args.appState, missingKinds.length);
  const insertedElements: ArchitectureSceneElement[] = [];
  let insertedRootElementId: string | undefined;

  missingKinds.forEach((kind, index) => {
    const boardAnchor = {
      x: startAnchor.x,
      y: startAnchor.y + index * STACK_GAP_Y,
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
    };
    const created = createBoardElements({
      kind,
      anchor: boardAnchor,
    });
    insertedElements.push(...created.elements);
    if (!insertedRootElementId) {
      insertedRootElementId = created.rootElementId;
    }
  });

  return {
    elements: [...args.elements, ...insertedElements],
    insertedKinds: missingKinds,
    ...(insertedRootElementId ? { insertedRootElementId } : {}),
  };
}

export function deriveArchitectureContextFromScene(
  args: DeriveArchitectureContextArgs,
): ArchitectureContext {
  const boardMap = new Map<
    string,
    {
      boardId: string;
      kind: ArchitectureBoardKind;
      title: string;
      elementIds: Set<string>;
      objectTypes: Set<ArchitectureObjectType>;
      anchor?: { x: number; y: number; width: number; height: number };
      hasRoot: boolean;
    }
  >();
  const selectedSet = new Set(args.selectedElementIds);
  const selectedBoardIds = new Set<string>();
  const selectedObjectTypes = new Set<ArchitectureObjectType>();
  const strategyOptionMap = new Map<string, ArchitectureStrategyOption>();

  for (const element of args.elements) {
    if (element.isDeleted) continue;
    const metadata = readArchitectureMetadata(element);
    if (!metadata) continue;

    const existing = boardMap.get(metadata.boardId);
    const boardState = existing ?? {
      boardId: metadata.boardId,
      kind: metadata.boardKind,
      title: ARCHITECTURE_BOARD_TEMPLATES[metadata.boardKind].title,
      elementIds: new Set<string>(),
      objectTypes: new Set<ArchitectureObjectType>(),
      hasRoot: false,
    };

    boardState.elementIds.add(element.id);
    if (metadata.objectType) {
      boardState.objectTypes.add(metadata.objectType);
    }
    if (metadata.role === "board-root") {
      boardState.hasRoot = true;
      boardState.anchor = toAnchor(element);
    }
    if (metadata.strategyOption) {
      strategyOptionMap.set(
        metadata.strategyOption.optionId,
        metadata.strategyOption,
      );
    }

    boardMap.set(metadata.boardId, boardState);

    if (selectedSet.has(element.id)) {
      selectedBoardIds.add(metadata.boardId);
      if (metadata.objectType) {
        selectedObjectTypes.add(metadata.objectType);
      }
    }
  }

  const activeBoardId = ARCHITECTURE_BOARD_KINDS.map((kind) => boardIdForKind(kind)).find(
    (boardId) => selectedBoardIds.has(boardId),
  );

  const boards: ArchitectureBoard[] = ARCHITECTURE_BOARD_KINDS.map((kind, index) => {
    const template = ARCHITECTURE_BOARD_TEMPLATES[kind];
    const boardId = boardIdForKind(kind);
    const boardState = boardMap.get(boardId);
    if (!boardState || !boardState.hasRoot) {
      return {
        boardId,
        kind,
        title: template.title,
        status: "missing",
        elementIds: [],
        anchor: {
          x: 0,
          y: index * (BOARD_HEIGHT + BOARD_GAP_Y),
          width: BOARD_WIDTH,
          height: BOARD_HEIGHT,
        },
        objectTypes: [...template.objectTypes],
      };
    }

    return {
      boardId,
      kind,
      title: boardState.title,
      status: activeBoardId === boardId ? "active" : "seeded",
      elementIds: Array.from(boardState.elementIds),
      anchor: boardState.anchor ?? {
        x: 0,
        y: index * (BOARD_HEIGHT + BOARD_GAP_Y),
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
      },
      objectTypes: boardState.objectTypes.size
        ? Array.from(boardState.objectTypes)
        : [...template.objectTypes],
    };
  });

  return {
    studio: "architecture",
    boards,
    ...(activeBoardId ? { activeBoardId } : {}),
    selectedElementIds: [...args.selectedElementIds],
    objectTypesInSelection: Array.from(selectedObjectTypes),
    strategyOptions: Array.from(strategyOptionMap.values()),
  };
}

function resolveSingleBoardAnchor(
  elements: readonly ArchitectureSceneElement[],
  appState: ArchitectureSceneAppState,
) {
  const bounds = getSceneBounds(elements);
  const center = getViewportCenter(appState);

  if (!bounds) {
    return {
      x: center.x - BOARD_WIDTH / 2,
      y: center.y - BOARD_HEIGHT / 2,
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
    };
  }

  return {
    x: bounds.maxX + BOARD_GAP_X,
    y: Math.min(bounds.minY, center.y - BOARD_HEIGHT / 2),
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
  };
}

function resolveStackAnchor(
  elements: readonly ArchitectureSceneElement[],
  appState: ArchitectureSceneAppState,
  missingCount: number,
) {
  const bounds = getSceneBounds(elements);
  const center = getViewportCenter(appState);
  const stackHeight = missingCount * BOARD_HEIGHT + (missingCount - 1) * (STACK_GAP_Y - BOARD_HEIGHT);

  if (!bounds) {
    return {
      x: center.x - BOARD_WIDTH / 2,
      y: center.y - stackHeight / 2,
    };
  }

  return {
    x: bounds.maxX + BOARD_GAP_X,
    y: Math.min(bounds.minY, center.y - stackHeight / 2),
  };
}

function createBoardElements(args: CreateBoardElementsArgs): {
  elements: ArchitectureSceneElement[];
  rootElementId: string;
} {
  const boardId = boardIdForKind(args.kind);
  const template = ARCHITECTURE_BOARD_TEMPLATES[args.kind];
  const rootElementId = generateElementId();

  const root = createRectangleElement({
    x: args.anchor.x,
    y: args.anchor.y,
    width: args.anchor.width,
    height: args.anchor.height,
    strokeColor: template.accentColor,
    backgroundColor: "#FFFDF8",
    metadata: {
      boardId,
      boardKind: args.kind,
      role: "board-root",
    },
    id: rootElementId,
  });

  const title = createTextElement({
    x: args.anchor.x + 24,
    y: args.anchor.y + 24,
    text: template.title,
    fontSize: 30,
    strokeColor: template.accentColor,
    metadata: {
      boardId,
      boardKind: args.kind,
      role: "board-title",
    },
  });

  const subtitle = createTextElement({
    x: args.anchor.x + 24,
    y: args.anchor.y + 72,
    text: template.subtitle,
    fontSize: 18,
    strokeColor: "#475569",
    metadata: {
      boardId,
      boardKind: args.kind,
      role: "board-placeholder",
    },
  });

  const placeholderElements = template.placeholders.map((placeholder, index) =>
    createTextElement({
      x: args.anchor.x + 24,
      y: args.anchor.y + 132 + index * 56,
      text: `• ${placeholder.prompt}`,
      fontSize: 18,
      strokeColor: "#334155",
      metadata: {
        boardId,
        boardKind: args.kind,
        role: "board-placeholder",
        ...(placeholder.objectType ? { objectType: placeholder.objectType } : {}),
      },
    }),
  );

  return {
    elements: [root, title, subtitle, ...placeholderElements],
    rootElementId,
  };
}

function createRectangleElement(args: {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  backgroundColor: string;
  metadata: ArchitectureElementMetadata;
}): ArchitectureSceneElement {
  return {
    ...createBaseElement({
      id: args.id,
      type: "rectangle",
      x: args.x,
      y: args.y,
      width: args.width,
      height: args.height,
      strokeColor: args.strokeColor,
      backgroundColor: args.backgroundColor,
    }),
    customData: {
      architecture: args.metadata,
    },
  };
}

function createTextElement(args: {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  strokeColor: string;
  metadata: ArchitectureElementMetadata;
}): ArchitectureSceneElement {
  const width = estimateTextWidth(args.text, args.fontSize);
  const height = Math.max(26, Math.round(args.fontSize * 1.28));
  return {
    ...createBaseElement({
      type: "text",
      x: args.x,
      y: args.y,
      width,
      height,
      strokeColor: args.strokeColor,
      backgroundColor: "transparent",
    }),
    text: args.text,
    fontSize: args.fontSize,
    fontFamily: 1,
    textAlign: "left",
    verticalAlign: "top",
    lineHeight: 1.25,
    baseline: Math.round(args.fontSize * 1.1),
    originalText: args.text,
    autoResize: true,
    customData: {
      architecture: args.metadata,
    },
  };
}

function createBaseElement(args: {
  id?: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  backgroundColor: string;
}) {
  return {
    id: args.id ?? generateElementId(),
    type: args.type,
    x: args.x,
    y: args.y,
    width: args.width,
    height: args.height,
    angle: 0,
    strokeColor: args.strokeColor,
    backgroundColor: args.backgroundColor,
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: { type: 3 },
    boundElements: null,
    frameId: null,
    index: null,
    seed: randomInt(),
    version: 1,
    versionNonce: randomInt(),
    isDeleted: false,
    updated: Date.now(),
    link: null,
    locked: false,
  };
}

function findBoardRootByKind(
  elements: readonly ArchitectureSceneElement[],
  kind: ArchitectureBoardKind,
) {
  return elements.find((element) => {
    if (element.isDeleted) return false;
    const metadata = readArchitectureMetadata(element);
    if (!metadata) return false;
    return metadata.boardKind === kind && metadata.role === "board-root";
  });
}

function readArchitectureMetadata(
  element: ArchitectureSceneElement,
): ArchitectureElementMetadata | null {
  const customData = element.customData;
  if (!customData || typeof customData !== "object") {
    return null;
  }
  const maybeArchitecture = (customData as Record<string, unknown>).architecture;
  if (!maybeArchitecture || typeof maybeArchitecture !== "object") {
    return null;
  }

  const metadata = maybeArchitecture as Record<string, unknown>;
  const boardId = metadata.boardId;
  const boardKind = metadata.boardKind;
  const role = metadata.role;
  if (
    typeof boardId !== "string" ||
    !isArchitectureBoardKind(boardKind) ||
    (role !== "board-root" && role !== "board-title" && role !== "board-placeholder")
  ) {
    return null;
  }

  const objectType = isArchitectureObjectType(metadata.objectType)
    ? metadata.objectType
    : undefined;

  const strategyOption = toArchitectureStrategyOption(metadata.strategyOption);

  return {
    boardId,
    boardKind,
    role,
    ...(objectType ? { objectType } : {}),
    ...(strategyOption ? { strategyOption } : {}),
  };
}

function toArchitectureStrategyOption(value: unknown): ArchitectureStrategyOption | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.optionId !== "string" ||
    typeof raw.title !== "string" ||
    typeof raw.summary !== "string" ||
    !isArchitectureStrategyDisposition(raw.disposition)
  ) {
    return null;
  }
  return {
    optionId: raw.optionId,
    title: raw.title,
    summary: raw.summary,
    disposition: raw.disposition,
  };
}

function getSceneBounds(
  elements: readonly ArchitectureSceneElement[],
): SceneBounds | null {
  const live = elements.filter((element) => !element.isDeleted);
  if (live.length === 0) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const element of live) {
    minX = Math.min(minX, element.x);
    minY = Math.min(minY, element.y);
    maxX = Math.max(maxX, element.x + element.width);
    maxY = Math.max(maxY, element.y + element.height);
  }

  return { minX, minY, maxX, maxY };
}

function getViewportCenter(appState: ArchitectureSceneAppState) {
  const zoom = appState.zoom?.value ?? 1;
  return {
    x: -appState.scrollX + appState.width / (2 * zoom),
    y: -appState.scrollY + appState.height / (2 * zoom),
  };
}

function toAnchor(element: ArchitectureSceneElement) {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

function estimateTextWidth(text: string, fontSize: number) {
  return Math.max(140, Math.round(text.length * fontSize * 0.58));
}

function generateElementId() {
  return `arch_${Math.random().toString(36).slice(2, 11)}`;
}

function randomInt() {
  return Math.floor(Math.random() * 2_000_000_000);
}

function isArchitectureBoardKind(value: unknown): value is ArchitectureBoardKind {
  return typeof value === "string" && ARCHITECTURE_BOARD_KINDS.includes(value as ArchitectureBoardKind);
}

function isArchitectureObjectType(value: unknown): value is ArchitectureObjectType {
  return typeof value === "string" && ARCHITECTURE_OBJECT_TYPES.includes(value as ArchitectureObjectType);
}

function isArchitectureStrategyDisposition(value: unknown): value is ArchitectureStrategyDisposition {
  return (
    typeof value === "string" &&
    ARCHITECTURE_STRATEGY_DISPOSITIONS.includes(value as ArchitectureStrategyDisposition)
  );
}
