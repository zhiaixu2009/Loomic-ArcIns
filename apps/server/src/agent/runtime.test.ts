import { describe, expect, it } from "vitest";

import { buildUserMessage } from "./runtime.js";

describe("buildUserMessage architecture context enrichment", () => {
  it("injects architecture context xml when provided", () => {
    const architectureContext = {
      studio: "architecture",
      boards: [
        {
          boardId: "board-site",
          kind: "site_analysis",
          title: "Site Analysis",
          status: "active",
          elementIds: ["el-1", "el-2"],
          anchor: { x: 100, y: 200, width: 1280, height: 720 },
          objectTypes: ["site_analysis", "review_checkpoint"],
        },
      ],
      activeBoardId: "board-site",
      selectedElementIds: ["el-1"],
      objectTypesInSelection: ["site_analysis"],
      strategyOptions: [
        {
          optionId: "option-a",
          title: "Courtyard-first",
          summary: "Maximize cross-ventilation and daylight.",
          disposition: "proposed",
        },
      ],
    } as const;

    const { text } = buildUserMessage(
      "Continue architecture flow",
      [],
      undefined,
      [],
      undefined,
      undefined,
      architectureContext as any,
    );

    expect(text).toContain("<architecture_context studio=\"architecture\">");
    expect(text).toContain(
      "<board index=\"1\" board_id=\"board-site\" kind=\"site_analysis\"",
    );
    expect(text).toContain("<active_board id=\"board-site\" />");
    expect(text).toContain(
      "<strategy_option index=\"1\" option_id=\"option-a\" disposition=\"proposed\"",
    );
  });

  it("does not inject architecture context xml when absent", () => {
    const { text } = buildUserMessage("Continue architecture flow", []);
    expect(text).not.toContain("<architecture_context");
  });

  it("escapes xml-sensitive architecture fields", () => {
    const architectureContext = {
      studio: "architecture",
      boards: [
        {
          boardId: "board<1>",
          kind: "render_variations",
          title: "Facade & Daylight <A>",
          status: "seeded",
          elementIds: ["el&1"],
          anchor: { x: 0, y: 0, width: 400, height: 300 },
          objectTypes: ["render_variation"],
        },
      ],
      selectedElementIds: ["el&1"],
      objectTypesInSelection: ["render_variation"],
      strategyOptions: [
        {
          optionId: "option&1",
          title: "Option \"A\"",
          summary: "Use <north> face & low-E glass",
          disposition: "selected",
        },
      ],
    } as const;

    const { text } = buildUserMessage(
      "Inspect architecture details",
      [],
      undefined,
      [],
      undefined,
      undefined,
      architectureContext as any,
    );

    expect(text).toContain("board_id=\"board&lt;1&gt;\"");
    expect(text).toContain("title=\"Facade &amp; Daylight &lt;A&gt;\"");
    expect(text).toContain("option_id=\"option&amp;1\"");
    expect(text).toContain("title=\"Option &quot;A&quot;\"");
    expect(text).toContain("summary=\"Use &lt;north&gt; face &amp; low-E glass\"");
  });

  it("injects image output preference xml when provided", () => {
    const { text } = buildUserMessage(
      "Generate a facade render",
      [],
      undefined,
      [],
      undefined,
      undefined,
      undefined,
      {
        aspectRatio: "16:9",
        resolution: "4K",
      },
    );

    expect(text).toContain(
      "<human_image_output_preference aspect_ratio=\"16:9\" resolution=\"4K\" />",
    );
  });
});
