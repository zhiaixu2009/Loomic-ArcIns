"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/landing/section-header";
import { StaggerContainer, scaleUp } from "@/components/landing/motion";

// ---------------------------------------------------------------------------
// Gallery — ALL Higgsfield AI-generated creative work
// Each image verified by visual inspection
// ---------------------------------------------------------------------------

interface GalleryItem {
  category: string;
  title: string;
  image: string;
  colSpan?: string;
  rowSpan?: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    // 蓝色发光水母 AI 数字雕塑
    category: "数字艺术",
    title: "梦幻水母 — AI 生成数字雕塑",
    image:
      "https://dqv0cqkoy5oj7.cloudfront.net/user_35h9Zqn0Bk5qurQOPUM7laOSfXO/hf_20260217_184432_7af6e3df-a5ad-4e8a-a3b4-c6d8637ce85c.png",
    rowSpan: "row-span-2",
  },
  {
    // 银色面妆 + 金蛇 + 烟雾，紫色背景超现实人像
    category: "超现实艺术",
    title: "金蛇与银面 — AI 超现实视觉创作",
    image:
      "https://static.higgsfield.ai/0ab33462-481e-4c78-8ffc-086bebd84187.webp",
    colSpan: "col-span-2",
  },
  {
    // 暗调飘逸长发艺术人像
    category: "艺术摄影",
    title: "暗调飘逸人像 — AI 风格化写真",
    image:
      "https://dqv0cqkoy5oj7.cloudfront.net/user_36Hwty94QweUxs82UEGsxmReIrf/hf_20260218_182218_2cfc8314-b866-479e-a70e-b8f27b950e11.png",
  },
  {
    // 街头读燃烧报纸的男性 — 超现实创意特效
    category: "创意特效",
    title: "燃烧的头条 — AI 超现实街头摄影",
    image:
      "https://cdn.higgsfield.ai/kling_motion/c55aaeff-aff4-4555-829e-3ffdc193df7f.webp",
  },
  {
    // 心形古董珠宝盒，钥匙与怀表
    category: "静物摄影",
    title: "复古珠宝盒 — AI 精致静物写真",
    image:
      "https://dqv0cqkoy5oj7.cloudfront.net/user_35h9Zqn0Bk5qurQOPUM7laOSfXO/hf_20260209_131824_f0307da0-93a0-41e0-8b37-9d34bb09b328.png",
  },
  {
    // 黑色 PVC 停车场 — 电影级视觉构图
    category: "电影级视觉",
    title: "地下空间 — AI 电影级光影构图",
    image:
      "https://static.higgsfield.ai/a8e2bc3a-e78e-42aa-a0e6-79bc01141ed3.webp",
    colSpan: "col-span-2",
  },
  {
    // 三位女性复古运动时尚大片
    category: "时尚大片",
    title: "复古运动风 — AI 时尚编辑摄影",
    image:
      "https://dqv0cqkoy5oj7.cloudfront.net/user_36Hwty94QweUxs82UEGsxmReIrf/hf_20260218_171001_e4013ff6-6e4a-411d-89b4-171c192dd5ef.png",
  },
  {
    // 蓝色眼妆 + 脸颊多眼超现实美妆
    category: "视觉特效",
    title: "多维之眼 — AI 超现实美妆创作",
    image:
      "https://static.higgsfield.ai/6b49273d-2164-4af4-8e38-971ad7ab6516.webp",
    rowSpan: "row-span-2",
  },
];

// ---------------------------------------------------------------------------
// GalleryCard
// ---------------------------------------------------------------------------

function GalleryCard({ item }: { item: GalleryItem }) {
  return (
    <motion.div
      variants={scaleUp}
      className={cn(
        "relative rounded-xl overflow-hidden group cursor-pointer",
        "border border-border/50",
        item.colSpan,
        item.rowSpan
      )}
    >
      <img
        src={item.image}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
        <span
          className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-2 w-fit"
          style={{
            background: "oklch(0.90 0.17 115)",
            color: "oklch(0.18 0 0)",
          }}
        >
          {item.category}
        </span>
        <p className="text-white text-sm font-medium leading-snug">
          {item.title}
        </p>
      </div>

      <div className="relative w-full h-full min-h-0" />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ShowcaseGallery
// ---------------------------------------------------------------------------

export function ShowcaseGallery() {
  return (
    <section id="showcase" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-14 md:mb-20">
          <SectionHeader
            title="创意无界"
            subtitle="探索 AI 驱动的无限设计可能"
          />
        </div>

        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 auto-rows-[200px] lg:auto-rows-[180px]">
          {GALLERY_ITEMS.map((item) => (
            <GalleryCard key={item.title} item={item} />
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
