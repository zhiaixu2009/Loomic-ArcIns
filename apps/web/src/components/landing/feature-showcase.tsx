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
// Feature visuals — ALL Higgsfield, matched to feature descriptions
// ---------------------------------------------------------------------------

function CanvasVisual() {
  // 三位女性复古运动时尚大片 — 复杂多人场景，展示画布级构图能力
  return (
    <div className="aspect-[4/3] relative overflow-hidden rounded-xl">
      <img
        src="https://dqv0cqkoy5oj7.cloudfront.net/user_36Hwty94QweUxs82UEGsxmReIrf/hf_20260218_184556_0e4b2d2d-e4b7-4d49-91e8-a67ed83fb932.png"
        alt="AI 画布级多人场景构图"
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

function ChatVisual() {
  // 唐人街时尚街拍 — AI 精准理解 "唐人街复古时尚" 创意意图并生成
  return (
    <div className="aspect-[4/3] relative overflow-hidden rounded-xl">
      <img
        src="https://cdn.higgsfield.ai/minimax_hailuo_motion/fd904f40-a0d5-4164-87cc-9f124c2af2bd.webp"
        alt="AI 理解创意意图生成街拍场景"
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

function BrandVisual() {
  // 黄色毛线帽蓝色杯子生活方式 — 统一色调、一致风格的品牌美学
  return (
    <div className="aspect-[4/3] relative overflow-hidden rounded-xl">
      <img
        src="https://dqv0cqkoy5oj7.cloudfront.net/user_35h9Zqn0Bk5qurQOPUM7laOSfXO/hf_20260207_193655_711f3c26-8d2b-4e66-89e4-8357c0100b62.png"
        alt="一致风格的品牌视觉美学"
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

function EditVisual() {
  // 银色面妆 + 金蛇超现实人像特写 — 精密到妆容级别的像素控制
  return (
    <div className="aspect-[4/3] relative overflow-hidden rounded-xl">
      <img
        src="https://static.higgsfield.ai/0ab33462-481e-4c78-8ffc-086bebd84187.webp"
        alt="像素级精准细节控制"
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
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
