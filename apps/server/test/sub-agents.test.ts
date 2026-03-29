import { describe, expect, it } from "vitest";
import { createVideoSubAgent } from "../src/agent/sub-agents.js";

describe("sub-agent definitions", () => {
  it("createVideoSubAgent returns a valid SubAgent shape", () => {
    const subAgent = createVideoSubAgent();
    expect(subAgent.name).toBe("video_generate");
    expect(subAgent.description).toBeTruthy();
    expect(subAgent.systemPrompt).toContain("video");
    expect(subAgent.tools).toHaveLength(1);
  });
});
