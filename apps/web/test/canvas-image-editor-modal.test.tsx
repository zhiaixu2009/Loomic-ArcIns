import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CanvasImageEditorModal } from "../src/components/canvas/canvas-image-editor-modal";

const {
  loadOfficialGalleryLibraryMock,
  loadOfficialGallerySubtypeItemsPageMock,
} = vi.hoisted(() => ({
  loadOfficialGalleryLibraryMock: vi.fn(() =>
    Promise.resolve([
      {
        id: "editor-official",
        label: "Editor Official",
        subtypes: [
          {
            id: "lounge",
            label: "Lounge",
            assetCount: 1,
            items: [],
          },
          {
            id: "plants",
            label: "Plants",
            assetCount: 1,
            items: [],
          },
          {
            id: "buildings",
            label: "Buildings",
            assetCount: 1,
            items: [],
          },
          {
            id: "people",
            label: "People",
            assetCount: 1,
            items: [],
          },
          {
            id: "vehicles",
            label: "Vehicles",
            assetCount: 1,
            items: [],
          },
        ],
      },
      {
        id: "editor-people",
        label: "Editor People",
        subtypes: [
          {
            id: "walkers",
            label: "Walkers",
            assetCount: 1,
            items: [],
          },
        ],
      },
      {
        id: "editor-city",
        label: "Editor City",
        subtypes: [
          {
            id: "city-buildings",
            label: "City Buildings",
            assetCount: 1,
            items: [],
          },
        ],
      },
      {
        id: "editor-landscape",
        label: "Editor Landscape",
        subtypes: [
          {
            id: "landscape-items",
            label: "Landscape Items",
            assetCount: 1,
            items: [],
          },
        ],
      },
    ]),
  ),
  loadOfficialGallerySubtypeItemsPageMock: vi.fn(
    async (_accessToken: string, subtypeId: string) => ({
      subtypeId,
      items: [
        {
          id: `${subtypeId}-asset-1`,
          label: `${subtypeId} asset 1`,
          thumbnailUrl: `https://example.com/thumbs/${subtypeId}-asset-1.webp`,
          url: `https://example.com/${subtypeId}-asset-1.png`,
          width: 1200,
          height: 900,
        },
      ],
      nextOffset: null,
      totalCount: 1,
    }),
  ),
}));

vi.mock("../src/lib/official-gallery-library", () => ({
  loadOfficialGalleryLibrary: loadOfficialGalleryLibraryMock,
  loadOfficialGallerySubtypeItemsPage: loadOfficialGallerySubtypeItemsPageMock,
}));

const originalImage = globalThis.Image;
const originalClientWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "clientWidth",
);
const originalClientHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "clientHeight",
);

const baseImage = {
  alt: "Base render",
  elementId: "image-1",
  fileName: "base-render.png",
  source:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP8z8AARQMBgAEVAbEAAAAASUVORK5CYII=",
};

function installEditorDomMocks() {
  class MockImage {
    naturalHeight = 600;
    naturalWidth = 800;
    onerror: null | (() => void) = null;
    onload: null | (() => void) = null;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  }

  globalThis.Image = MockImage as unknown as typeof Image;

  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return 960;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      return 560;
    },
  });

  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    bottom: 560,
    height: 560,
    left: 0,
    right: 960,
    toJSON: () => ({}),
    top: 0,
    width: 960,
    x: 0,
    y: 0,
  } as DOMRect);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () =>
      ({
        font: "",
        measureText: (value: string) => ({
          width: Math.max(48, value.length * 12),
        }),
      }) as unknown as CanvasRenderingContext2D,
  );

  Object.defineProperty(SVGElement.prototype, "setPointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(SVGElement.prototype, "releasePointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(SVGElement.prototype, "hasPointerCapture", {
    configurable: true,
    value: vi.fn(() => true),
  });
}

function restoreEditorDomMocks() {
  globalThis.Image = originalImage;

  if (originalClientWidth) {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", originalClientWidth);
  }
  if (originalClientHeight) {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", originalClientHeight);
  }
}

function renderEditorModal() {
  return render(
    <CanvasImageEditorModal
      accessToken="token-canvas"
      image={baseImage}
      onClose={vi.fn()}
      onRequestExternalAction={vi.fn()}
      onSave={vi.fn(() => Promise.resolve())}
      onSaveAsCopy={vi.fn(() => Promise.resolve())}
      open
    />,
  );
}

async function findStageSvg() {
  await waitFor(() => {
    expect(document.body.querySelector("svg.block")).toBeInTheDocument();
  });

  return document.body.querySelector("svg.block") as SVGSVGElement;
}

function firePrimaryPointer(
  target: Element,
  type: "pointerDown" | "pointerMove" | "pointerUp" | "pointerLeave",
  init: {
    clientX: number;
    clientY: number;
    detail?: number;
    pointerId?: number;
  },
) {
  firePointer(target, type, init);
}

function firePointer(
  target: Element,
  type: "pointerDown" | "pointerMove" | "pointerUp" | "pointerLeave",
  init: {
    button?: number;
    buttons?: number;
    clientX: number;
    clientY: number;
    detail?: number;
    pointerId?: number;
  },
) {
  const event = createEvent[type](target, {
    bubbles: true,
    cancelable: true,
    button: init.button ?? 0,
    buttons: init.buttons ?? (type === "pointerUp" ? 0 : 1),
    clientX: init.clientX,
    clientY: init.clientY,
    detail: init.detail ?? 1,
    pointerId: init.pointerId ?? 1,
  });
  Object.defineProperties(event, {
    button: { configurable: true, value: init.button ?? 0 },
    buttons: {
      configurable: true,
      value: init.buttons ?? (type === "pointerUp" ? 0 : 1),
    },
    clientX: { configurable: true, value: init.clientX },
    clientY: { configurable: true, value: init.clientY },
    detail: { configurable: true, value: init.detail ?? 1 },
    pointerId: { configurable: true, value: init.pointerId ?? 1 },
  });
  fireEvent(target, event);
}

function getStageScale(stageSvg: SVGSVGElement) {
  const viewBox = (stageSvg.getAttribute("viewBox") ?? "0 0 1 1")
    .split(" ")
    .map(Number);
  const viewBoxWidth = viewBox[2] ?? 1;
  const svgWidth = Number(stageSvg.getAttribute("width") ?? 1);
  return svgWidth / viewBoxWidth;
}

function imagePointToClient(
  stageSvg: SVGSVGElement,
  point: { x: number; y: number },
) {
  const [viewX = 0, viewY = 0, viewWidth = 1, viewHeight = 1] = (
    stageSvg.getAttribute("viewBox") ?? "0 0 1 1"
  )
    .split(" ")
    .map(Number);
  const svgWidth = Number(stageSvg.getAttribute("width") ?? 1);
  const svgHeight = Number(stageSvg.getAttribute("height") ?? 1);
  const offsetX = (960 - svgWidth) / 2;
  const offsetY = (560 - svgHeight) / 2;

  return {
    clientX: offsetX + ((point.x - viewX) / (viewWidth || 1)) * svgWidth,
    clientY: offsetY + ((point.y - viewY) / (viewHeight || 1)) * svgHeight,
  };
}

