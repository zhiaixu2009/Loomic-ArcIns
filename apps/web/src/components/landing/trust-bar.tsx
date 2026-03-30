"use client";

import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/landing/animated-counter";
import { StaggerContainer, FadeUp } from "@/components/landing/motion";

// ---------------------------------------------------------------------------
// Stat item data
// ---------------------------------------------------------------------------

interface StatItem {
  target: number;
  suffix: string;
  label: string;
  decimals?: boolean;
}

const STATS: StatItem[] = [
  { target: 10000, suffix: "+", label: "创作者" },
  { target: 100000, suffix: "+", label: "设计作品" },
  { target: 50, suffix: "+", label: "AI 模型" },
  { target: 99.9, suffix: "%", label: "服务可用性", decimals: true },
];

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({ stat }: { stat: StatItem }) {
  return (
    <FadeUp className="flex flex-col items-center gap-1.5 group">
      {/* Number */}
      <span className="text-3xl md:text-4xl font-bold text-foreground tabular-nums tracking-tight">
        <AnimatedCounter
          target={stat.target}
          suffix={stat.suffix}
          duration={stat.decimals ? 1800 : 2000}
        />
      </span>

      {/* Divider line — subtle accent accent on hover */}
      <div
        className={cn(
          "h-px w-8 rounded-full transition-all duration-300",
          "bg-border group-hover:bg-accent/50 group-hover:w-12"
        )}
      />

      {/* Label */}
      <span className="text-sm text-muted-foreground mt-0.5">{stat.label}</span>
    </FadeUp>
  );
}

// ---------------------------------------------------------------------------
// TrustBar
// ---------------------------------------------------------------------------

export function TrustBar() {
  return (
    <section
      className={cn(
        "py-16 md:py-24",
        "border-y border-border/50",
        "bg-muted/30"
      )}
    >
      <StaggerContainer
        className={cn(
          "max-w-6xl mx-auto px-4",
          "flex flex-wrap justify-center gap-8 md:gap-16"
        )}
      >
        {STATS.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </StaggerContainer>
    </section>
  );
}
