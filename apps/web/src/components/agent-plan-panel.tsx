"use client";

import type { AgentPlanAction, AgentPlanBlock } from "@loomic/shared";

type AgentPlanPanelProps = {
  block: AgentPlanBlock;
  disabled?: boolean;
  onInterrupt?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
};

const statusMeta = {
  pending: {
    badgeClass: "border-amber-300/70 bg-amber-50 text-amber-700",
    dotClass: "bg-amber-400",
    label: "\u5f85\u6267\u884c",
  },
  running: {
    badgeClass: "border-sky-300/70 bg-sky-50 text-sky-700",
    dotClass: "bg-sky-500",
    label: "\u6267\u884c\u4e2d",
  },
  completed: {
    badgeClass: "border-emerald-300/70 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
    label: "\u5df2\u5b8c\u6210",
  },
  failed: {
    badgeClass: "border-rose-300/70 bg-rose-50 text-rose-700",
    dotClass: "bg-rose-500",
    label: "\u5df2\u5931\u8d25",
  },
  interrupted: {
    badgeClass: "border-violet-300/70 bg-violet-50 text-violet-700",
    dotClass: "bg-violet-500",
    label: "\u5df2\u6682\u505c",
  },
} as const;

function getActionLabel(action: AgentPlanAction) {
  switch (action) {
    case "interrupt":
      return "\u6682\u505c";
    case "resume":
      return "\u7ee7\u7eed";
    case "retry":
      return "\u91cd\u8bd5";
    default:
      return action;
  }
}

export function AgentPlanPanel({
  block,
  disabled = false,
  onInterrupt,
  onResume,
  onRetry,
}: AgentPlanPanelProps) {
  const { plan, interrupt } = block;
  const completedSteps = plan.steps.filter(
    (step) => step.status === "completed",
  ).length;

  const actionHandlers: Record<AgentPlanAction, (() => void) | undefined> = {
    interrupt: onInterrupt,
    resume: onResume,
    retry: onRetry,
  };

  return (
    <section className="rounded-2xl border border-border/80 bg-muted/35 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Agent Plan
          </p>
          <h3 className="text-sm font-semibold text-foreground">
            {plan.goal}
          </h3>
          <p className="text-xs text-muted-foreground">
            {completedSteps}/{plan.steps.length} steps completed
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusMeta[plan.status].badgeClass}`}
        >
          {statusMeta[plan.status].label}
        </span>
      </div>

      {interrupt?.message && (
        <p className="mt-3 rounded-xl border border-violet-200/80 bg-violet-50/80 px-3 py-2 text-xs text-violet-800">
          {interrupt.message}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {plan.steps.map((step, index) => (
          <div
            key={step.stepId}
            className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${statusMeta[step.status].dotClass}`}
                />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {step.title}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {statusMeta[step.status].label}
                  </span>
                </div>
                {step.description && (
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>{step.toolCallIds.length} tools</span>
                  <span>{step.artifactCount} artifacts</span>
                </div>
                {step.errorMessage && (
                  <p className="text-xs text-rose-700">{step.errorMessage}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {plan.availableActions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {plan.availableActions.map((action) => {
            const handler = actionHandlers[action];
            return (
              <button
                key={action}
                type="button"
                aria-label={action}
                onClick={handler}
                disabled={disabled || !handler}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {getActionLabel(action)}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