function clientToImagePoint(
  stageSvg: SVGSVGElement,
  point: { clientX: number; clientY: number },
) {
  const [viewX = 0, viewY = 0, viewWidth = 1, viewHeight = 1] = (
    stageSvg.getAttribute("viewBox") ?? "0 0 1 1"
  )
    .split(" ")
    .map(Number);
  const svgWidth = Number(stageSvg.getAttribute("width") ?? 1);
  const svgHeight = Number(stageSvg.getAttribute("height") ?? 1);
  const offsetX = (960 - svgWidth) / 2;
  const offsetY = (560 - svgHeight) / 2;

  return {
    x: viewX + ((point.clientX - offsetX) / svgWidth) * viewWidth,
    y: viewY + ((point.clientY - offsetY) / svgHeight) * viewHeight,
  };
}

function getOverlayResizeHandleClientCenter(
  stageSvg: SVGSVGElement,
  handle: "ne" | "nw" | "se" | "sw",
) {
  const handleElement = screen.getByTestId(`image-editor-overlay-resize-handle-${handle}`);
  const x =
    Number(handleElement.getAttribute("x")) +
    Number(handleElement.getAttribute("width")) / 2;
  const y =
    Number(handleElement.getAttribute("y")) +
    Number(handleElement.getAttribute("height")) / 2;

  return imagePointToClient(stageSvg, { x, y });
}

function readFirstLineGeometry(stageSvg: SVGSVGElement) {
  const line = stageSvg.querySelector("line") as SVGLineElement | null;
  expect(line).toBeInTheDocument();

  return {
    x1: Number(line?.getAttribute("x1") ?? 0),
    y1: Number(line?.getAttribute("y1") ?? 0),
    x2: Number(line?.getAttribute("x2") ?? 0),
    y2: Number(line?.getAttribute("y2") ?? 0),
  };
}

function readFirstDoodlePoint(stageSvg: SVGSVGElement) {
  const doodle = stageSvg.querySelector("polyline") as SVGPolylineElement | null;
  expect(doodle).toBeInTheDocument();
  const [firstPoint = "0,0"] = (doodle?.getAttribute("points") ?? "").trim().split(/\s+/);
  const [x = 0, y = 0] = firstPoint.split(",").map(Number);

  return { x, y };
}

function readViewBox(stageSvg: SVGSVGElement) {
  const [x = 0, y = 0, width = 1, height = 1] = (
    stageSvg.getAttribute("viewBox") ?? "0 0 1 1"
  )
    .split(" ")
    .map(Number);

  return { x, y, width, height };
}

