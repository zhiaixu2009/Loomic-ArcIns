import { describe, expect, it } from "vitest";

import { buildImageReferenceEvaluationExpression } from "../scripts/sync-jzxz-add-gallery.ts";

describe("buildImageReferenceEvaluationExpression", () => {
  it("preserves unicode tags in the serialized payload", () => {
    const expression = buildImageReferenceEvaluationExpression(
      "建筑顶级效果图",
      0,
      100,
    );

    expect(expression).toContain("\"tag\":\"建筑顶级效果图\"");
    expect(expression).not.toContain("\"tag\":\"???????\"");
  });

  it("keeps the expected upstream request contract", () => {
    const expression = buildImageReferenceEvaluationExpression(
      "住宅效果图",
      2,
      60,
    );

    expect(expression).toContain(
      "https://api.jianzhuxuezhang.com/jzxz/api/image/reference",
    );
    expect(expression).toContain("product_id: \"51\"");
    expect(expression).toContain("version_code: \"21451\"");
    expect(expression).toContain("\"pageNum\":2");
    expect(expression).toContain("\"pageSize\":60");
  });
});
