import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";

import {
  type Database,
  chatMessageSchema,
  canvasCollaboratorProfileSchema,
  errorCodeValues,
  healthResponseSchema,
  runCancelResponseSchema,
  runCreateRequestSchema,
  runCreateResponseSchema,
  streamEventSchema,
  wsClientMessageSchema,
} from "./index.js";
import * as sharedExports from "./index.js";

const databaseTypeSource = readFileSync(
  new URL("./supabase/database.ts", import.meta.url),
  "utf8",
);

describe("@loomic/shared contracts", () => {
  it("shares the health response schema for server and web", () => {
    const parsed = healthResponseSchema.parse({
      ok: true,
      service: "loomic-server",
      version: "0.1.0",
    });

    expect(parsed.ok).toBe(true);
    expect(parsed.service).toBe("loomic-server");
  });

  it("accepts canvasId as optional field", () => {
    const result = runCreateRequestSchema.parse({
      sessionId: "session-1",
      conversationId: "conv-1",
      prompt: "Hello",
      canvasId: "canvas-1",
    });
    expect(result.canvasId).toBe("canvas-1");
  });

  it("succeeds without canvasId (backward compat)", () => {
    const result = runCreateRequestSchema.parse({
      sessionId: "session-1",
      conversationId: "conv-1",
      prompt: "Hello",
    });
    expect(result.canvasId).toBeUndefined();
  });

  it("accepts optional attachments in run creation", () => {
    const result = runCreateRequestSchema.parse({
      sessionId: "session-1",
      conversationId: "conv-1",
      prompt: "Analyze this image",
      attachments: [
        {
          assetId: "asset-123",
          url: "https://example.com/image.png",
          mimeType: "image/png",
        },
      ],
    });
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments![0].assetId).toBe("asset-123");
  });

  it("accepts optional image generation preference in run creation", () => {
    const result = runCreateRequestSchema.parse({
      sessionId: "session-1",
      conversationId: "conv-1",
      prompt: "Generate a campaign key visual",
      imageGenerationPreference: {
        mode: "manual",
        models: [
          "google/nano-banana-2",
          "black-forest-labs/flux-kontext-pro",
        ],
      },
    });

    expect(result.imageGenerationPreference?.mode).toBe("manual");
    expect(result.imageGenerationPreference?.models).toEqual([
      "google/nano-banana-2",
      "black-forest-labs/flux-kontext-pro",
    ]);
  });

  it("accepts optional image output preference in run creation", () => {
    const result = runCreateRequestSchema.parse({
      sessionId: "session-1",
      conversationId: "conv-1",
      prompt: "Generate a campaign key visual",
      imageOutputPreference: {
        aspectRatio: "16:9",
        resolution: "4K",
      },
    });

    expect(result.imageOutputPreference).toEqual({
      aspectRatio: "16:9",
      resolution: "4K",
    });
  });

  it("accepts optional mentions in run creation", () => {
    const result = runCreateRequestSchema.parse({
      sessionId: "session-1",
      conversationId: "conv-1",
      prompt: "参考品牌资产生成一张海报",
      mentions: [
        {
          mentionType: "image-model",
          id: "google/nano-banana-2",
          label: "Nano Banana 2",
        },
        {
          mentionType: "brand-kit-asset",
          id: "brand-logo-1",
          label: "Loomic 主 Logo",
          assetType: "logo",
          fileUrl: "https://example.com/logo.png",
        },
      ],
    });

    expect(result.mentions).toHaveLength(2);
    expect(result.mentions?.[0]?.mentionType).toBe("image-model");
    expect(result.mentions?.[1]).toMatchObject({
      mentionType: "brand-kit-asset",
      assetType: "logo",
      fileUrl: "https://example.com/logo.png",
    });
  });

  it("accepts sessionId and conversationId for run creation", () => {
    const request = runCreateRequestSchema.parse({
      sessionId: "session_123",
      conversationId: "conversation_123",
      prompt: "Create a new storyboard outline",
    });

    const response = runCreateResponseSchema.parse({
      runId: "run_123",
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      status: "accepted",
    });

    expect(request.sessionId).toBe("session_123");
    expect(response.status).toBe("accepted");
  });

  it("rejects run creation without a real sessionId", () => {
    expect(() =>
      runCreateRequestSchema.parse({
        conversationId: "conversation_123",
        prompt: "Create a new storyboard outline",
      }),
    ).toThrow();
  });

  it("shares a stable cancel response schema", () => {
    const parsed = runCancelResponseSchema.parse({
      runId: "run_123",
      status: "canceling",
    });

    expect(parsed.status).toBe("canceling");
  });

  it("shares the viewer bootstrap contract for GET /api/viewer", () => {
    const viewerResponseSchema = getExportedSchema("viewerResponseSchema");

    const parsed = viewerResponseSchema.parse({
      profile: {
        id: "user_123",
        email: "maker@loomic.test",
        displayName: "Loomic Maker",
        avatarUrl: "https://example.com/avatar.png",
      },
      workspace: {
        id: "workspace_123",
        name: "Loomic Maker",
        type: "personal",
        ownerUserId: "user_123",
      },
      membership: {
        workspaceId: "workspace_123",
        userId: "user_123",
        role: "owner",
      },
    });

    expect(parsed.profile.id).toBe("user_123");
    expect(parsed.workspace.ownerUserId).toBe("user_123");
    expect(parsed.membership.workspaceId).toBe("workspace_123");
  });

  it("shares project list and create contracts for GET/POST /api/projects", () => {
    const projectListResponseSchema = getExportedSchema(
      "projectListResponseSchema",
    );
    const projectCreateRequestSchema = getExportedSchema(
      "projectCreateRequestSchema",
    );
    const projectCreateResponseSchema = getExportedSchema(
      "projectCreateResponseSchema",
    );

    const createRequest = projectCreateRequestSchema.parse({
      name: "Brand System",
      description: "Primary workspace project",
    });

    const parsedList = projectListResponseSchema.parse({
      projects: [
        {
          id: "project_123",
          name: createRequest.name,
          slug: "brand-system",
          description: createRequest.description,
          workspace: {
            id: "workspace_123",
            name: "Loomic Maker",
            type: "personal",
            ownerUserId: "user_123",
          },
          primaryCanvas: {
            id: "canvas_123",
            name: "Main Canvas",
            isPrimary: true,
          },
          createdAt: "2026-03-23T12:00:00.000Z",
          updatedAt: "2026-03-23T12:00:00.000Z",
        },
      ],
    });
    const createdProject = projectCreateResponseSchema.parse({
      project: parsedList.projects[0],
    });

    expect(parsedList.projects[0].id).toBe("project_123");
    expect(parsedList.projects[0].workspace.ownerUserId).toBe("user_123");
    expect(parsedList.projects[0].primaryCanvas.id).toBe("canvas_123");
    expect(createdProject.project.primaryCanvas.isPrimary).toBe(true);
  });

  it("shares stable unauthenticated and application error payloads", () => {
    const unauthenticatedErrorResponseSchema = getExportedSchema(
      "unauthenticatedErrorResponseSchema",
    );
    const applicationErrorResponseSchema = getExportedSchema(
      "applicationErrorResponseSchema",
    );

    const unauthenticated = unauthenticatedErrorResponseSchema.parse({
      error: {
        code: "unauthorized",
        message: "Authentication is required.",
      },
    });
    const applicationError = applicationErrorResponseSchema.parse({
      error: {
        code: "project_create_failed",
        message: "Unable to create project.",
      },
    });

    expect(unauthenticated.error.code).toBe("unauthorized");
    expect(JSON.parse(JSON.stringify(applicationError))).toEqual(
      applicationError,
    );
  });

  it("rejects an empty project name in project create requests", () => {
    const projectCreateRequestSchema = getExportedSchema(
      "projectCreateRequestSchema",
    );

    expect(() =>
      projectCreateRequestSchema.parse({
        name: "",
      }),
    ).toThrow();
  });

  it("rejects a whitespace-only project name", () => {
    const schema = getExportedSchema("projectCreateRequestSchema");
    const result = schema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("trims a valid project name", () => {
    const schema = getExportedSchema("projectCreateRequestSchema");
    const result = schema.safeParse({ name: "  My Project  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("My Project");
    }
  });

  it("trims a valid project description", () => {
    const schema = getExportedSchema("projectCreateRequestSchema");
    const result = schema.safeParse({
      name: "Test",
      description: "  Some desc  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Some desc");
    }
  });

  it("rejects a project response without primary canvas metadata", () => {
    const projectListResponseSchema = getExportedSchema(
      "projectListResponseSchema",
    );

    expect(() =>
      projectListResponseSchema.parse({
        projects: [
          {
            id: "project_123",
            name: "Brand System",
            slug: "brand-system",
            description: "Primary workspace project",
            workspace: {
              id: "workspace_123",
              name: "Loomic Maker",
              type: "personal",
              ownerUserId: "user_123",
            },
            createdAt: "2026-03-23T12:00:00.000Z",
            updatedAt: "2026-03-23T12:00:00.000Z",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects invalid application error codes", () => {
    const applicationErrorResponseSchema = getExportedSchema(
      "applicationErrorResponseSchema",
    );

    expect(() =>
      applicationErrorResponseSchema.parse({
        error: {
          code: "database_exploded",
          message: "Unexpected failure.",
        },
      }),
    ).toThrow();
  });

  it("includes the required minimum stream event union", () => {
    const eventTypes = [
      "run.started",
      "message.delta",
      "tool.started",
      "tool.completed",
      "run.canceled",
      "run.completed",
      "run.failed",
    ];

    for (const type of eventTypes) {
      expect(() => {
        switch (type) {
          case "run.started":
            streamEventSchema.parse({
              type,
              runId: "run_123",
              sessionId: "session_123",
              conversationId: "conversation_123",
              timestamp: "2026-03-23T12:00:00.000Z",
            });
            break;
          case "message.delta":
            streamEventSchema.parse({
              type,
              runId: "run_123",
              messageId: "message_123",
              delta: "hello",
              timestamp: "2026-03-23T12:00:00.000Z",
            });
            break;
          case "tool.started":
            streamEventSchema.parse({
              type,
              runId: "run_123",
              toolCallId: "tool_123",
              toolName: "example_tool",
              timestamp: "2026-03-23T12:00:00.000Z",
            });
            break;
          case "tool.completed":
            streamEventSchema.parse({
              type,
              runId: "run_123",
              toolCallId: "tool_123",
              toolName: "example_tool",
              outputSummary: "done",
              timestamp: "2026-03-23T12:00:00.000Z",
            });
            break;
          case "run.completed":
            streamEventSchema.parse({
              type,
              runId: "run_123",
              timestamp: "2026-03-23T12:00:00.000Z",
            });
            break;
          case "run.canceled":
            streamEventSchema.parse({
              type,
              runId: "run_123",
              timestamp: "2026-03-23T12:00:00.000Z",
            });
            break;
          case "run.failed":
            streamEventSchema.parse({
              type,
              runId: "run_123",
              error: {
                code: "run_failed",
                message: "The run failed.",
              },
              timestamp: "2026-03-23T12:00:00.000Z",
            });
            break;
          default:
            throw new Error(`Unexpected event type: ${type}`);
        }
      }).not.toThrow();
    }
  });

  it("keeps stable messageId and toolCallId correlation fields", () => {
    const messageEvent = streamEventSchema.parse({
      type: "message.delta",
      runId: "run_123",
      messageId: "message_123",
      delta: "hello",
      timestamp: "2026-03-23T12:00:00.000Z",
    });

    const toolEvent = streamEventSchema.parse({
      type: "tool.completed",
      runId: "run_123",
      toolCallId: "tool_123",
      toolName: "project_search",
      outputSummary: "Matched 2 files",
      timestamp: "2026-03-23T12:00:01.000Z",
    });

    if (messageEvent.type !== "message.delta") {
      throw new Error("Expected message.delta event.");
    }

    if (toolEvent.type !== "tool.completed") {
      throw new Error("Expected tool.completed event.");
    }

    expect(messageEvent.messageId).toBe("message_123");
    expect(toolEvent.toolCallId).toBe("tool_123");
  });

  it("requires correlation fields for message and tool lifecycle events", () => {
    expect(() =>
      streamEventSchema.parse({
        type: "message.delta",
        runId: "run_123",
        delta: "hello",
        timestamp: "2026-03-23T12:00:00.000Z",
      }),
    ).toThrow();

    expect(() =>
      streamEventSchema.parse({
        type: "tool.completed",
        runId: "run_123",
        toolName: "project_search",
        outputSummary: "Matched 2 files",
        timestamp: "2026-03-23T12:00:01.000Z",
      }),
    ).toThrow();
  });

  it("accepts architecture context in run creation payload", () => {
    const result = runCreateRequestSchema.parse({
      sessionId: "session-arch-1",
      conversationId: "conv-arch-1",
      prompt: "Continue architecture workflow",
      architectureContext: {
        studio: "architecture",
        boards: [
          {
            boardId: "board-site",
            kind: "site_analysis",
            title: "Site Analysis",
            status: "active",
            elementIds: ["el-1", "el-2"],
            anchor: {
              x: 120,
              y: 220,
              width: 1280,
              height: 720,
            },
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
            summary: "Prioritize daylight and wind comfort.",
            disposition: "proposed",
          },
        ],
      },
    });

    expect(result.architectureContext?.studio).toBe("architecture");
    expect(result.architectureContext?.boards[0]?.kind).toBe("site_analysis");
    expect(result.architectureContext?.strategyOptions[0]?.disposition).toBe(
      "proposed",
    );
  });

  it("shares architecture schema exports for board/context/strategy", () => {
    const architectureBoardSchema = getExportedSchema("architectureBoardSchema");
    const architectureContextSchema = getExportedSchema(
      "architectureContextSchema",
    );
    const architectureStrategyOptionSchema = getExportedSchema(
      "architectureStrategyOptionSchema",
    );
    const architectureBoardKindSchema = getExportedSchema(
      "architectureBoardKindSchema",
    );

    expect(() =>
      architectureBoardSchema.parse({
        boardId: "board-render",
        kind: "render_variations",
        title: "Render Variations",
        status: "seeded",
        elementIds: ["el-render-1"],
        anchor: { x: 0, y: 0, width: 1000, height: 600 },
        objectTypes: ["render_variation"],
      }),
    ).not.toThrow();

    expect(() =>
      architectureStrategyOptionSchema.parse({
        optionId: "option-b",
        title: "Minimal facade",
        summary: "Reduce facade articulation to lower cost.",
        disposition: "selected",
      }),
    ).not.toThrow();

    expect(() =>
      architectureContextSchema.parse({
        studio: "architecture",
        boards: [],
        selectedElementIds: [],
        objectTypesInSelection: [],
        strategyOptions: [],
      }),
    ).not.toThrow();

    expect(architectureBoardKindSchema.parse("video_output")).toBe(
      "video_output",
    );
  });

  it("rejects invalid architecture board kind values", () => {
    const architectureBoardKindSchema = getExportedSchema(
      "architectureBoardKindSchema",
    );

    expect(() => architectureBoardKindSchema.parse("masterplan")).toThrow();
  });

  it("accepts collaboration profile contracts with optional avatar urls", () => {
    const parsed = canvasCollaboratorProfileSchema.parse({
      displayName: "  Design Lead  ",
      avatarUrl: "https://example.com/avatar.png",
    });

    expect(parsed.displayName).toBe("Design Lead");
    expect(parsed.avatarUrl).toBe("https://example.com/avatar.png");
  });

  it("includes collaboration events in the shared stream union", () => {
    expect(() =>
      streamEventSchema.parse({
        type: "collab.presence",
        canvasId: "canvas_123",
        collaborators: [
          {
            connectionId: "conn_1",
            userId: "user_123",
            displayName: "Studio Lead",
            avatarUrl: "https://example.com/avatar.png",
            color: "#CA8A04",
          },
        ],
        timestamp: "2026-04-12T06:00:00.000Z",
      }),
    ).not.toThrow();

    expect(() =>
      streamEventSchema.parse({
        type: "collab.cursor",
        canvasId: "canvas_123",
        collaborator: {
          connectionId: "conn_1",
          userId: "user_123",
          displayName: "Studio Lead",
          avatarUrl: null,
          color: "#CA8A04",
        },
        cursor: {
          x: 0.42,
          y: 0.35,
          tool: "pointer",
          button: "up",
        },
        timestamp: "2026-04-12T06:00:00.000Z",
      }),
    ).not.toThrow();

    expect(() =>
      streamEventSchema.parse({
        type: "collab.selection",
        canvasId: "canvas_123",
        collaborator: {
          connectionId: "conn_1",
          userId: "user_123",
          displayName: "Studio Lead",
          avatarUrl: null,
          color: "#CA8A04",
        },
        selection: {
          selectedElementIds: ["element_1", "element_2"],
        },
        timestamp: "2026-04-12T06:00:00.000Z",
      }),
    ).not.toThrow();

    expect(() =>
      streamEventSchema.parse({
        type: "collab.canvas_mutation",
        canvasId: "canvas_123",
        mutationId: "mutation_1",
        collaborator: {
          connectionId: "conn_1",
          userId: "user_123",
          displayName: "Studio Lead",
          avatarUrl: null,
          color: "#CA8A04",
        },
        source: "human-save",
        elementCount: 7,
        timestamp: "2026-04-12T06:00:00.000Z",
      }),
    ).not.toThrow();
  });

  it("accepts collaboration websocket commands from clients", () => {
    expect(() =>
      wsClientMessageSchema.parse({
        type: "command",
        action: "collab.presence",
        payload: {
          canvasId: "canvas_123",
          profile: {
            displayName: "Studio Lead",
          },
        },
      }),
    ).not.toThrow();

    expect(() =>
      wsClientMessageSchema.parse({
        type: "command",
        action: "collab.cursor",
        payload: {
          canvasId: "canvas_123",
          cursor: {
            x: 0.51,
            y: 0.64,
            tool: "pointer",
            button: "down",
          },
        },
      }),
    ).not.toThrow();

    expect(() =>
      wsClientMessageSchema.parse({
        type: "command",
        action: "collab.selection",
        payload: {
          canvasId: "canvas_123",
          selection: {
            selectedElementIds: ["element_1"],
          },
        },
      }),
    ).not.toThrow();

    expect(() =>
      wsClientMessageSchema.parse({
        type: "command",
        action: "collab.canvas_mutation",
        payload: {
          canvasId: "canvas_123",
          source: "agent-sync",
          elementCount: 12,
        },
      }),
    ).not.toThrow();
  });

  it("accepts agent plan blocks in persisted chat messages", () => {
    const parsed = chatMessageSchema.parse({
      id: "message_plan_123",
      role: "assistant",
      content: "",
      contentBlocks: [
        {
          type: "agent-plan",
          plan: {
            planId: "plan_123",
            runId: "run_123",
            goal: "Create an architectural concept board",
            status: "running",
            availableActions: ["interrupt"],
            updatedAt: "2026-04-13T05:45:00.000Z",
            steps: [
              {
                stepId: "step_1",
                title: "Review canvas context",
                status: "completed",
                toolCallIds: ["tool_1"],
                artifactCount: 0,
                lastUpdatedAt: "2026-04-13T05:45:00.000Z",
              },
              {
                stepId: "step_2",
                title: "Generate first facade direction",
                status: "running",
                toolCallIds: [],
                artifactCount: 0,
                lastUpdatedAt: "2026-04-13T05:45:02.000Z",
              },
            ],
          },
        },
      ],
      createdAt: "2026-04-13T05:45:03.000Z",
    });

    expect(parsed.contentBlocks?.[0]).toMatchObject({
      type: "agent-plan",
    });
  });

  it("includes agent plan lifecycle events in the shared stream union", () => {
    expect(() =>
      streamEventSchema.parse({
        type: "agent.plan.updated",
        runId: "run_123",
        timestamp: "2026-04-13T05:45:00.000Z",
        plan: {
          planId: "plan_123",
          runId: "run_123",
          goal: "Create an architectural concept board",
          status: "running",
          availableActions: ["interrupt"],
          updatedAt: "2026-04-13T05:45:00.000Z",
          steps: [
            {
              stepId: "step_1",
              title: "Review canvas context",
              status: "running",
              toolCallIds: [],
              artifactCount: 0,
              lastUpdatedAt: "2026-04-13T05:45:00.000Z",
            },
          ],
        },
      }),
    ).not.toThrow();

    expect(() =>
      streamEventSchema.parse({
        type: "agent.step.updated",
        runId: "run_123",
        timestamp: "2026-04-13T05:45:02.000Z",
        planId: "plan_123",
        step: {
          stepId: "step_1",
          title: "Review canvas context",
          status: "completed",
          toolCallIds: ["tool_1"],
          artifactCount: 0,
          lastUpdatedAt: "2026-04-13T05:45:02.000Z",
        },
      }),
    ).not.toThrow();

    expect(() =>
      streamEventSchema.parse({
        type: "run.interrupted",
        runId: "run_123",
        timestamp: "2026-04-13T05:45:03.000Z",
        interrupt: {
          runId: "run_123",
          reason: "user",
          message: "Paused by designer",
          interruptedAt: "2026-04-13T05:45:03.000Z",
        },
      }),
    ).not.toThrow();
  });

  it("accepts agent control websocket commands from clients", () => {
    expect(() =>
      wsClientMessageSchema.parse({
        type: "command",
        action: "agent.interrupt",
        payload: {
          runId: "run_123",
        },
      }),
    ).not.toThrow();

    expect(() =>
      wsClientMessageSchema.parse({
        type: "command",
        action: "agent.resume",
        payload: {
          sourceRunId: "run_123",
          sessionId: "session_123",
          conversationId: "conversation_123",
          canvasId: "canvas_123",
          prompt: "Continue the remaining architectural steps.",
          plan: {
            planId: "plan_123",
            runId: "run_123",
            goal: "Create an architectural concept board",
            status: "interrupted",
            availableActions: ["resume", "retry"],
            updatedAt: "2026-04-13T05:45:03.000Z",
            steps: [
              {
                stepId: "step_1",
                title: "Review canvas context",
                status: "completed",
                toolCallIds: ["tool_1"],
                artifactCount: 0,
                lastUpdatedAt: "2026-04-13T05:45:00.000Z",
              },
              {
                stepId: "step_2",
                title: "Generate first facade direction",
                status: "interrupted",
                toolCallIds: ["tool_2"],
                artifactCount: 1,
                lastUpdatedAt: "2026-04-13T05:45:03.000Z",
              },
            ],
          },
        },
      }),
    ).not.toThrow();

    expect(() =>
      wsClientMessageSchema.parse({
        type: "command",
        action: "agent.retry",
        payload: {
          sourceRunId: "run_123",
          sessionId: "session_123",
          conversationId: "conversation_123",
          canvasId: "canvas_123",
          prompt: "Create an architectural concept board",
        },
      }),
    ).not.toThrow();
  });

  it("exports stable error codes that serialize as plain JSON", () => {
    expect(errorCodeValues).toEqual([
      "invalid_request",
      "run_not_found",
      "run_conflict",
      "run_failed",
      "tool_failed",
    ]);
    expect(JSON.parse(JSON.stringify(errorCodeValues))).toEqual(
      errorCodeValues,
    );
  });

  it("keeps run creation response stable for clients while hiding checkpoint internals", () => {
    const response = runCreateResponseSchema.parse({
      runId: "run_123",
      sessionId: "session_123",
      conversationId: "conversation_123",
      status: "accepted",
      checkpointId: "checkpoint_123",
      checkpointNamespace: "root",
    });

    expect(response).toEqual({
      runId: "run_123",
      sessionId: "session_123",
      conversationId: "conversation_123",
      status: "accepted",
    });
  });

  it("tracks server-owned thread_id in shared Supabase typings", () => {
    expect(databaseTypeSource).toMatch(/thread_id:\s*string \| null/);
  });

  it("declares shared agent_runs persistence typings", () => {
    expect(databaseTypeSource).toMatch(/agent_runs:\s*{/);
    expect(databaseTypeSource).toMatch(/session_id:\s*string/);
    expect(databaseTypeSource).toMatch(/thread_id:\s*string/);
  });

  it("tracks official langgraph persistence schema typings", () => {
    expect(databaseTypeSource).toMatch(/langgraph:\s*{/);
    expect(databaseTypeSource).toMatch(/checkpoint_migrations:\s*{/);
    expect(databaseTypeSource).toMatch(/checkpoints:\s*{/);
    expect(databaseTypeSource).toMatch(/checkpoint_blobs:\s*{/);
    expect(databaseTypeSource).toMatch(/checkpoint_writes:\s*{/);
    expect(databaseTypeSource).toMatch(/store:\s*{/);
  });
});

type AssertTrue<T extends true> = T;
type Extends<T, U> = [T] extends [U] ? true : false;

const chatSessionRowSupportsServerOwnedThreadId: AssertTrue<
  Extends<
    Database["public"]["Tables"]["chat_sessions"]["Row"],
    { thread_id: string | null }
  >
> = true;

const agentRunsRowTracksSessionAndThread: AssertTrue<
  Extends<
    Database["public"]["Tables"]["agent_runs"]["Row"],
    {
      session_id: string;
      thread_id: string;
      status: string;
      created_at: string;
      completed_at: string | null;
      error_code: string | null;
      error_message: string | null;
    }
  >
> = true;

void chatSessionRowSupportsServerOwnedThreadId;
void agentRunsRowTracksSessionAndThread;

const langgraphCheckpointsRowMatchesOfficialSchema: AssertTrue<
  Extends<
    Database["langgraph"]["Tables"]["checkpoints"]["Row"],
    {
      thread_id: string;
      checkpoint_ns: string;
      checkpoint_id: string;
      checkpoint: unknown;
      metadata: unknown;
    }
  >
> = true;

void langgraphCheckpointsRowMatchesOfficialSchema;

function getExportedSchema(name: string): ZodType {
  const candidate = (sharedExports as Record<string, unknown>)[name];

  expect(candidate, `${name} export is missing`).toBeDefined();

  if (
    !candidate ||
    typeof candidate !== "object" ||
    !("parse" in candidate) ||
    typeof candidate.parse !== "function"
  ) {
    throw new Error(`${name} is not a Zod schema export.`);
  }

  return candidate as ZodType;
}
