import { describe, expect, it } from "vitest";

import type { ContentBlock, StreamEvent } from "@loomic/shared";

import {
  applyAgentPlanEvent,
  buildResumedPlan,
  buildRetriedPlan,
} from "./agent-plan-blocks.js";

const baseTimestamp = "2026-04-13T07:00:00.000Z";

function createPlanEvent(): Extract<StreamEvent, { type: "agent.plan.updated" }> {
  return {
    type: "agent.plan.updated",
    runId: "run-plan-1",
    timestamp: baseTimestamp,
    plan: {
      planId: "plan-1",
      runId: "run-plan-1",
      goal: "Create an architectural concept board",
      status: "running",
      availableActions: ["interrupt"],
      updatedAt: baseTimestamp,
      steps: [
        {
          stepId: "step-1",
          title: "Review canvas context",
          status: "completed",
          toolCallIds: ["tool-1"],
          artifactCount: 0,
          lastUpdatedAt: baseTimestamp,
        },
        {
          stepId: "step-2",
          title: "Generate facade direction",
          status: "running",
          toolCallIds: [],
          artifactCount: 0,
          lastUpdatedAt: baseTimestamp,
        },
      ],
    },
  };
}

describe("agent-plan-blocks", () => {
  it("upserts a plan block and updates step lifecycle status", () => {
    const initialBlocks: ContentBlock[] = [];
    const withPlan = applyAgentPlanEvent(initialBlocks, createPlanEvent());

    expect(withPlan[0]).toMatchObject({
      type: "agent-plan",
      plan: expect.objectContaining({
        planId: "plan-1",
        status: "running",
      }),
    });

    const withStep = applyAgentPlanEvent(withPlan, {
      type: "agent.step.updated",
      runId: "run-plan-1",
      planId: "plan-1",
      timestamp: "2026-04-13T07:01:00.000Z",
      step: {
        stepId: "step-2",
        title: "Generate facade direction",
        status: "completed",
        toolCallIds: ["tool-2"],
        artifactCount: 1,
        lastUpdatedAt: "2026-04-13T07:01:00.000Z",
      },
    });

    expect(withStep[0]).toMatchObject({
      type: "agent-plan",
      plan: expect.objectContaining({
        status: "completed",
        steps: [
          expect.objectContaining({ stepId: "step-1", status: "completed" }),
          expect.objectContaining({
            stepId: "step-2",
            status: "completed",
            artifactCount: 1,
          }),
        ],
      }),
    });
  });

  it("marks interrupted plans resumable and preserves the interrupt payload", () => {
    const withPlan = applyAgentPlanEvent([], createPlanEvent());

    const interrupted = applyAgentPlanEvent(withPlan, {
      type: "run.interrupted",
      runId: "run-plan-1",
      timestamp: "2026-04-13T07:02:00.000Z",
      interrupt: {
        runId: "run-plan-1",
        reason: "user",
        message: "Paused by designer",
        interruptedAt: "2026-04-13T07:02:00.000Z",
      },
    });

    expect(interrupted[0]).toMatchObject({
      type: "agent-plan",
      interrupt: expect.objectContaining({
        reason: "user",
        message: "Paused by designer",
      }),
      plan: expect.objectContaining({
        status: "interrupted",
        availableActions: ["resume", "retry"],
        steps: [
          expect.objectContaining({ stepId: "step-1", status: "completed" }),
          expect.objectContaining({ stepId: "step-2", status: "interrupted" }),
        ],
      }),
    });
  });

  it("rebuilds a resumed plan around the first unfinished step", () => {
    const plan = createPlanEvent().plan;

    const resumed = buildResumedPlan(
      {
        ...plan,
        status: "interrupted",
        availableActions: ["resume", "retry"],
        steps: [
          plan.steps[0]!,
          {
            ...plan.steps[1]!,
            status: "interrupted",
          },
        ],
      },
      "run-plan-2",
      "run-plan-1",
      "2026-04-13T07:03:00.000Z",
    );

    expect(resumed).toMatchObject({
      runId: "run-plan-2",
      sourceRunId: "run-plan-1",
      status: "running",
      availableActions: ["interrupt"],
      steps: [
        expect.objectContaining({ stepId: "step-1", status: "completed" }),
        expect.objectContaining({ stepId: "step-2", status: "running" }),
      ],
    });
  });

  it("retries a plan by resetting unfinished steps and clearing prior artifacts", () => {
    const retried = buildRetriedPlan(
      createPlanEvent().plan,
      "run-plan-3",
      "run-plan-1",
      "2026-04-13T07:04:00.000Z",
    );

    expect(retried).toMatchObject({
      runId: "run-plan-3",
      sourceRunId: "run-plan-1",
      status: "running",
      availableActions: ["interrupt"],
      steps: [
        expect.objectContaining({
          stepId: "step-1",
          status: "running",
          toolCallIds: [],
          artifactCount: 0,
        }),
        expect.objectContaining({
          stepId: "step-2",
          status: "pending",
          toolCallIds: [],
          artifactCount: 0,
        }),
      ],
    });
  });
});
