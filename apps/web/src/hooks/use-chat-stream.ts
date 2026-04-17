"use client";

import { useCallback } from "react";

import type {
  AgentPlan,
  AgentPlanBlock,
  AgentPlanStep,
  StreamEvent,
  ToolBlock,
} from "@loomic/shared";
import type { Message } from "./use-chat-sessions";

type MessageUpdater = (
  targetSessionId: string,
  updater: (prev: Message[]) => Message[],
) => void;

function upsertAgentPlanBlock(
  blocks: Message["contentBlocks"],
  nextBlock: AgentPlanBlock,
) {
  const nextBlocks = [...blocks];
  const existingIndex = nextBlocks.findIndex(
    (block) => block.type === "agent-plan",
  );

  if (existingIndex === -1) {
    nextBlocks.unshift(nextBlock);
    return nextBlocks;
  }

  nextBlocks[existingIndex] = nextBlock;
  return nextBlocks;
}

function updateAgentPlanBlock(
  blocks: Message["contentBlocks"],
  updater: (block: AgentPlanBlock) => AgentPlanBlock,
) {
  const existingIndex = blocks.findIndex((block) => block.type === "agent-plan");
  if (existingIndex === -1) {
    console.warn("[chat-stream] plan update ignored because no plan block exists yet");
    return blocks;
  }

  const currentBlock = blocks[existingIndex];
  if (!currentBlock || currentBlock.type !== "agent-plan") {
    return blocks;
  }

  const nextBlock = updater(currentBlock);
  if (nextBlock === currentBlock) {
    return blocks;
  }

  const nextBlocks = [...blocks];
  nextBlocks[existingIndex] = nextBlock;
  return nextBlocks;
}

function upsertPlanStep(steps: AgentPlanStep[], step: AgentPlanStep) {
  const existingIndex = steps.findIndex(
    (existingStep) => existingStep.stepId === step.stepId,
  );

  if (existingIndex === -1) {
    return [...steps, step];
  }

  return steps.map((existingStep) =>
    existingStep.stepId === step.stepId ? step : existingStep,
  );
}

function derivePlanStatus(
  steps: AgentPlanStep[],
  fallback: AgentPlan["status"],
): AgentPlan["status"] {
  if (steps.every((step) => step.status === "completed")) {
    return "completed";
  }
  if (steps.some((step) => step.status === "failed")) {
    return "failed";
  }
  if (steps.some((step) => step.status === "interrupted")) {
    return "interrupted";
  }
  if (steps.some((step) => step.status === "running")) {
    return "running";
  }
  if (steps.some((step) => step.status === "pending")) {
    return "pending";
  }
  return fallback;
}

/**
 * Extracts the stream event handling logic into a reusable hook.
 * Used by both the main send flow and the reconnection resume flow,
 * eliminating the ~70 lines of duplicated event-handling code.
 */
