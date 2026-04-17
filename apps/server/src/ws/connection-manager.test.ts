import { describe, expect, it, vi } from "vitest";

import { ConnectionManager } from "./connection-manager.js";

function createSocket() {
  return {
    close: vi.fn(),
    on: vi.fn(),
    ping: vi.fn(),
    readyState: 1,
    send: vi.fn(),
    terminate: vi.fn(),
  } as any;
}

describe("ConnectionManager collaboration state", () => {
  it("tracks active collaborators per canvas after presence registration", () => {
    const manager = new ConnectionManager();

    manager.register("conn-1", "user-1", createSocket());
    manager.register("conn-2", "user-2", createSocket());

    manager.upsertPresence("conn-1", "canvas-1", {
      avatarUrl: null,
      displayName: "Studio Lead",
    });
    manager.upsertPresence("conn-2", "canvas-1", {
      avatarUrl: "https://example.com/avatar.png",
      displayName: "Visualization Partner",
    });

    const collaborators = manager.getCanvasCollaborators("canvas-1");

    expect(collaborators).toHaveLength(2);
    expect(collaborators.map((entry) => entry.userId)).toEqual([
      "user-1",
      "user-2",
    ]);
    expect(collaborators[0]?.displayName).toBe("Studio Lead");
    expect(collaborators[0]?.color).toMatch(/^#/);
  });

  it("removes collaborator presence after disconnect", () => {
    const manager = new ConnectionManager();

    manager.register("conn-1", "user-1", createSocket());
    manager.register("conn-2", "user-2", createSocket());

    manager.upsertPresence("conn-1", "canvas-1", {
      displayName: "Studio Lead",
    });
    manager.upsertPresence("conn-2", "canvas-1", {
      displayName: "Visualization Partner",
    });

    manager.remove("conn-1");

    const collaborators = manager.getCanvasCollaborators("canvas-1");

    expect(collaborators).toHaveLength(1);
    expect(collaborators[0]?.connectionId).toBe("conn-2");
    expect(
      manager.getCanvasCollaboratorByUser("canvas-1", "user-1"),
    ).toBeNull();
  });

  it("returns fallback collaborator by user when no active presence exists", () => {
    const manager = new ConnectionManager();
    manager.register("conn-1", "user-1", createSocket());

    const collaborator = manager.getCanvasCollaboratorByUserOrFallback(
      "canvas-1",
      "user-1",
      {
        avatarUrl: null,
        displayName: "Metadata Name",
      },
    );

    expect(collaborator.userId).toBe("user-1");
    expect(collaborator.displayName).toBe("Metadata Name");
    expect(collaborator.connectionId).toBe("user:user-1");
    expect(collaborator.color).toMatch(/^#/);
  });
});