describe("CanvasImageEditorModal", () => {
  beforeEach(() => {
    installEditorDomMocks();
    loadOfficialGalleryLibraryMock.mockClear();
    loadOfficialGallerySubtypeItemsPageMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    restoreEditorDomMocks();
  });

  it("keeps only local upload in the editor gallery header and uses arrow-scrolled category strips", async () => {
    renderEditorModal();

    const selectedCategory = await screen.findByRole("button", {
      name: "Editor Official",
    });

    expect(screen.getByTestId("editor-sticker-panel")).toHaveClass("w-[360px]");
    expect(
      screen.queryByText("宸插垏鎹负鏈湴鍙楁帶鍥惧簱"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("贴图")).not.toBeInTheDocument();
    const firstStickerImage = await screen.findByRole("img", {
      name: "lounge asset 1",
    });
    expect(firstStickerImage).toHaveAttribute(
      "src",
      "https://example.com/thumbs/lounge-asset-1.webp",
    );
    expect(firstStickerImage).toHaveAttribute("loading", "eager");
    expect(firstStickerImage).toHaveAttribute("decoding", "async");
    expect(firstStickerImage).toHaveAttribute("fetchpriority", "high");
    expect(firstStickerImage.closest("button")).toHaveClass("[content-visibility:auto]");
    expect(screen.getByTestId("editor-sticker-category-scroll-left")).toBeInTheDocument();
    expect(screen.getByTestId("editor-sticker-category-scroll-right")).toBeInTheDocument();
    expect(screen.getByTestId("editor-sticker-subcategory-scroll-left")).toBeInTheDocument();
    expect(screen.getByTestId("editor-sticker-subcategory-scroll-right")).toBeInTheDocument();
    expect(screen.getByTestId("editor-sticker-category-strip")).toHaveClass(
      "scrollbar-hidden",
    );
    expect(screen.getByTestId("editor-sticker-subcategory-strip")).toHaveClass(
      "scrollbar-hidden",
    );
    expect(screen.getByTestId("editor-sticker-category-strip")).toHaveClass(
      "w-[254px]",
    );
    expect(screen.getByTestId("editor-sticker-subcategory-strip")).toHaveClass(
      "w-[254px]",
    );
    expect(selectedCategory).toHaveClass("w-[82px]");
    expect(selectedCategory).not.toHaveClass("min-w-[76px]");
    expect(selectedCategory).not.toHaveClass("basis-1/3");
    const selectedSubcategory = await screen.findByRole("button", {
      name: "Lounge",
    });
    expect(selectedSubcategory).toHaveClass("w-[82px]");
    expect(selectedSubcategory).not.toHaveClass("min-w-[76px]");
    expect(selectedSubcategory).not.toHaveClass("basis-1/4");
    expect(selectedSubcategory).not.toHaveClass("border");
    expect(selectedSubcategory).not.toHaveClass("border-slate-300");
    expect(selectedSubcategory).not.toHaveClass("bg-white");
    expect(selectedSubcategory).not.toHaveClass("hover:bg-slate-100");
    expect(selectedSubcategory).toHaveClass("font-medium");
    expect(selectedSubcategory).toHaveClass("text-slate-900");
    await waitFor(() => {
      expect(selectedCategory).toHaveClass("bg-slate-900");
      expect(selectedCategory).toHaveClass("text-white");
    });
  });

  it("updates the stage cursor when switching editor tools", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getByRole("button", { name: "抓手" }));
    expect(stageSvg).toHaveStyle({ cursor: "grab" });

    await user.click(screen.getByRole("button", { name: "文字" }));
    expect(stageSvg).toHaveStyle({ cursor: "text" });

    await user.click(screen.getByRole("button", { name: "裁剪" }));
    expect(stageSvg).toHaveStyle({ cursor: "crosshair" });

    await user.click(screen.getAllByRole("button", { name: "箭头" })[0]!);
    expect(stageSvg).toHaveStyle({ cursor: "crosshair" });

    await user.click(screen.getByRole("button", { name: "涂鸦" }));
    expect(stageSvg).toHaveStyle({ cursor: "crosshair" });
  });

  it("scrolls editor gallery categories by one complete tag without leaving half labels", async () => {
    const user = userEvent.setup();
    renderEditorModal();

    const categoryStrip = await screen.findByTestId("editor-sticker-category-strip");
    const categoryButtons = Array.from(categoryStrip.querySelectorAll("button"));
    expect(categoryButtons.length).toBeGreaterThan(2);

    Object.defineProperty(categoryStrip, "clientWidth", {
      configurable: true,
      value: 240,
    });
    Object.defineProperty(categoryStrip, "scrollLeft", {
      configurable: true,
      writable: true,
      value: 0,
    });
    const offsetParentLeft = 1000;
    categoryButtons.forEach((button, index) => {
      Object.defineProperty(button, "offsetLeft", {
        configurable: true,
        value: offsetParentLeft + index * 84,
      });
      Object.defineProperty(button, "offsetWidth", {
        configurable: true,
        value: 80,
      });
    });

    const scrollToMock = vi.fn();
    Object.defineProperty(categoryStrip, "scrollTo", {
      configurable: true,
      value: scrollToMock,
    });
    Object.defineProperty(categoryStrip, "scrollBy", {
      configurable: true,
      value: vi.fn(),
    });

    await user.click(screen.getByTestId("editor-sticker-category-scroll-right"));

    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({
        behavior: "smooth",
        left: 84,
      }),
    );
  });

  it("scrolls editor gallery subcategories by one complete fixed-width text label", async () => {
    const user = userEvent.setup();
    renderEditorModal();

    const subcategoryStrip = await screen.findByTestId(
      "editor-sticker-subcategory-strip",
    );
    const subcategoryButtons = Array.from(subcategoryStrip.querySelectorAll("button"));
    expect(subcategoryButtons.length).toBeGreaterThan(2);

    Object.defineProperty(subcategoryStrip, "clientWidth", {
      configurable: true,
      value: 254,
    });
    Object.defineProperty(subcategoryStrip, "scrollLeft", {
      configurable: true,
      writable: true,
      value: 0,
    });
    const offsetParentLeft = 1200;
    subcategoryButtons.forEach((button, index) => {
      Object.defineProperty(button, "offsetLeft", {
        configurable: true,
        value: offsetParentLeft + index * 86,
      });
      Object.defineProperty(button, "offsetWidth", {
        configurable: true,
        value: 82,
      });
    });

    const scrollToMock = vi.fn();
    Object.defineProperty(subcategoryStrip, "scrollTo", {
      configurable: true,
      value: scrollToMock,
    });

    await user.click(screen.getByTestId("editor-sticker-subcategory-scroll-right"));

    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({
        behavior: "smooth",
        left: 86,
      }),
    );
  });

  it("zooms the preview with the mouse wheel by updating the stage viewBox", async () => {
    renderEditorModal();
    const stageSvg = await findStageSvg();
    const viewBoxBefore = stageSvg.getAttribute("viewBox");
    expect(stageSvg).not.toHaveClass("bg-white");
    expect(stageSvg).not.toHaveClass("shadow-[0_18px_36px_rgba(15,23,42,0.08)]");
    expect(stageSvg).not.toHaveClass("rounded-[10px]");

    fireEvent.wheel(stageSvg, {
      clientX: 480,
      clientY: 280,
      deltaY: -120,
    });

    const viewBoxAfter = stageSvg.getAttribute("viewBox");
    expect(viewBoxAfter).not.toBe(viewBoxBefore);
    expect(Number(viewBoxAfter?.split(" ")[2])).toBeLessThan(
      Number(viewBoxBefore?.split(" ")[2]),
    );
  });

  it("keeps the image point under the cursor stable when zooming after moving the mouse", async () => {
    renderEditorModal();
    const stageSvg = await findStageSvg();

    fireEvent.wheel(stageSvg, {
      clientX: 260,
      clientY: 280,
      deltaY: -120,
    });

    await waitFor(() => {
      expect(Number(stageSvg.getAttribute("viewBox")?.split(" ")[2])).toBeLessThan(800);
    });

    const cursor = { clientX: 760, clientY: 280 };
    const imagePointUnderCursor = clientToImagePoint(stageSvg, cursor);
    fireEvent.wheel(stageSvg, {
      ...cursor,
      deltaY: -120,
    });

    await waitFor(() => {
      const projected = imagePointToClient(stageSvg, imagePointUnderCursor);
      expect(projected.clientX).toBeCloseTo(cursor.clientX, 1);
      expect(projected.clientY).toBeCloseTo(cursor.clientY, 1);
    });
  });

  it("does not force-center the image when zooming back near the natural view size", async () => {
    renderEditorModal();
    const stageSvg = await findStageSvg();

    fireEvent.wheel(stageSvg, {
      clientX: 250,
      clientY: 280,
      deltaY: 120,
    });

    await waitFor(() => {
      expect(readViewBox(stageSvg).width).toBeGreaterThan(800);
    });

    firePointer(stageSvg, "pointerDown", {
      button: 1,
      buttons: 4,
      clientX: 480,
      clientY: 280,
      pointerId: 21,
    });
    firePointer(stageSvg, "pointerMove", {
      button: 1,
      buttons: 4,
      clientX: 580,
      clientY: 280,
      pointerId: 21,
    });
    firePointer(stageSvg, "pointerUp", {
      button: 1,
      buttons: 0,
      clientX: 580,
      clientY: 280,
      pointerId: 21,
    });

    const pannedViewBox = readViewBox(stageSvg);
    expect(pannedViewBox.x).not.toBeCloseTo(0, 1);

    fireEvent.wheel(stageSvg, {
      clientX: 480,
      clientY: 280,
      deltaY: -120,
    });

    await waitFor(() => {
      const nearNaturalViewBox = readViewBox(stageSvg);
      expect(nearNaturalViewBox.width).toBeGreaterThan(760);
      expect(nearNaturalViewBox.width).toBeLessThan(840);
      expect(nearNaturalViewBox.x).not.toBeCloseTo(0, 1);
    });
  });

  it("zooms out from the initial preview and clamps the minimum zoom to 0.25", async () => {
    renderEditorModal();
    const stageSvg = await findStageSvg();

    fireEvent.wheel(stageSvg, {
      clientX: 480,
      clientY: 280,
      deltaY: 120,
    });

    await waitFor(() => {
      expect(Number(stageSvg.getAttribute("viewBox")?.split(" ")[2])).toBeGreaterThan(800);
    });

    for (let index = 0; index < 18; index += 1) {
      fireEvent.wheel(stageSvg, {
        clientX: 480,
        clientY: 280,
        deltaY: 120,
      });
    }

    await waitFor(() => {
      const width = Number(stageSvg.getAttribute("viewBox")?.split(" ")[2]);
      expect(width).toBeCloseTo(3200, 0);
      const viewBoxParts = stageSvg
        .getAttribute("viewBox")!
        .split(" ")
        .map(Number);
      const x = viewBoxParts[0]!;
      const y = viewBoxParts[1]!;
      const viewBoxWidth = viewBoxParts[2]!;
      const viewBoxHeight = viewBoxParts[3]!;
      expect(x).toBeGreaterThanOrEqual(-2400);
      expect(x + viewBoxWidth).toBeLessThanOrEqual(4000);
      expect(y).toBeGreaterThanOrEqual(-1800);
      expect(y + viewBoxHeight).toBeLessThanOrEqual(2400);
    });
  });

  it("pans the zoomed preview with a middle mouse drag", async () => {
    renderEditorModal();
    const stageSvg = await findStageSvg();

    fireEvent.wheel(stageSvg, {
      clientX: 480,
      clientY: 280,
      deltaY: -120,
    });

    await waitFor(() => {
      expect(Number(stageSvg.getAttribute("viewBox")?.split(" ")[2])).toBeLessThan(800);
    });
    const viewBoxAfterZoom = stageSvg.getAttribute("viewBox");

    firePointer(stageSvg, "pointerDown", {
      button: 1,
      buttons: 4,
      clientX: 480,
      clientY: 280,
      pointerId: 8,
    });
    firePointer(stageSvg, "pointerMove", {
      button: 1,
      buttons: 4,
      clientX: 560,
      clientY: 280,
      pointerId: 8,
    });
    firePointer(stageSvg, "pointerUp", {
      button: 1,
      buttons: 0,
      clientX: 560,
      clientY: 280,
      pointerId: 8,
    });

    await waitFor(() => {
      expect(stageSvg.getAttribute("viewBox")).not.toBe(viewBoxAfterZoom);
    });
  });

  it("falls back to the original editor-gallery image when a thumbnail preview fails", async () => {
    renderEditorModal();

    const firstStickerImage = await screen.findByRole("img", {
      name: "lounge asset 1",
    });
    expect(firstStickerImage).toHaveAttribute(
      "src",
      "https://example.com/thumbs/lounge-asset-1.webp",
    );

    fireEvent.error(firstStickerImage);

    expect(firstStickerImage).toHaveAttribute(
      "src",
      "https://example.com/lounge-asset-1.png",
    );
  });

  it("does not duplicate the arrow tool inside the shape popover", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    await findStageSvg();

    await user.click(screen.getByRole("button", { name: "形状" }));

    expect(await screen.findByRole("button", { name: "矩形" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "箭头" })).toHaveLength(1);
  });

  it("preserves arrow direction when dragging from bottom-right to top-left", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getAllByRole("button", { name: "箭头" })[0]!);
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 700,
      clientY: 420,
      pointerId: 1,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: 300,
      clientY: 180,
      pointerId: 1,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 300,
      clientY: 180,
      pointerId: 1,
    });

    const arrowLine = await waitFor(() => {
      const line = stageSvg.querySelector("line") as SVGLineElement;
      expect(line).toBeInTheDocument();
      return line;
    });
    expect(Number(arrowLine.getAttribute("x2"))).toBeLessThan(
      Number(arrowLine.getAttribute("x1")),
    );
    expect(Number(arrowLine.getAttribute("y2"))).toBeLessThan(
      Number(arrowLine.getAttribute("y1")),
    );
  });

  it("moves a selected negative-direction arrow by the pointer delta without jumping", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getAllByRole("button", { name: "箭头" })[0]!);
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 620,
      clientY: 360,
      pointerId: 61,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: 430,
      clientY: 210,
      pointerId: 61,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 430,
      clientY: 210,
      pointerId: 61,
    });

    await user.click(screen.getByRole("button", { name: "选择" }));
    const before = readFirstLineGeometry(stageSvg);
    const dragStartImage = {
      x: (before.x1 + before.x2) / 2,
      y: (before.y1 + before.y2) / 2,
    };
    const dragStart = imagePointToClient(stageSvg, dragStartImage);
    const dragEnd = {
      clientX: dragStart.clientX + 54,
      clientY: dragStart.clientY + 32,
    };
    const expectedDelta = {
      x: clientToImagePoint(stageSvg, dragEnd).x - clientToImagePoint(stageSvg, dragStart).x,
      y: clientToImagePoint(stageSvg, dragEnd).y - clientToImagePoint(stageSvg, dragStart).y,
    };

    firePrimaryPointer(await screen.findByTestId("image-editor-overlay-hitbox-arrow"), "pointerDown", {
      ...dragStart,
      pointerId: 62,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      ...dragEnd,
      pointerId: 62,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      ...dragEnd,
      pointerId: 62,
    });

    await waitFor(() => {
      const after = readFirstLineGeometry(stageSvg);
      expect(after.x1 - before.x1).toBeCloseTo(expectedDelta.x, 1);
      expect(after.y1 - before.y1).toBeCloseTo(expectedDelta.y, 1);
      expect(after.x2 - before.x2).toBeCloseTo(expectedDelta.x, 1);
      expect(after.y2 - before.y2).toBeCloseTo(expectedDelta.y, 1);
    });
  });

  it("moves doodle overlays from the pointer-down snapshot instead of compounding pointer moves", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getByRole("button", { name: "涂鸦" }));
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 300,
      clientY: 210,
      pointerId: 63,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: 420,
      clientY: 250,
      pointerId: 63,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: 520,
      clientY: 310,
      pointerId: 63,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 520,
      clientY: 310,
      pointerId: 63,
    });

    await user.click(screen.getByRole("button", { name: "选择" }));
    const before = readFirstDoodlePoint(stageSvg);
    const dragStart = imagePointToClient(stageSvg, before);
    const firstMove = {
      clientX: dragStart.clientX + 90,
      clientY: dragStart.clientY + 50,
    };
    const finalMove = {
      clientX: dragStart.clientX + 36,
      clientY: dragStart.clientY + 20,
    };
    const expectedDelta = {
      x: clientToImagePoint(stageSvg, finalMove).x - clientToImagePoint(stageSvg, dragStart).x,
      y: clientToImagePoint(stageSvg, finalMove).y - clientToImagePoint(stageSvg, dragStart).y,
    };

    firePrimaryPointer(await screen.findByTestId("image-editor-overlay-hitbox-doodle"), "pointerDown", {
      ...dragStart,
      pointerId: 64,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      ...firstMove,
      pointerId: 64,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      ...finalMove,
      pointerId: 64,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      ...finalMove,
      pointerId: 64,
    });

    await waitFor(() => {
      const after = readFirstDoodlePoint(stageSvg);
      expect(after.x - before.x).toBeCloseTo(expectedDelta.x, 1);
      expect(after.y - before.y).toBeCloseTo(expectedDelta.y, 1);
    });
  });

  it("keeps text overlays single-line so typed Enter does not diverge from SVG export", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getByRole("button", { name: "文字" }));
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 360,
      clientY: 240,
      pointerId: 1,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 360,
      clientY: 240,
      pointerId: 1,
    });

    const textInput = await waitFor(() => {
      const input = document.body.querySelector("textarea");
      expect(input).toBeInTheDocument();
      return input as HTMLTextAreaElement;
    });
    fireEvent.change(textInput, {
      target: {
        value: "Line one\nLine two",
      },
    });

    await waitFor(() => {
      expect(textInput).toHaveValue("Line one Line two");
    });
  });

  it("leaves text add mode after placing a text overlay so repeated canvas clicks do not create more text boxes", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getByRole("button", { name: "文字" }));
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 360,
      clientY: 240,
      pointerId: 1,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 360,
      clientY: 240,
      pointerId: 1,
    });

    await waitFor(() => {
      expect(stageSvg.querySelectorAll("text")).toHaveLength(1);
    });

    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 520,
      clientY: 320,
      pointerId: 2,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 520,
      clientY: 320,
      pointerId: 2,
    });

    expect(stageSvg.querySelectorAll("text")).toHaveLength(1);
  });

  it("enters text editing after placement, exits on outside click, and re-enters on double click", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getByRole("button", { name: "文字" }));
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 360,
      clientY: 240,
      pointerId: 1,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 360,
      clientY: 240,
      pointerId: 1,
    });

    const textInput = await waitFor(() => {
      const input = document.body.querySelector("textarea");
      expect(input).toBeInTheDocument();
      return input as HTMLTextAreaElement;
    });
    expect(document.activeElement).toBe(textInput);

    fireEvent.blur(textInput);
    await waitFor(() => {
      expect(document.body.querySelector("textarea")).not.toBeInTheDocument();
    });

    const hitbox = screen.getByTestId("image-editor-overlay-hitbox-text");
    fireEvent.doubleClick(hitbox);

    await waitFor(() => {
      expect(document.body.querySelector("textarea")).toBeInTheDocument();
    });
  });

  it("treats the second pointer down of a browser double-click as text re-edit", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getByRole("button", { name: "文字" }));
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 360,
      clientY: 240,
      pointerId: 71,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 360,
      clientY: 240,
      pointerId: 71,
    });

    const textInput = await waitFor(() => {
      const input = document.body.querySelector("textarea");
      expect(input).toBeInTheDocument();
      return input as HTMLTextAreaElement;
    });
    fireEvent.blur(textInput);

    await waitFor(() => {
      expect(document.body.querySelector("textarea")).not.toBeInTheDocument();
    });

    const hitbox = screen.getByTestId("image-editor-overlay-hitbox-text");
    firePrimaryPointer(hitbox, "pointerDown", {
      clientX: 360,
      clientY: 240,
      pointerId: 72,
    });
    firePrimaryPointer(hitbox, "pointerUp", {
      clientX: 360,
      clientY: 240,
      pointerId: 72,
    });
    firePrimaryPointer(hitbox, "pointerDown", {
      clientX: 360,
      clientY: 240,
      pointerId: 73,
    });

    await waitFor(() => {
      expect(document.body.querySelector("textarea")).toBeInTheDocument();
    });
  });

  it("updates the SVG text after a realistic double-click re-edit flow", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getByRole("button", { name: "文字" }));
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 360,
      clientY: 240,
      pointerId: 65,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 360,
      clientY: 240,
      pointerId: 65,
    });

    const initialTextInput = await waitFor(() => {
      const input = document.body.querySelector("textarea");
      expect(input).toBeInTheDocument();
      return input as HTMLTextAreaElement;
    });
    await user.clear(initialTextInput);
    await user.type(initialTextInput, "第一次文字");
    fireEvent.blur(initialTextInput);

    await waitFor(() => {
      expect(document.body.querySelector("textarea")).not.toBeInTheDocument();
    });

    await user.dblClick(screen.getByTestId("image-editor-overlay-hitbox-text"));
    const reeditTextInput = await waitFor(() => {
      const input = document.body.querySelector("textarea");
      expect(input).toBeInTheDocument();
      return input as HTMLTextAreaElement;
    });

    await user.clear(reeditTextInput);
    await user.type(reeditTextInput, "复编文字");

    await waitFor(() => {
      expect(stageSvg.querySelector("text")?.textContent).toBe("复编文字");
    });
  });

  it("shows crop resize handles when the crop tool is active", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    await findStageSvg();

    await user.click(screen.getByRole("button", { name: "裁剪" }));

    expect(await screen.findAllByTestId("image-editor-crop-handle")).toHaveLength(8);
    for (const handle of [
      "resize-nw",
      "resize-n",
      "resize-ne",
      "resize-e",
      "resize-se",
      "resize-s",
      "resize-sw",
      "resize-w",
    ]) {
      expect(screen.getByTestId(`image-editor-crop-handle-${handle}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId("image-editor-crop-handle-resize-n")).toHaveStyle({
      cursor: "ns-resize",
    });
    expect(screen.getByTestId("image-editor-crop-handle-resize-e")).toHaveStyle({
      cursor: "ew-resize",
    });
    expect(screen.getByTestId("image-editor-crop-handle-resize-se")).toHaveStyle({
      cursor: "nwse-resize",
    });
    expect(screen.getByTestId("image-editor-crop-handle-resize-ne")).toHaveStyle({
      cursor: "nesw-resize",
    });
    expect(screen.queryByTestId("image-editor-crop-handle-resize-n-1")).not.toBeInTheDocument();
  });

  it("drags the crop top midpoint only along the vertical axis", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getByRole("button", { name: "裁剪" }));
    const sideHandle = await screen.findByTestId("image-editor-crop-handle-resize-n");
    const startX =
      Number(sideHandle.getAttribute("x")) + Number(sideHandle.getAttribute("width")) / 2;
    const startY =
      Number(sideHandle.getAttribute("y")) + Number(sideHandle.getAttribute("height")) / 2;
    const start = imagePointToClient(stageSvg, { x: startX, y: startY });

    firePrimaryPointer(stageSvg, "pointerDown", {
      ...start,
      pointerId: 20,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: start.clientX + 120,
      clientY: start.clientY + 80,
      pointerId: 20,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: start.clientX + 120,
      clientY: start.clientY + 80,
      pointerId: 20,
    });

    await waitFor(() => {
      const cropRect = screen.getByTestId("image-editor-crop-rect");
      expect(Number(cropRect.getAttribute("y"))).toBeGreaterThan(0);
      expect(Number(cropRect.getAttribute("height"))).toBeLessThan(600);
      expect(Number(cropRect.getAttribute("height"))).toBeGreaterThan(300);
      expect(Number(cropRect.getAttribute("width"))).toBeCloseTo(800, 0);
    });
  });

  it("drags the crop left midpoint only along the horizontal axis", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getByRole("button", { name: "裁剪" }));
    const sideHandle = await screen.findByTestId("image-editor-crop-handle-resize-w");
    const startX =
      Number(sideHandle.getAttribute("x")) + Number(sideHandle.getAttribute("width")) / 2;
    const startY =
      Number(sideHandle.getAttribute("y")) + Number(sideHandle.getAttribute("height")) / 2;
    const start = imagePointToClient(stageSvg, { x: startX, y: startY });

    firePrimaryPointer(stageSvg, "pointerDown", {
      ...start,
      pointerId: 21,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: start.clientX + 80,
      clientY: start.clientY + 120,
      pointerId: 21,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: start.clientX + 80,
      clientY: start.clientY + 120,
      pointerId: 21,
    });

    await waitFor(() => {
      const cropRect = screen.getByTestId("image-editor-crop-rect");
      expect(Number(cropRect.getAttribute("x"))).toBeGreaterThan(0);
      expect(Number(cropRect.getAttribute("width"))).toBeLessThan(800);
      expect(Number(cropRect.getAttribute("width"))).toBeGreaterThan(400);
      expect(Number(cropRect.getAttribute("y"))).toBeCloseTo(0, 0);
      expect(Number(cropRect.getAttribute("height"))).toBeCloseTo(600, 0);
    });
  });

  it("applies the crop draft to the visible image when pressing the crop button", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getByRole("button", { name: "裁剪" }));
    const topHandle = await screen.findByTestId("image-editor-crop-handle-resize-n");
    const startX =
      Number(topHandle.getAttribute("x")) + Number(topHandle.getAttribute("width")) / 2;
    const startY =
      Number(topHandle.getAttribute("y")) + Number(topHandle.getAttribute("height")) / 2;
    const start = imagePointToClient(stageSvg, { x: startX, y: startY });

    firePrimaryPointer(stageSvg, "pointerDown", {
      ...start,
      pointerId: 22,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: start.clientX,
      clientY: start.clientY + 120,
      pointerId: 22,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: start.clientX,
      clientY: start.clientY + 120,
      pointerId: 22,
    });

    const toolbarCropButton = screen.getAllByRole("button", { name: "裁剪" }).at(-1);
    expect(toolbarCropButton).toBeDefined();
    await user.click(toolbarCropButton as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.queryByTestId("image-editor-crop-rect")).not.toBeInTheDocument();
      const viewBox = readViewBox(stageSvg);
      expect(viewBox.y).toBeGreaterThan(0);
      expect(viewBox.height).toBeLessThan(600);
    });

    const appliedCropViewBox = readViewBox(stageSvg);
    fireEvent.wheel(stageSvg, {
      clientX: 480,
      clientY: 280,
      deltaY: 120,
    });

    await waitFor(() => {
      const zoomedOutViewBox = readViewBox(stageSvg);
      expect(zoomedOutViewBox.x).toBeGreaterThanOrEqual(appliedCropViewBox.x - 0.5);
      expect(zoomedOutViewBox.y).toBeGreaterThanOrEqual(appliedCropViewBox.y - 0.5);
      expect(zoomedOutViewBox.x + zoomedOutViewBox.width).toBeLessThanOrEqual(
        appliedCropViewBox.x + appliedCropViewBox.width + 0.5,
      );
      expect(zoomedOutViewBox.y + zoomedOutViewBox.height).toBeLessThanOrEqual(
        appliedCropViewBox.y + appliedCropViewBox.height + 0.5,
      );
    });
  });

  it("renders a crop preview mask that greys out only the discarded area", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    await findStageSvg();

    await user.click(screen.getByRole("button", { name: "裁剪" }));

    const mask = await screen.findByTestId("image-editor-crop-outside-mask");
    expect(mask).toHaveAttribute("fill-rule", "evenodd");
    expect(mask).toHaveAttribute("clip-rule", "evenodd");
  });

  it("shows only stroke color and width controls for shape styling", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    await findStageSvg();

    await user.click(screen.getByRole("button", { name: "形状" }));

    expect(screen.queryByLabelText("描边模式")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("切换填充")).not.toBeInTheDocument();
    expect(screen.getByLabelText("描边颜色")).toBeInTheDocument();
    expect(screen.getByLabelText("形状线宽")).toBeInTheDocument();
  });

  it("renders arrows with an open stroke head and recolors the shaft and head together", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getAllByRole("button", { name: "箭头" })[0]!);
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 300,
      clientY: 180,
      pointerId: 1,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: 700,
      clientY: 420,
      pointerId: 1,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 700,
      clientY: 420,
      pointerId: 1,
    });

    const arrowLine = await waitFor(() => {
      const line = stageSvg.querySelector("line") as SVGLineElement;
      expect(line).toBeInTheDocument();
      return line;
    });
    expect(arrowLine).not.toHaveAttribute("marker-end");

    const arrowHead = await screen.findByTestId("image-editor-arrow-head");
    expect(arrowHead).toHaveAttribute("fill", "none");

    const strokeColorInput = document.body.querySelector(
      'input[type="color"]',
    ) as HTMLInputElement;
    fireEvent.change(strokeColorInput, {
      target: { value: "#ff0000" },
    });

    expect(arrowLine).toHaveAttribute("stroke", "#ff0000");
    expect(arrowHead).toHaveAttribute("stroke", "#ff0000");
  });

  it("uses red screen-based default styling for shape, arrow, doodle, and text tools", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();
    const expectedStrokeWidth = 5 / getStageScale(stageSvg);
    const expectedTextSize = 34 / getStageScale(stageSvg);

    await user.click(screen.getByRole("button", { name: "形状" }));
    await user.click(await screen.findByRole("button", { name: "矩形" }));
    expect(screen.getByLabelText("描边颜色")).toHaveValue("#ff0000");
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 300,
      clientY: 180,
      pointerId: 1,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: 520,
      clientY: 320,
      pointerId: 1,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 520,
      clientY: 320,
      pointerId: 1,
    });

    const rectangle = stageSvg.querySelector("rect[stroke='#ff0000']") as SVGRectElement;
    expect(rectangle).toBeInTheDocument();
    expect(Number(rectangle.getAttribute("stroke-width"))).toBeCloseTo(
      expectedStrokeWidth,
      2,
    );

    await user.click(screen.getAllByRole("button", { name: "箭头" })[0]!);
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 340,
      clientY: 210,
      pointerId: 2,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: 560,
      clientY: 360,
      pointerId: 2,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 560,
      clientY: 360,
      pointerId: 2,
    });

    const arrowLine = Array.from(stageSvg.querySelectorAll("line")).find(
      (line) => line.getAttribute("stroke") === "#ff0000",
    ) as SVGLineElement;
    expect(arrowLine).toBeInTheDocument();
    expect(Number(arrowLine.getAttribute("stroke-width"))).toBeCloseTo(
      expectedStrokeWidth,
      2,
    );

    await user.click(screen.getByRole("button", { name: "涂鸦" }));
    expect(screen.getByLabelText("描边颜色")).toHaveValue("#ff0000");
    expect(screen.getByLabelText("形状线宽")).toHaveValue("5");
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 280,
      clientY: 220,
      pointerId: 3,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: 360,
      clientY: 260,
      pointerId: 3,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 360,
      clientY: 260,
      pointerId: 3,
    });

    const doodle = stageSvg.querySelector("polyline[stroke='#ff0000']") as SVGPolylineElement;
    expect(doodle).toBeInTheDocument();
    expect(Number(doodle.getAttribute("stroke-width"))).toBeCloseTo(
      expectedStrokeWidth,
      2,
    );

    await user.click(screen.getByRole("button", { name: "文字" }));
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 420,
      clientY: 260,
      pointerId: 4,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 420,
      clientY: 260,
      pointerId: 4,
    });

    const text = await waitFor(() => {
      const element = stageSvg.querySelector("text[fill='#ff0000']") as SVGTextElement;
      expect(element).toBeInTheDocument();
      return element;
    });
    expect(Number(text.getAttribute("font-size"))).toBeCloseTo(expectedTextSize, 2);
  });

  it("shows wider editor gallery category strips and a 4x hover preview", async () => {
    renderEditorModal();

    const categoryStrip = await screen.findByTestId("editor-sticker-category-strip");
    const subcategoryStrip = screen.getByTestId("editor-sticker-subcategory-strip");
    expect(categoryStrip).toHaveAttribute("data-default-visible-count", "3");
    expect(subcategoryStrip).toHaveAttribute("data-default-visible-count", "3");

    const firstStickerButton = (await screen.findByRole("img", {
      name: "lounge asset 1",
    })).closest("button") as HTMLButtonElement;
    fireEvent.mouseEnter(firstStickerButton);

    const preview = await screen.findByTestId("editor-sticker-hover-preview");
    expect(preview).toHaveStyle({ width: "344px", height: "344px" });
    expect(preview).toHaveAttribute(
      "src",
      "https://example.com/thumbs/lounge-asset-1.webp",
    );
  });

  it("inserts stickers into selection mode with drag and resize handles", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getByRole("button", { name: "涂鸦" }));
    const stickerImage = await screen.findByRole("img", {
      name: "lounge asset 1",
    });
    await user.click(stickerImage.closest("button") as HTMLButtonElement);

    const insertedSticker = await waitFor(() => {
      const sticker = stageSvg.querySelector(
        'image[href="https://example.com/lounge-asset-1.png"]',
      ) as SVGImageElement;
      expect(sticker).toBeInTheDocument();
      return sticker;
    });
    const originalX = Number(insertedSticker.getAttribute("x"));
    const hitbox = screen.getByTestId("image-editor-overlay-hitbox-sticker");
    const start = imagePointToClient(stageSvg, {
      x: originalX + Number(insertedSticker.getAttribute("width")) / 2,
      y:
        Number(insertedSticker.getAttribute("y")) +
        Number(insertedSticker.getAttribute("height")) / 2,
    });

    firePrimaryPointer(hitbox, "pointerDown", {
      ...start,
      pointerId: 30,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: start.clientX + 80,
      clientY: start.clientY + 20,
      pointerId: 30,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: start.clientX + 80,
      clientY: start.clientY + 20,
      pointerId: 30,
    });

    await waitFor(() => {
      expect(Number(insertedSticker.getAttribute("x"))).toBeGreaterThan(originalX);
    });

    const resizeHandles = await screen.findAllByTestId(
      "image-editor-overlay-resize-handle",
    );
    expect(resizeHandles.length).toBeGreaterThanOrEqual(4);
    const resizeHandle = screen.getByTestId("image-editor-overlay-resize-handle-se");
    const widthBeforeResize = Number(insertedSticker.getAttribute("width"));
    const handleX =
      Number(resizeHandle.getAttribute("x")) +
      Number(resizeHandle.getAttribute("width")) / 2;
    const handleY =
      Number(resizeHandle.getAttribute("y")) +
      Number(resizeHandle.getAttribute("height")) / 2;
    const resizeStart = imagePointToClient(stageSvg, { x: handleX, y: handleY });

    firePrimaryPointer(resizeHandle, "pointerDown", {
      ...resizeStart,
      pointerId: 31,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: resizeStart.clientX + 90,
      clientY: resizeStart.clientY + 90,
      pointerId: 31,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: resizeStart.clientX + 90,
      clientY: resizeStart.clientY + 90,
      pointerId: 31,
    });

    await waitFor(() => {
      expect(Number(insertedSticker.getAttribute("width"))).toBeGreaterThan(
        widthBeforeResize,
      );
    });
  });

  it("leaves shape, arrow, and doodle overlays unselected after drawing until the selection tool clicks them", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getByRole("button", { name: "形状" }));
    await user.click(await screen.findByRole("button", { name: "矩形" }));
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 300,
      clientY: 180,
      pointerId: 40,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: 520,
      clientY: 320,
      pointerId: 40,
    });
    expect(screen.queryByTestId("image-editor-selection-outline")).not.toBeInTheDocument();
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 520,
      clientY: 320,
      pointerId: 40,
    });

    expect(screen.queryByTestId("image-editor-selection-outline")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("image-editor-overlay-resize-handle")).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "选择" }));
    const rectangleHitbox = await screen.findByTestId("image-editor-overlay-hitbox-rectangle");
    firePrimaryPointer(rectangleHitbox, "pointerDown", {
      clientX: 410,
      clientY: 250,
      pointerId: 41,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 410,
      clientY: 250,
      pointerId: 41,
    });
    expect(await screen.findByTestId("image-editor-selection-outline")).toBeInTheDocument();
    expect(await screen.findAllByTestId("image-editor-overlay-resize-handle")).toHaveLength(4);

    await user.click(screen.getAllByRole("button", { name: "箭头" })[0]!);

    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 340,
      clientY: 210,
      pointerId: 42,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: 560,
      clientY: 360,
      pointerId: 42,
    });
    expect(screen.queryByTestId("image-editor-selection-outline")).not.toBeInTheDocument();
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 560,
      clientY: 360,
      pointerId: 42,
    });
    expect(screen.queryByTestId("image-editor-selection-outline")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("image-editor-overlay-resize-handle")).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "选择" }));
    const arrowHitbox = await screen.findByTestId("image-editor-overlay-hitbox-arrow");
    firePrimaryPointer(arrowHitbox, "pointerDown", {
      clientX: 450,
      clientY: 285,
      pointerId: 43,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 450,
      clientY: 285,
      pointerId: 43,
    });
    expect(await screen.findAllByTestId("image-editor-overlay-resize-handle")).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: "涂鸦" }));
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 260,
      clientY: 220,
      pointerId: 44,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: 330,
      clientY: 250,
      pointerId: 44,
    });
    expect(screen.queryByTestId("image-editor-selection-outline")).not.toBeInTheDocument();
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 330,
      clientY: 250,
      pointerId: 44,
    });
    expect(screen.queryByTestId("image-editor-selection-outline")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("image-editor-overlay-resize-handle")).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "选择" }));
    const doodleHitbox = await screen.findByTestId("image-editor-overlay-hitbox-doodle");
    firePrimaryPointer(doodleHitbox, "pointerDown", {
      clientX: 300,
      clientY: 235,
      pointerId: 45,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 300,
      clientY: 235,
      pointerId: 45,
    });
    expect(await screen.findAllByTestId("image-editor-overlay-resize-handle")).toHaveLength(4);
  });

  it("shows directional cursors on overlay resize handles and keeps the dragged handle under the pointer", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getByRole("button", { name: "形状" }));
    await user.click(await screen.findByRole("button", { name: "矩形" }));
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 300,
      clientY: 180,
      pointerId: 46,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: 520,
      clientY: 320,
      pointerId: 46,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 520,
      clientY: 320,
      pointerId: 46,
    });

    await user.click(screen.getByRole("button", { name: "选择" }));
    const rectangleHitbox = await screen.findByTestId("image-editor-overlay-hitbox-rectangle");
    firePrimaryPointer(rectangleHitbox, "pointerDown", {
      clientX: 410,
      clientY: 250,
      pointerId: 47,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 410,
      clientY: 250,
      pointerId: 47,
    });

    const southeastHandle = await screen.findByTestId("image-editor-overlay-resize-handle-se");
    const northeastHandle = screen.getByTestId("image-editor-overlay-resize-handle-ne");
    expect(southeastHandle).toHaveStyle({ cursor: "nwse-resize" });
    expect(northeastHandle).toHaveStyle({ cursor: "nesw-resize" });

    const handleX =
      Number(southeastHandle.getAttribute("x")) +
      Number(southeastHandle.getAttribute("width")) / 2;
    const handleY =
      Number(southeastHandle.getAttribute("y")) +
      Number(southeastHandle.getAttribute("height")) / 2;
    const resizeStart = imagePointToClient(stageSvg, { x: handleX, y: handleY });
    const resizeTarget = {
      clientX: resizeStart.clientX + 140,
      clientY: resizeStart.clientY + 20,
    };

    firePrimaryPointer(southeastHandle, "pointerDown", {
      ...resizeStart,
      pointerId: 48,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      ...resizeTarget,
      pointerId: 48,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      ...resizeTarget,
      pointerId: 48,
    });

    await waitFor(() => {
      const movedHandle = screen.getByTestId("image-editor-overlay-resize-handle-se");
      const movedHandleX =
        Number(movedHandle.getAttribute("x")) +
        Number(movedHandle.getAttribute("width")) / 2;
      const movedHandleY =
        Number(movedHandle.getAttribute("y")) +
        Number(movedHandle.getAttribute("height")) / 2;
      const movedClient = imagePointToClient(stageSvg, {
        x: movedHandleX,
        y: movedHandleY,
      });
      expect(Math.abs(movedClient.clientX - resizeTarget.clientX)).toBeLessThan(2);
      expect(Math.abs(movedClient.clientY - resizeTarget.clientY)).toBeLessThan(2);
    });
  });

  it.each([
    {
      label: "shape line",
      hitbox: "image-editor-overlay-hitbox-line",
      draw: async (stageSvg: SVGSVGElement, user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole("button", { name: "形状" }));
        await user.click(await screen.findByRole("button", { name: "直线" }));
        firePrimaryPointer(stageSvg, "pointerDown", {
          clientX: 300,
          clientY: 180,
          pointerId: 49,
        });
        firePrimaryPointer(stageSvg, "pointerMove", {
          clientX: 520,
          clientY: 320,
          pointerId: 49,
        });
        firePrimaryPointer(stageSvg, "pointerUp", {
          clientX: 520,
          clientY: 320,
          pointerId: 49,
        });
      },
    },
    {
      label: "arrow",
      hitbox: "image-editor-overlay-hitbox-arrow",
      draw: async (stageSvg: SVGSVGElement, user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole("button", { name: "箭头" }));
        firePrimaryPointer(stageSvg, "pointerDown", {
          clientX: 320,
          clientY: 210,
          pointerId: 50,
        });
        firePrimaryPointer(stageSvg, "pointerMove", {
          clientX: 560,
          clientY: 330,
          pointerId: 50,
        });
        firePrimaryPointer(stageSvg, "pointerUp", {
          clientX: 560,
          clientY: 330,
          pointerId: 50,
        });
      },
    },
    {
      label: "doodle",
      hitbox: "image-editor-overlay-hitbox-doodle",
      draw: async (stageSvg: SVGSVGElement, user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole("button", { name: "涂鸦" }));
        firePrimaryPointer(stageSvg, "pointerDown", {
          clientX: 320,
          clientY: 230,
          pointerId: 51,
        });
        firePrimaryPointer(stageSvg, "pointerMove", {
          clientX: 420,
          clientY: 250,
          pointerId: 51,
        });
        firePrimaryPointer(stageSvg, "pointerMove", {
          clientX: 560,
          clientY: 330,
          pointerId: 51,
        });
        firePrimaryPointer(stageSvg, "pointerUp", {
          clientX: 560,
          clientY: 330,
          pointerId: 51,
        });
      },
    },
  ])(
    "resizes $label overlays from the pointer-down snapshot instead of compounding intermediate moves",
    async ({ draw, hitbox }) => {
      const user = userEvent.setup();
      renderEditorModal();
      const stageSvg = await findStageSvg();

      await draw(stageSvg, user);
      await user.click(screen.getByRole("button", { name: "选择" }));
      firePrimaryPointer(await screen.findByTestId(hitbox), "pointerDown", {
        clientX: 420,
        clientY: 250,
        pointerId: 52,
      });
      firePrimaryPointer(stageSvg, "pointerUp", {
        clientX: 420,
        clientY: 250,
        pointerId: 52,
      });

      const resizeStart = getOverlayResizeHandleClientCenter(stageSvg, "se");
      const firstTarget = {
        clientX: resizeStart.clientX + 100,
        clientY: resizeStart.clientY + 65,
      };
      const finalTarget = {
        clientX: resizeStart.clientX + 34,
        clientY: resizeStart.clientY + 18,
      };

      firePrimaryPointer(screen.getByTestId("image-editor-overlay-resize-handle-se"), "pointerDown", {
        ...resizeStart,
        pointerId: 53,
      });
      firePrimaryPointer(stageSvg, "pointerMove", {
        ...firstTarget,
        pointerId: 53,
      });
      firePrimaryPointer(stageSvg, "pointerMove", {
        ...finalTarget,
        pointerId: 53,
      });
      firePrimaryPointer(stageSvg, "pointerUp", {
        ...finalTarget,
        pointerId: 53,
      });

      await waitFor(() => {
        const movedClient = getOverlayResizeHandleClientCenter(stageSvg, "se");
        expect(Math.abs(movedClient.clientX - finalTarget.clientX)).toBeLessThan(2);
        expect(Math.abs(movedClient.clientY - finalTarget.clientY)).toBeLessThan(2);
      });
    },
  );

  it("does not end a doodle stroke on pointer leave while the pointer is captured", async () => {
    const user = userEvent.setup();
    renderEditorModal();
    const stageSvg = await findStageSvg();

    await user.click(screen.getByRole("button", { name: "涂鸦" }));
    firePrimaryPointer(stageSvg, "pointerDown", {
      clientX: 240,
      clientY: 220,
      pointerId: 1,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: 300,
      clientY: 250,
      pointerId: 1,
    });
    firePrimaryPointer(stageSvg, "pointerLeave", {
      clientX: 320,
      clientY: 260,
      pointerId: 1,
    });
    firePrimaryPointer(stageSvg, "pointerMove", {
      clientX: 360,
      clientY: 280,
      pointerId: 1,
    });
    firePrimaryPointer(stageSvg, "pointerUp", {
      clientX: 360,
      clientY: 280,
      pointerId: 1,
    });

    const doodle = await waitFor(() => {
      const polyline = stageSvg.querySelector("polyline") as SVGPolylineElement;
      expect(polyline).toBeInTheDocument();
      return polyline;
    });
    expect((doodle.getAttribute("points") ?? "").trim().split(/\s+/)).toHaveLength(3);
  });
});