export function useChatStream(updateSessionMessages: MessageUpdater) {
  /**
   * Apply a single StreamEvent to the assistant message identified by assistantId
   * in the given session. This is the single source of truth for how events
   * mutate the message list.
   *
   * Edge case handling:
   * - Empty deltas are ignored to prevent unnecessary re-renders
   * - Missing assistantId in message list is tolerated (logged, not thrown)
   * - Duplicate tool.started events for the same toolCallId are safely deduplicated
   * - Unknown event types from newer server versions are silently ignored
   */
  const applyStreamEvent = useCallback(
    (event: StreamEvent, assistantId: string, sessionId: string) => {
      if (!assistantId || !sessionId) {
        console.warn("[chat-stream] applyStreamEvent called with missing ids:", {
          assistantId,
          sessionId,
          eventType: event.type,
        });
        return;
      }

      const update = (updater: (prev: Message[]) => Message[]) =>
        updateSessionMessages(sessionId, updater);

      switch (event.type) {
        case "message.delta": {
          // Skip truly empty deltas -- they cause unnecessary re-renders
          const delta = event.delta;
          if (delta === undefined || delta === null) break;

          update((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              const blocks = [...m.contentBlocks];
              const last = blocks[blocks.length - 1];
              if (last && last.type === "text") {
                blocks[blocks.length - 1] = {
                  ...last,
                  text: last.text + delta,
                };
              } else {
                blocks.push({ type: "text", text: delta });
              }
              return { ...m, contentBlocks: blocks };
            }),
          );
          break;
        }

        case "thinking.delta": {
          const delta = event.delta;
          if (delta === undefined || delta === null) break;

          update((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              const blocks = [...m.contentBlocks];
              const last = blocks[blocks.length - 1];
              if (last && last.type === "thinking") {
                blocks[blocks.length - 1] = {
                  ...last,
                  thinking: last.thinking + delta,
                };
              } else {
                blocks.push({ type: "thinking", thinking: delta });
              }
              return { ...m, contentBlocks: blocks };
            }),
          );
          break;
        }

        case "agent.plan.updated":
          update((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              return {
                ...m,
                contentBlocks: upsertAgentPlanBlock(m.contentBlocks, {
                  type: "agent-plan",
                  plan: event.plan,
                }),
              };
            }),
          );
          break;

        case "agent.step.updated":
          update((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              return {
                ...m,
                contentBlocks: updateAgentPlanBlock(m.contentBlocks, (block) => {
                  if (block.plan.planId !== event.planId) {
                    return block;
                  }

                  const nextSteps = upsertPlanStep(block.plan.steps, event.step);
                  return {
                    ...block,
                    plan: {
                      ...block.plan,
                      steps: nextSteps,
                      status: derivePlanStatus(nextSteps, block.plan.status),
                      updatedAt: event.timestamp,
                    },
                  };
                }),
              };
            }),
          );
          break;

        case "tool.started":
          update((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              // Guard against duplicate tool.started events for the same toolCallId
              const alreadyExists = m.contentBlocks.some(
                (b) => b.type === "tool" && b.toolCallId === event.toolCallId,
              );
              if (alreadyExists) {
                console.warn("[chat-stream] duplicate tool.started for:", event.toolCallId);
                return m;
              }
              const newBlock: ToolBlock = {
                type: "tool",
                toolCallId: event.toolCallId,
                toolName: event.toolName,
                status: "running",
                ...(event.input ? { input: event.input } : {}),
              };
              return {
                ...m,
                contentBlocks: [...m.contentBlocks, newBlock],
              };
            }),
          );
          break;

        case "tool.completed":
          update((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              return {
                ...m,
                contentBlocks: m.contentBlocks.map((block) => {
                  if (
                    block.type === "tool" &&
                    block.toolCallId === event.toolCallId
                  ) {
                    return {
                      ...block,
                      status: "completed" as const,
                      output: event.output,
                      outputSummary: event.outputSummary,
                      ...(event.artifacts
                        ? { artifacts: event.artifacts }
                        : {}),
                    };
                  }
                  return block;
                }),
              };
            }),
          );
          break;

        case "run.interrupted":
          update((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              return {
                ...m,
                contentBlocks: updateAgentPlanBlock(m.contentBlocks, (block) => ({
                  ...block,
                  interrupt: event.interrupt,
                  plan: {
                    ...block.plan,
                    status: "interrupted",
                    availableActions: ["resume", "retry"],
                    updatedAt: event.timestamp,
                    steps: block.plan.steps.map((step) =>
                      step.status === "running"
                        ? {
                            ...step,
                            status: "interrupted",
                            lastUpdatedAt: event.timestamp,
                          }
                        : step,
                    ),
                  },
                })),
              };
            }),
          );
          break;

        case "run.resumed":
          update((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              return {
                ...m,
                contentBlocks: updateAgentPlanBlock(m.contentBlocks, (block) => ({
                  type: "agent-plan",
                  plan: {
                    ...block.plan,
                    runId: event.runId,
                    sourceRunId: event.sourceRunId,
                    status: "running",
                    availableActions: ["interrupt"],
                    updatedAt: event.timestamp,
                    steps: block.plan.steps.map((step) =>
                      step.status === "interrupted"
                        ? {
                            ...step,
                            status: "running",
                            lastUpdatedAt: event.timestamp,
                          }
                        : step,
                    ),
                  },
                })),
              };
            }),
          );
          break;

        case "run.retried":
          update((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              return {
                ...m,
                contentBlocks: updateAgentPlanBlock(m.contentBlocks, (block) => ({
                  ...block,
                  interrupt: undefined,
                  plan: {
                    ...block.plan,
                    runId: event.runId,
                    sourceRunId: event.sourceRunId,
                    status: "pending",
                    availableActions: ["interrupt"],
                    updatedAt: event.timestamp,
                    steps: block.plan.steps.map((step) => ({
                      ...step,
                      status: step.status === "completed" ? "completed" : "pending",
                      lastUpdatedAt: event.timestamp,
                    })),
                  },
                })),
              };
            }),
          );
          break;

        case "run.failed":
          console.error("[chat-stream] run.failed:", event.error);
          update((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              // Mark all running tool blocks as completed so spinners stop
              let blocks = m.contentBlocks.map((block) =>
                block.type === "tool" && block.status === "running"
                  ? { ...block, status: "completed" as const, outputSummary: "\u5904\u7406\u5931\u8d25" }
                  : block,
              );
              blocks = updateAgentPlanBlock(blocks, (block) => ({
                ...block,
                plan: {
                  ...block.plan,
                  status: "failed",
                  availableActions: ["retry"],
                  updatedAt: event.timestamp,
                  steps: block.plan.steps.map((step) =>
                    step.status === "running"
                      ? {
                          ...step,
                          status: "failed",
                          errorMessage:
                            event.error.message ?? "\u6267\u884c\u5931\u8d25",
                          lastUpdatedAt: event.timestamp,
                        }
                      : step,
                  ),
                },
              }));
              const hasText = blocks.some((b) => b.type === "text");
              return {
                ...m,
                contentBlocks: hasText
                  ? blocks
                  : [
                      ...blocks,
                      {
                        type: "text" as const,
                        text: "\u62b1\u6b49\uff0c\u5904\u7406\u8fc7\u7a0b\u4e2d\u9047\u5230\u95ee\u9898\uff0c\u8bf7\u91cd\u8bd5\u3002",
                      },
                    ],
              };
            }),
          );
          break;

        case "run.canceled":
          // Clean up running tool blocks when run is aborted (e.g. billing error)
          update((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              const hasRunning = m.contentBlocks.some(
                (b) => b.type === "tool" && b.status === "running",
              );
              if (!hasRunning) return m;
              const blocks = updateAgentPlanBlock(
                m.contentBlocks.map((block) =>
                  block.type === "tool" && block.status === "running"
                    ? { ...block, status: "completed" as const }
                    : block,
                ),
                (block) => ({
                  ...block,
                  plan: {
                    ...block.plan,
                    status:
                      block.plan.status === "interrupted"
                        ? "interrupted"
                        : "failed",
                    availableActions:
                      block.plan.status === "interrupted" ? ["resume", "retry"] : ["retry"],
                    updatedAt: event.timestamp,
                  },
                }),
              );

              return {
                ...m,
                contentBlocks: blocks,
              };
            }),
          );
          break;

        case "run.completed":
          update((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              return {
                ...m,
                contentBlocks: updateAgentPlanBlock(m.contentBlocks, (block) => ({
                  ...block,
                  interrupt: undefined,
                  plan: {
                    ...block.plan,
                    status: "completed",
                    availableActions: [],
                    updatedAt: event.timestamp,
                    steps: block.plan.steps.map((step) =>
                      step.status === "running" || step.status === "pending"
                        ? {
                            ...step,
                            status: "completed",
                            lastUpdatedAt: event.timestamp,
                          }
                        : step,
                    ),
                  },
                })),
              };
            }),
          );
          break;

        default:
          // Unknown event types are silently ignored -- new event types may be
          // added server-side before the frontend is updated
          break;
      }
    },
    [updateSessionMessages],
  );

  return { applyStreamEvent };
}
