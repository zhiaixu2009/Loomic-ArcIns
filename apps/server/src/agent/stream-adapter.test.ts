import { describe, expect, it } from "vitest";

import { adaptDeepAgentStream } from "./stream-adapter.js";

async function collectTypes(events: AsyncIterable<any>) {
  const types: string[] = [];
  for await (const event of events) {
    types.push(event.type);
  }
  return types;
}

describe("adaptDeepAgentStream", () => {
  it("emits explicit agent plan events and suppresses planning tool noise", async () => {
    async function* planningStream() {
      yield {
        event: "on_tool_start",
        name: "publish_plan",
        run_id: "tool-plan-1",
        data: {
          input: {
            goal: "Create an architectural concept board",
          },
        },
      };
      yield {
        event: "on_tool_end",
        name: "publish_plan",
        run_id: "tool-plan-1",
        data: {
          output: {
            planId: "plan-1",
            runId: "pending-run-id",
            goal: "Create an architectural concept board",
            status: "running",
            availableActions: ["interrupt"],
            updatedAt: "2026-04-13T08:00:00.000Z",
            steps: [
              {
                stepId: "step-1",
                title: "Review canvas context",
                status: "running",
                toolCallIds: [],
                artifactCount: 0,
                lastUpdatedAt: "2026-04-13T08:00:00.000Z",
              },
            ],
          },
        },
      };
      yield {
        event: "on_tool_start",
        name: "update_plan_step",
        run_id: "tool-plan-2",
        data: {
          input: {
            stepId: "step-1",
            status: "completed",
          },
        },
      };
      yield {
        event: "on_tool_end",
        name: "update_plan_step",
        run_id: "tool-plan-2",
        data: {
          output: {
            planId: "plan-1",
            step: {
              stepId: "step-1",
              title: "Review canvas context",
              status: "completed",
              toolCallIds: ["tool-canvas-1"],
              artifactCount: 1,
              lastUpdatedAt: "2026-04-13T08:01:00.000Z",
            },
          },
        },
      };
    }

    const events = [];
    for await (const event of adaptDeepAgentStream({
      conversationId: "canvas-1",
      now: () => "2026-04-13T08:02:00.000Z",
      runId: "run-1",
      sessionId: "session-1",
      stream: planningStream(),
    })) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual([
      "run.started",
      "agent.plan.updated",
      "agent.step.updated",
      "run.completed",
    ]);
    expect(events[1]).toMatchObject({
      type: "agent.plan.updated",
      runId: "run-1",
      plan: expect.objectContaining({
        planId: "plan-1",
        runId: "run-1",
      }),
    });
    expect(events[2]).toMatchObject({
      type: "agent.step.updated",
      planId: "plan-1",
      step: expect.objectContaining({
        stepId: "step-1",
        status: "completed",
        artifactCount: 1,
      }),
    });
  });

  it("continues to emit regular tool lifecycle events for non-planning tools", async () => {
    async function* regularToolStream() {
      yield {
        event: "on_tool_start",
        name: "inspect_canvas",
        run_id: "tool-1",
        data: { input: { detail_level: "summary" } },
      };
      yield {
        event: "on_tool_end",
        name: "inspect_canvas",
        run_id: "tool-1",
        data: {
          output: {
            summary: "Canvas inspected",
          },
        },
      };
    }

    const types = await collectTypes(
      adaptDeepAgentStream({
        conversationId: "canvas-1",
        now: () => "2026-04-13T08:03:00.000Z",
        runId: "run-2",
        sessionId: "session-1",
        stream: regularToolStream(),
      }),
    );

    expect(types).toEqual([
      "run.started",
      "tool.started",
      "tool.completed",
      "run.completed",
    ]);
  });
});
