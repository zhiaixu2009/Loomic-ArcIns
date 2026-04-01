import { describe, expect, it, vi } from "vitest";
import { ConnectionManager } from "../src/ws/connection-manager.js";
import { createScreenshotCanvasTool } from "../src/agent/tools/screenshot-canvas.js";

function createMockWs() {
  return { send: vi.fn(), readyState: 1, on: vi.fn(), close: vi.fn(), ping: vi.fn() } as any;
}

/** Helper: invoke the tool as a ToolCall (mirrors agent runtime behaviour). */
function invokeAsToolCall(
  tool: ReturnType<typeof createScreenshotCanvasTool>,
  args: Record<string, unknown>,
  userId?: string,
) {
  return tool.invoke(
    { name: "screenshot_canvas", args, id: "call-1", type: "tool_call" as const },
    { configurable: { user_id: userId } } as any,
  );
}

describe("screenshot_canvas tool", () => {
  it("uploads screenshot and returns JSON with short URL (no base64 in ToolMessage)", async () => {
    const cm = new ConnectionManager();
    const ws = createMockWs();
    cm.register("conn-1", "user-1", ws);

    const persistImage = vi.fn().mockResolvedValue("https://storage.example.com/screenshot.png");

    const tool = createScreenshotCanvasTool({ connectionManager: cm, persistImage });

    const resultPromise = invokeAsToolCall(tool, { mode: "full", max_dimension: 1024 }, "user-1");

    await new Promise((r) => setTimeout(r, 50));

    const sent = JSON.parse(ws.send.mock.calls[0][0]);
    expect(sent.type).toBe("rpc.request");
    expect(sent.method).toBe("canvas.screenshot");
    expect(sent.params.mode).toBe("full");

    cm.handleRpcResponse("user-1", {
      type: "rpc.response",
      id: sent.id,
      result: { url: "data:image/png;base64,iVBOR...", width: 1024, height: 768 },
    });

    const result = await resultPromise;
    const content = typeof result === "string" ? result : (result as any).content;
    const parsed = JSON.parse(content as string);

    expect(parsed.summary).toBe("Canvas screenshot captured (1024x768, mode: full)");
    expect(parsed.screenshotUrl).toBe("https://storage.example.com/screenshot.png");
    expect(parsed.width).toBe(1024);
    expect(parsed.height).toBe(768);
    // Verify no base64 data in the ToolMessage content
    expect(content).not.toContain("data:image");

    expect(persistImage).toHaveBeenCalledWith(
      "data:image/png;base64,iVBOR...",
      "image/png",
      "canvas-screenshot-full",
    );

    cm.dispose();
  });

  it("returns text-only summary when persistImage is unavailable", async () => {
    const cm = new ConnectionManager();
    const ws = createMockWs();
    cm.register("conn-1", "user-1", ws);

    const tool = createScreenshotCanvasTool({ connectionManager: cm });

    const resultPromise = invokeAsToolCall(tool, { mode: "full" }, "user-1");

    await new Promise((r) => setTimeout(r, 50));

    const sent = JSON.parse(ws.send.mock.calls[0][0]);
    cm.handleRpcResponse("user-1", {
      type: "rpc.response",
      id: sent.id,
      result: { url: "data:image/png;base64,iVBOR...", width: 512, height: 512 },
    });

    const result = await resultPromise;
    const content = typeof result === "string" ? result : (result as any).content;
    const parsed = JSON.parse(content as string);

    expect(parsed.summary).toContain("512x512");
    expect(parsed.screenshotUrl).toBeUndefined();
    // No base64 leak
    expect(content).not.toContain("data:image");

    cm.dispose();
  });

  it("returns error when user not connected", async () => {
    const cm = new ConnectionManager();
    const tool = createScreenshotCanvasTool({ connectionManager: cm });

    const result = await invokeAsToolCall(tool, { mode: "full" }, "user-1");

    const content = typeof result === "string" ? result : (result as any).content;
    const parsed = JSON.parse(content as string);
    expect(parsed.error).toBe("screenshot_failed");
    expect(parsed.message).toContain("not available");

    cm.dispose();
  });

  it("returns error on timeout", async () => {
    const cm = new ConnectionManager();
    const ws = createMockWs();
    cm.register("conn-1", "user-1", ws);

    const tool = createScreenshotCanvasTool({ connectionManager: cm, rpcTimeout: 50 });

    const result = await invokeAsToolCall(tool, { mode: "full" }, "user-1");

    const content = typeof result === "string" ? result : (result as any).content;
    const parsed = JSON.parse(content as string);
    expect(parsed.error).toBe("screenshot_failed");
    expect(parsed.message).toContain("timeout");

    cm.dispose();
  });

  it("returns error when no user context", async () => {
    const cm = new ConnectionManager();
    const tool = createScreenshotCanvasTool({ connectionManager: cm });

    const result = await invokeAsToolCall(tool, { mode: "full" }, undefined);

    const content = typeof result === "string" ? result : (result as any).content;
    const parsed = JSON.parse(content as string);
    expect(parsed.error).toBe("no_user_context");

    cm.dispose();
  });
});
