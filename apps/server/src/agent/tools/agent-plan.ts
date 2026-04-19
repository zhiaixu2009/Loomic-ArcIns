import { randomUUID } from "node:crypto";

import type { StructuredTool } from "@langchain/core/tools";
import { tool } from "langchain";
import {
  agentPlanStepStatusSchema,
  type AgentPlan,
  type AgentPlanStep,
} from "@loomic/shared";
import { z } from "zod";

type AgentPlanStore = {
  currentPlan: AgentPlan | null;
};

const publishPlanStepSchema = z.object({
  stepId: z.string().min(1).optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  status: agentPlanStepStatusSchema.optional(),
});

const publishPlanSchema = z.object({
  planId: z.string().min(1).optional(),
  goal: z.string().trim().min(1),
  steps: z.array(publishPlanStepSchema).min(1),
});

const updatePlanStepSchema = z.object({
  planId: z.string().min(1).optional(),
  stepId: z.string().min(1),
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  status: agentPlanStepStatusSchema,
  toolCallIds: z.array(z.string().min(1)).optional(),
  artifactCount: z.number().int().nonnegative().optional(),
  errorMessage: z.string().trim().min(1).optional(),
});

type PublishPlanInput = z.infer<typeof publishPlanSchema>;
type UpdatePlanStepInput = z.infer<typeof updatePlanStepSchema>;
type PlanStepStatus = AgentPlanStep["status"];

function normalizeStepStatus(
  value: unknown,
  fallback: PlanStepStatus,
): PlanStepStatus {
  return agentPlanStepStatusSchema.parse(value ?? fallback);
}

function now() {
  return new Date().toISOString();
}

function nextPlanActions(status: AgentPlan["status"]): AgentPlan["availableActions"] {
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
  fallback: AgentPlan["status"],
  steps: AgentPlanStep[],
): AgentPlan["status"] {
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

function readPlanStore(config: unknown): AgentPlanStore | null {
  const configurable = (config as { configurable?: Record<string, unknown> } | undefined)
    ?.configurable;
  const candidate = configurable?.agent_plan_store;

  if (
    candidate &&
    typeof candidate === "object" &&
    "currentPlan" in candidate
  ) {
    return candidate as AgentPlanStore;
  }

  return null;
}

function readRunId(config: unknown): string | null {
  const configurable = (config as { configurable?: Record<string, unknown> } | undefined)
    ?.configurable;
  const candidate = configurable?.agent_run_id;

  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : null;
}

export function createAgentPlanStore(): AgentPlanStore {
  return { currentPlan: null };
}

export function createPublishPlanTool(): StructuredTool {
  return tool(
    async (input: PublishPlanInput, config) => {
      const store = readPlanStore(config);
      const runId = readRunId(config) ?? "pending-run-id";
      const timestamp = now();
      const normalizedSteps: AgentPlanStep[] = input.steps.map((step, index) => {
        const status = normalizeStepStatus(
          step.status,
          index === 0 ? "running" : "pending",
        );

        return {
          stepId: step.stepId ?? `step_${index + 1}_${randomUUID().slice(0, 8)}`,
          title: step.title,
          ...(step.description ? { description: step.description } : {}),
          status,
          toolCallIds: [],
          artifactCount: 0,
          lastUpdatedAt: timestamp,
        };
      });
      const status = derivePlanStatus("running", normalizedSteps);
      const plan: AgentPlan = {
        planId: input.planId ?? `plan_${randomUUID().slice(0, 8)}`,
        runId,
        goal: input.goal,
        status,
        availableActions: nextPlanActions(status),
        updatedAt: timestamp,
        steps: normalizedSteps,
      };

      if (store) {
        store.currentPlan = plan;
      }

      return plan;
    },
    {
      name: "publish_plan",
      description:
        "Publish a structured execution plan before tool-heavy work. Use 3-7 concrete steps and mark the active step as running.",
      schema: publishPlanSchema,
    },
  );
}

export function createUpdatePlanStepTool(): StructuredTool {
  return tool(
    async (input: UpdatePlanStepInput, config) => {
      const store = readPlanStore(config);
      const currentPlan = store?.currentPlan;

      if (!currentPlan) {
        return {
          error: "no_active_plan",
          message: "Call publish_plan before update_plan_step.",
        };
      }

      if (input.planId && input.planId !== currentPlan.planId) {
        return {
          error: "plan_mismatch",
          message: `Active plan is ${currentPlan.planId}, not ${input.planId}.`,
        };
      }

      const timestamp = now();
      const existingStep = currentPlan.steps.find(
        (step) => step.stepId === input.stepId,
      );

      const nextStep: AgentPlanStep = existingStep
        ? {
            ...existingStep,
            ...(input.title ? { title: input.title } : {}),
            ...(input.description ? { description: input.description } : {}),
            ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
            ...(input.toolCallIds
              ? {
                  toolCallIds: Array.from(
                    new Set([
                      ...existingStep.toolCallIds,
                      ...input.toolCallIds,
                    ]),
                  ),
                }
              : {}),
            ...(input.artifactCount !== undefined
              ? { artifactCount: input.artifactCount }
              : {}),
            status: normalizeStepStatus(input.status, existingStep.status),
            lastUpdatedAt: timestamp,
          }
        : {
            stepId: input.stepId,
            title: input.title ?? input.stepId,
            ...(input.description ? { description: input.description } : {}),
            ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
            toolCallIds: input.toolCallIds ?? [],
            artifactCount: input.artifactCount ?? 0,
            status: normalizeStepStatus(input.status, "pending"),
            lastUpdatedAt: timestamp,
          };

      const steps = currentPlan.steps.some((step) => step.stepId === input.stepId)
        ? currentPlan.steps.map((step) =>
            step.stepId === input.stepId ? nextStep : step
          )
        : [...currentPlan.steps, nextStep];
      const status = derivePlanStatus(currentPlan.status, steps);
      const nextPlan: AgentPlan = {
        ...currentPlan,
        status,
        availableActions: nextPlanActions(status),
        updatedAt: timestamp,
        steps,
      };

      if (store) {
        store.currentPlan = nextPlan;
      }

      return {
        planId: nextPlan.planId,
        step: nextStep,
      };
    },
    {
      name: "update_plan_step",
      description:
        "Update the lifecycle of a published plan step as work progresses, including tool calls, artifacts, and failures.",
      schema: updatePlanStepSchema,
    },
  );
}
