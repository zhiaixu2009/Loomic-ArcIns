"use client";

import React from "react";
import { type LucideIcon, Layout, MessageSquare, Palette, MousePointer } from "lucide-react";
import { type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/landing/section-header";
import {
  ScrollReveal,
  slideInLeft,
  slideInRight,
} from "@/components/landing/motion";

// ---------------------------------------------------------------------------
// Visual mockups — abstract, styled representations
// ---------------------------------------------------------------------------

function CanvasVisual() {
  return (
    <div className="aspect-[4/3] relative overflow-hidden rounded-xl">
      {/* Background grid dots */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.556 0 0 / 0.4) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      {/* Canvas cards */}
      <div className="absolute top-6 left-6 w-36 h-24 rounded-xl bg-muted/60 border border-border shadow-sm" />
      <div
        className="absolute top-10 left-16 w-28 h-20 rounded-xl border shadow-md"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.90 0.17 115 / 0.25) 0%, oklch(0.90 0.17 115 / 0.08) 100%)",
          borderColor: "oklch(0.90 0.17 115 / 0.4)",
        }}
      />
      <div className="absolute bottom-8 right-8 w-32 h-20 rounded-xl bg-muted/50 border border-border shadow-sm" />
      <div className="absolute bottom-14 left-10 w-20 h-16 rounded-lg bg-muted/70 border border-border" />
      {/* Cursor icon */}
      <div className="absolute top-1/2 right-16 -translate-y-1/2">
        <svg
          width="18"
          height="22"
          viewBox="0 0 18 22"
          className="fill-foreground/60 drop-shadow"
        >
          <path d="M0 0L0 16L4.5 12L7.5 19L9.5 18.2L6.5 11L12 11L0 0Z" />
        </svg>
      </div>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="aspect-[4/3] flex flex-col justify-end gap-3 p-2">
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
      {/* AI response */}
      <div className="flex items-end gap-2">
        <div className="size-7 rounded-full bg-muted/70 border border-border shrink-0 flex items-center justify-center">
          <div
            className="size-3 rounded-full"
            style={{ background: "oklch(0.90 0.17 115)" }}
          />
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted/50 border border-border px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div
              className="size-9 rounded-lg shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.90 0.17 115 / 0.6) 0%, oklch(0.76 0.17 115 / 0.4) 100%)",
              }}
            />
            <div className="flex flex-col gap-1">
              <div className="h-1.5 w-20 rounded-full bg-muted-foreground/30" />
              <div className="h-1.5 w-14 rounded-full bg-muted-foreground/20" />
            </div>
          </div>
          <div className="h-1 w-32 rounded-full bg-muted-foreground/20" />
          {/* Typing indicator */}
          <div className="flex items-center gap-1 pt-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="size-1.5 rounded-full"
                style={{
                  background: "oklch(0.90 0.17 115 / 0.6)",
                  animation: `typingBounce 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      {/* User message */}
      <div className="flex items-end justify-end gap-2">
        <div
          className="max-w-[70%] rounded-2xl rounded-br-md px-4 py-2.5 text-xs font-medium text-foreground/80"
          style={{
            background: "oklch(0.90 0.17 115 / 0.15)",
            border: "1px solid oklch(0.90 0.17 115 / 0.3)",
          }}
        >
          设计一个咖啡品牌 logo
        </div>
        <div className="size-7 rounded-full bg-muted/50 border border-border shrink-0" />
      </div>
    </div>
  );
}

function BrandVisual() {
  const swatches = [
    { bg: "oklch(0.90 0.17 115)", label: "Primary", hex: "#A3E635" },
    { bg: "oklch(0.82 0.14 125)", label: "Secondary", hex: "#86C96B" },
    { bg: "oklch(0.72 0.12 135)", label: "Accent", hex: "#5EA84F" },
    { bg: "oklch(0.60 0.10 120)", label: "Deep", hex: "#3D8B37" },
  ];

  return (
    <div className="aspect-[4/3] grid grid-cols-2 gap-3 p-2">
      {swatches.map((swatch, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/60 flex flex-col items-center justify-center gap-2 p-3"
          style={{
            background: i < 2
              ? `${swatch.bg}`
              : `color-mix(in oklch, ${swatch.bg} 15%, transparent)`,
          }}
        >
          <div
            className="size-8 rounded-lg shadow-sm"
            style={{ background: swatch.bg }}
          />
          <div className="flex flex-col items-center gap-0.5">
            <div
              className="h-1 w-10 rounded-full"
              style={{
                background: i < 2 ? "oklch(0.205 0 0 / 0.3)" : "oklch(0.556 0 0 / 0.3)",
              }}
            />
            <span
              className="text-[8px] font-mono tracking-wider"
              style={{
                color: i < 2 ? "oklch(0.205 0 0 / 0.5)" : "oklch(0.556 0 0 / 0.4)",
              }}
            >
              {swatch.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function EditVisual() {
  return (
    <div className="aspect-[4/3] flex gap-3 p-2 items-stretch">
      {/* Before panel */}
      <div className="flex-1 rounded-xl border border-border bg-muted/30 flex flex-col overflow-hidden">
        <div className="px-3 py-1.5 border-b border-border">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
            Before
          </span>
        </div>
        <div className="flex-1 p-3 flex flex-col gap-2 justify-center">
          <div className="h-8 rounded-lg bg-muted/60" />
          <div className="h-3 w-3/4 rounded bg-muted/40" />
          <div className="h-3 w-1/2 rounded bg-muted/30" />
          <div className="mt-2 h-6 w-20 rounded-md bg-muted/50" />
        </div>
      </div>
      {/* Arrow */}
      <div className="flex items-center justify-center text-muted-foreground/40 shrink-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8.293 1.293a1 1 0 0 1 1.414 0l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 1 1-1.414-1.414L12.586 9H1a1 1 0 1 1 0-2h11.586L8.293 2.707a1 1 0 0 1 0-1.414z" />
        </svg>
      </div>
      {/* After panel */}
      <div
        className="flex-1 rounded-xl flex flex-col overflow-hidden"
        style={{
          background: "oklch(0.90 0.17 115 / 0.08)",
          border: "1px solid oklch(0.90 0.17 115 / 0.3)",
        }}
      >
        <div
          className="px-3 py-1.5 border-b"
          style={{ borderColor: "oklch(0.90 0.17 115 / 0.2)" }}
        >
          <span
            className="text-[10px] font-medium uppercase tracking-widest"
            style={{ color: "oklch(0.65 0.17 115)" }}
          >
            After
          </span>
        </div>
        <div className="flex-1 p-3 flex flex-col gap-2 justify-center">
          <div
            className="h-8 rounded-lg"
            style={{ background: "oklch(0.90 0.17 115 / 0.3)" }}
          />
          <div
            className="h-3 w-3/4 rounded"
            style={{ background: "oklch(0.90 0.17 115 / 0.2)" }}
          />
          <div
            className="h-3 w-1/2 rounded"
            style={{ background: "oklch(0.90 0.17 115 / 0.15)" }}
          />
          <div
            className="mt-2 h-6 w-20 rounded-md"
            style={{ background: "oklch(0.90 0.17 115 / 0.7)" }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gradient border wrapper for visual mockups
// ---------------------------------------------------------------------------

function GradientBorderCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Subtle glow behind card */}
      <div
        className="absolute inset-0 -z-10 blur-3xl opacity-0 transition-opacity duration-700 group-[.in-view]:opacity-100"
        style={{
          background: "radial-gradient(ellipse at center, oklch(0.90 0.17 115 / 0.12), transparent 70%)",
          transform: "scale(1.2)",
        }}
      />
      {/* Gradient border wrapper */}
      <div className="bg-gradient-to-br from-border via-transparent to-border p-px rounded-2xl">
        <div className="bg-card rounded-[calc(1rem-1px)] overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature data type
// ---------------------------------------------------------------------------

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visual: any;
  reversed: boolean;
  textVariants: Variants;
  visualVariants: Variants;
}

const FEATURES: Feature[] = [
  {
    icon: Layout,
    title: "AI Canvas — 画布级创作",
    description:
      "在无限画布上与 AI 协作。从一个简单的想法开始，AI 帮你构建完整的设计系统——布局、配色、排版，一切所见即所得。",
    visual: <CanvasVisual />,
    reversed: false,
    textVariants: slideInLeft,
    visualVariants: slideInRight,
  },
  {
    icon: MessageSquare,
    title: "智能对话 — 理解创意意图",
    description:
      "不是冰冷的指令执行。Loomic 理解你的设计需求，主动提出建议，在对话中迭代出最佳方案。",
    visual: <ChatVisual />,
    reversed: true,
    textVariants: slideInRight,
    visualVariants: slideInLeft,
  },
  {
    icon: Palette,
    title: "风格一致 — 品牌设计系统",
    description:
      "上传你的品牌素材，AI 自动理解品牌调性。无论生成多少作品，始终保持风格统一。",
    visual: <BrandVisual />,
    reversed: false,
    textVariants: slideInLeft,
    visualVariants: slideInRight,
  },
  {
    icon: MousePointer,
    title: "精准编辑 — 像素级控制",
    description:
      "AI 生成只是起点。在画布上直接修改每一个元素，精确调整到你满意为止。",
    visual: <EditVisual />,
    reversed: true,
    textVariants: slideInRight,
    visualVariants: slideInLeft,
  },
];

// ---------------------------------------------------------------------------
// FeatureItem
// ---------------------------------------------------------------------------

interface FeatureItemProps {
  feature: Feature;
}

function FeatureItem({ feature }: FeatureItemProps) {
  const Icon = feature.icon;

  const textContent = (
    <ScrollReveal variants={feature.textVariants} className="flex flex-col gap-5">
      {/* Icon */}
      <div className="inline-flex w-fit rounded-xl bg-accent/10 p-2.5 text-accent">
        <Icon className="size-5" />
      </div>

      {/* Title */}
      <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
        {feature.title}
      </h3>

      {/* Description */}
      <p className="text-muted-foreground leading-relaxed text-base">
        {feature.description}
      </p>
    </ScrollReveal>
  );

  const visualContent = (
    <ScrollReveal
      variants={feature.visualVariants}
      className="relative"
    >
      <GradientBorderCard>
        <div
          className={cn(
            "bg-gradient-to-br from-muted/50 to-muted/20",
            "p-6 md:p-8",
          )}
        >
          {feature.visual}
        </div>
      </GradientBorderCard>
    </ScrollReveal>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      {feature.reversed ? (
        <>
          {visualContent}
          {textContent}
        </>
      ) : (
        <>
          {textContent}
          {visualContent}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeatureDivider — horizontal line between feature pairs
// ---------------------------------------------------------------------------

function FeatureDivider() {
  return (
    <div className="flex items-center justify-center">
      <div
        className="w-full max-w-md h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, oklch(0.556 0 0 / 0.15) 30%, oklch(0.90 0.17 115 / 0.2) 50%, oklch(0.556 0 0 / 0.15) 70%, transparent 100%)",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeatureShowcase
// ---------------------------------------------------------------------------

export function FeatureShowcase() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section header */}
        <div className="mb-20 md:mb-28">
          <SectionHeader
            title="设计，超越生成"
            subtitle="Loomic 不只是生成工具，更是你的智能设计伙伴"
            className="[&_h2]:tracking-tighter"
          />
        </div>

        {/* Feature list */}
        <div className="space-y-24 md:space-y-32">
          {FEATURES.map((feature, index) => (
            <React.Fragment key={feature.title}>
              {index > 0 && <FeatureDivider />}
              <FeatureItem feature={feature} />
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
