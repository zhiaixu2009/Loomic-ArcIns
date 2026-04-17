// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useChatStream } from "../src/hooks/use-chat-stream";
import type { Message } from "../src/hooks/use-chat-sessions";

describe("useChatStream", () => {
  it("upserts an agent plan block and updates it from step lifecycle events", () => {
    const assistantId = "assistant-1";
    const sessionId = "session-1";
    let messages: Message[] = [
      {
        id: assistantId,
        role: "assistant",
        contentBlocks: [],
      },
    ];

    const { result } = renderHook(() =>
      useChatStream((_targetSessionId, updater) => {
        messages = updater(messages);
      }),
    );

    result.current.applyStreamEvent(
      {
        type: "agent.plan.updated",
        runId: "run_123",
        timestamp: "2026-04-13T06:00:00.000Z",
        plan: {
          planId: "plan_123",
          runId: "run_123",
          goal: "Create an architectural concept board",
          status: "running",
          availableActions: ["interrupt"],
          updatedAt: "2026-04-13T06:00:00.000Z",
          steps: [
            {
              stepId: "step_1",
              title: "Review canvas context",
              status: "running",
              toolCallIds: [],
              artifactCount: 0,
              lastUpdatedAt: "2026-04-13T06:00:00.000Z",
            },
          ],
        },
      },
      assistantId,
      sessionId,
    );

    expect(messages[0]?.contentBlocks[0]).toMatchObject({
      type: "agent-plan",
      plan: expect.objectContaining({
        planId: "plan_123",
        status: "running",
      }),
    });

    result.current.applyStreamEvent(
      {
        type: "agent.step.updated",
        runId: "run_123",
        planId: "plan_123",
        timestamp: "2026-04-13T06:00:02.000Z",
        step: {
          stepId: "step_1",
          title: "Review canvas context",
          status: "completed",
          toolCallIds: ["tool_1"],
          artifactCount: 1,
          lastUpdatedAt: "2026-04-13T06:00:02.000Z",
        },
      },
      assistantId,
      sessionId,
    );

    expect(messages[0]?.contentBlocks[0]).toMatchObject({
      type: "agent-plan",
      plan: expect.objectContaining({
        steps: [
          expect.objectContaining({
            stepId: "step_1",
            status: "completed",
            toolCallIds: ["tool_1"],
            artifactCount: 1,
          }),
        ],
      }),
    });

    result.current.applyStreamEvent(
      {
        type: "run.interrupted",
        runId: "run_123",
        timestamp: "2026-04-13T06:00:03.000Z",
        interrupt: {
          runId: "run_123",
          reason: "user",
          message: "Paused by designer",
          interruptedAt: "2026-04-13T06:00:03.000Z",
        },
      },
      assistantId,
      sessionId,
    );

    expect(messages[0]?.contentBlocks[0]).toMatchObject({
      type: "agent-plan",
      plan: expect.objectContaining({
        status: "interrupted",
        availableActions: ["resume", "retry"],
      }),
      interrupt: expect.objectContaining({
        reason: "user",
      }),
    });
  });
});
