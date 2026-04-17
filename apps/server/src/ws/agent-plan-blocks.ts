import type {
  AgentPlan,
  AgentPlanBlock,
  AgentPlanStatus,
  AgentPlanStep,
  ContentBlock,
  StreamEvent,
} from "@loomic/shared";

function nextPlanActions(status: AgentPlanStatus): AgentPlan["availableActions"] {
  switch (status) {
    case "running":
      return ["interrupt"];
    case "interrupted":
      return ["resume", "retry"];
    case "failed":
      return ["retry"];
    default:
      return [];
  }
}

function derivePlanStatus(
  fallback: AgentPlanStatus,
  steps: AgentPlanStep[],
): AgentPlanStatus {
  if (steps.some((step) => step.status === "failed")) {
    return "failed";
  }
  if (steps.some((step) => step.status === "interrupted")) {
    return "interrupted";
  }
  if (steps.some((step) => step.status === "running")) {
    return "running";
  }
  if (steps.every((step) => step.status === "completed")) {
    return "completed";
  }
  if (steps.some((step) => step.status === "pending")) {
    return "pending";
  }
  return fallback;
}

function replaceOrInsertPlanBlock(
  blocks: ContentBlock[],
  nextBlock: AgentPlanBlock,
): ContentBlock[] {
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

function updatePlanBlock(
  blocks: ContentBlock[],
  updater: (block: AgentPlanBlock) => AgentPlanBlock | null,
): ContentBlock[] {
  const existingIndex = blocks.findIndex((block) => block.type === "agent-plan");
  if (existingIndex === -1) {
    return blocks;
  }

  const currentBlock = blocks[existingIndex];
  if (!currentBlock || currentBlock.type !== "agent-plan") {
    return blocks;
  }

  const nextBlock = updater(currentBlock);
  if (!nextBlock) {
    return blocks;
  }

  const nextBlocks = [...blocks];
  nextBlocks[existingIndex] = nextBlock;
  return nextBlocks;
}

function promoteFirstPendingStep(
  steps: AgentPlanStep[],
  timestamp: string,
): AgentPlanStep[] {
  let promoted = false;

  return steps.map((step) => {
    if (step.status === "completed") {
      return step;
    }

    if (!promoted) {
      promoted = true;
      return {
        ...step,
        status: "running",
        lastUpdatedAt: timestamp,
      };
    }

    return {
      ...step,
      status: "pending",
      lastUpdatedAt: timestamp,
    };
  });
}

export function buildResumedPlan(
  plan: AgentPlan,
  runId: string,
  sourceRunId: string,
  timestamp: string,
): AgentPlan {
  const steps = promoteFirstPendingStep(
    plan.steps.map((step) =>
      step.status === "completed"
        ? step
        : {
            ...step,
            status: "pending",
            errorMessage: undefined,
            lastUpdatedAt: timestamp,
          }
    ),
    timestamp,
  );
  const status = derivePlanStatus("running", steps);

  return {
    ...plan,
    runId,
    sourceRunId,
    status,
    availableActions: nextPlanActions(status),
    updatedAt: timestamp,
    steps,
  };
}

export function buildRetriedPlan(
  plan: AgentPlan,
  runId: string,
  sourceRunId: string,
  timestamp: string,
): AgentPlan {
  const steps = promoteFirstPendingStep(
    plan.steps.map((step) => ({
      ...step,
      status: "pending",
      toolCallIds: [],
      artifactCount: 0,
      errorMessage: undefined,
      lastUpdatedAt: timestamp,
    })),
    timestamp,
  );
  const status = derivePlanStatus("running", steps);

  return {
    ...plan,
    runId,
    sourceRunId,
    status,
    availableActions: nextPlanActions(status),
    updatedAt: timestamp,
    steps,
  };
}

export function applyAgentPlanEvent(
  blocks: ContentBlock[],
  event: StreamEvent,
): ContentBlock[] {
  switch (event.type) {
    case "agent.plan.updated":
      return replaceOrInsertPlanBlock(blocks, {
        type: "agent-plan",
        plan: event.plan,
      });

    case "agent.step.updated":
      return updatePlanBlock(blocks, (block) => {
        if (block.plan.planId !== event.planId) {
          return block;
        }

        const existingIndex = block.plan.steps.findIndex(
          (step) => step.stepId === event.step.stepId,
        );
        const steps =
          existingIndex === -1
            ? [...block.plan.steps, event.step]
            : block.plan.steps.map((step) =>
                step.stepId === event.step.stepId ? event.step : step
              );
        const status = derivePlanStatus(block.plan.status, steps);

        return {
          ...block,
          plan: {
            ...block.plan,
            status,
            availableActions: nextPlanActions(status),
            updatedAt: event.timestamp,
            steps,
          },
        };
      });

    case "run.interrupted":
      return updatePlanBlock(blocks, (block) => {
        if (block.plan.runId !== event.runId) {
          return block;
        }

        return {
          ...block,
          interrupt: event.interrupt,
          plan: {
            ...block.plan,
            status: "interrupted",
            availableActions: nextPlanActions("interrupted"),
            updatedAt: event.timestamp,
            steps: block.plan.steps.map((step) =>
              step.status === "running"
                ? {
                    ...step,
                    status: "interrupted",
                    lastUpdatedAt: event.timestamp,
                  }
                : step
            ),
          },
        };
      });

    case "run.resumed":
      return updatePlanBlock(blocks, (block) => {
        if (
          block.plan.runId !== event.sourceRunId &&
          block.plan.runId !== event.runId
        ) {
          return block;
        }

        return {
          type: "agent-plan",
          plan: buildResumedPlan(
            block.plan,
            event.runId,
            event.sourceRunId,
            event.timestamp,
          ),
        };
      });

    case "run.retried":
      return updatePlanBlock(blocks, (block) => {
        if (
          block.plan.runId !== event.sourceRunId &&
          block.plan.runId !== event.runId
        ) {
          return block;
        }

        return {
          type: "agent-plan",
          plan: buildRetriedPlan(
            block.plan,
            event.runId,
            event.sourceRunId,
            event.timestamp,
          ),
        };
      });

    case "run.completed":
      return updatePlanBlock(blocks, (block) => {
        if (block.plan.runId !== event.runId) {
          return block;
        }

        return {
          type: "agent-plan",
          plan: {
            ...block.plan,
            status: "completed",
            availableActions: [],
            updatedAt: event.timestamp,
            steps: block.plan.steps.map((step) =>
              step.status === "completed"
                ? step
                : {
                    ...step,
                    status: "completed",
                    lastUpdatedAt: event.timestamp,
                  }
            ),
          },
        };
      });

    case "run.failed":
      return updatePlanBlock(blocks, (block) => {
        if (block.plan.runId !== event.runId) {
          return block;
        }

        return {
          ...block,
          plan: {
            ...block.plan,
            status: "failed",
            availableActions: nextPlanActions("failed"),
            updatedAt: event.timestamp,
            steps: block.plan.steps.map((step) =>
              step.status === "running"
                ? {
                    ...step,
                    status: "failed",
                    errorMessage: event.error.message,
                    lastUpdatedAt: event.timestamp,
                  }
                : step
            ),
          },
        };
      });

    case "run.canceled":
      return updatePlanBlock(blocks, (block) => {
        if (block.plan.runId !== event.runId) {
          return block;
        }

        const nextStatus =
          block.plan.status === "interrupted" ? "interrupted" : "failed";

        return {
          ...block,
          plan: {
            ...block.plan,
            status: nextStatus,
            availableActions: nextPlanActions(nextStatus),
            updatedAt: event.timestamp,
          },
        };
      });

    default:
      return blocks;
  }
}
