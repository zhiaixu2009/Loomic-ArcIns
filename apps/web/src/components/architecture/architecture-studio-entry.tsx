"use client";

import { ArrowRight, Bot, Building2, Clapperboard, ImageIcon, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const ENTRY_LANES = [
  {
    title: "Strategy lane",
    description: "Turn a site brief into a structured design agenda before execution starts.",
    icon: Building2,
  },
  {
    title: "Agent lane",
    description: "Keep the agent, prompt context, and generated assets in one visible loop.",
    icon: Bot,
  },
  {
    title: "Review lane",
    description: "Prepare the same canvas for team critiques, client reviews, and export handoff.",
    icon: Users,
  },
] as const;

export const ARCHITECTURE_BOARD_LABELS = [
  "Reference board",
  "Site analysis",
  "Massing options",
  "Render variations",
  "Storyboard shots",
  "Video output",
] as const;

type ArchitectureStudioEntryProps = {
  className?: string;
  ctaLabel?: string;
  onEnterStudio: () => void;
  workspaceName?: string | null;
};

export function ArchitectureStudioEntry({
  className,
  ctaLabel = "Open architecture studio",
  onEnterStudio,
  workspaceName,
}: ArchitectureStudioEntryProps) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-border/70 bg-[linear-gradient(135deg,rgba(246,242,235,0.98),rgba(255,255,255,0.92))] p-5 shadow-card backdrop-blur sm:p-6",
        className,
      )}
      data-testid="architecture-studio-entry"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            <Clapperboard className="h-3.5 w-3.5 text-foreground" />
            Architecture Agent Studio
          </div>
          <div className="space-y-2">
            <h2 className="max-w-2xl text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Move from brief to board to review without leaving the canvas.
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
              Start new architecture work in a studio shell that keeps context boards,
              the live canvas, and the agent inspector aligned for renders, storyboard
              shots, and presentation video prep.
            </p>
          </div>
          {workspaceName ? (
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground/80">
              Workspace: {workspaceName}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onEnterStudio}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5 hover:bg-foreground/90"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            Board stack
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The first milestone keeps the studio semantic without forcing a new data model yet.
            Board cards stage the workflow now, while M4 will bind them to persisted architecture
            objects and agent-aware templates.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ARCHITECTURE_BOARD_LABELS.map((label) => (
              <span
                key={label}
                className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {ENTRY_LANES.map((lane) => {
            const Icon = lane.icon;
            return (
              <div
                key={lane.title}
                className="rounded-[22px] border border-border/60 bg-background/75 p-4"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {lane.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {lane.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
