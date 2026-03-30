"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/landing/section-header";
import { StaggerContainer, scaleUp } from "@/components/landing/motion";

// ---------------------------------------------------------------------------
// Slow rotation keyframes
// ---------------------------------------------------------------------------

const galleryStyles = `
  @keyframes slowSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// ---------------------------------------------------------------------------
// Gallery item data
// ---------------------------------------------------------------------------

interface GalleryItem {
  category: string;
  title: string;
  gradient: string;
  colSpan?: string;
  rowSpan?: string;
  aspect: string;
  shapes: React.ReactNode;
}

function AbstractShapes1() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ animation: "slowSpin 30s linear infinite" }}>
      <div className="absolute top-4 left-4 w-16 h-16 rounded-full bg-emerald-400/30" />
      <div className="absolute bottom-6 right-6 w-24 h-24 rounded-2xl bg-teal-400/20 rotate-12" />
      <div className="absolute top-1/3 right-1/4 w-10 h-10 rounded-full bg-emerald-300/40" />
      <div className="absolute bottom-1/4 left-1/3 w-14 h-2 rounded-full bg-teal-500/30" />
    </div>
  );
}

function AbstractShapes2() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ animation: "slowSpin 30s linear infinite" }}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/25 rounded-bl-[4rem]" />
      <div className="absolute bottom-4 left-4 w-20 h-20 border-4 border-orange-400/30 rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-amber-300/20 rotate-45" />
    </div>
  );
}

function AbstractShapes3() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ animation: "slowSpin 30s linear infinite" }}>
      <div className="absolute -top-4 -left-4 w-28 h-28 rounded-full bg-violet-400/25" />
      <div className="absolute bottom-6 right-8 w-12 h-24 bg-purple-400/20 rounded-full" />
      <div className="absolute top-1/2 right-1/3 w-8 h-8 bg-violet-300/35 rotate-45" />
    </div>
  );
}

function AbstractShapes4() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ animation: "slowSpin 30s linear infinite" }}>
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-rose-400/25" />
      <div className="absolute bottom-0 left-0 w-full h-16 bg-pink-400/15 rounded-t-3xl" />
      <div className="absolute top-1/3 right-6 w-6 h-16 bg-rose-300/30 rounded-full" />
    </div>
  );
}

function AbstractShapes5() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ animation: "slowSpin 30s linear infinite" }}>
      <div className="absolute top-4 left-4 right-4 h-12 bg-blue-400/20 rounded-xl" />
      <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full bg-cyan-400/30" />
      <div className="absolute bottom-8 right-8 w-16 h-8 bg-blue-300/25 rounded-lg" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-cyan-400/50" />
    </div>
  );
}

function AbstractShapes6() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ animation: "slowSpin 30s linear infinite" }}>
      <div className="absolute inset-4 border-2 border-lime-400/25 rounded-xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-green-400/30" />
      <div className="absolute bottom-6 right-6 w-8 h-8 bg-lime-400/40 rounded-md" />
    </div>
  );
}

function AbstractShapes7() {
  return (
    <div className="absolute inset-0 overflow-hidden flex items-center justify-center" style={{ animation: "slowSpin 30s linear infinite" }}>
      <div className="w-20 h-20 rounded-full bg-fuchsia-400/25 absolute top-6 left-6" />
      <div className="w-24 h-24 rounded-full border-4 border-purple-400/20 absolute bottom-4 right-4" />
      <div className="w-10 h-10 bg-fuchsia-300/35 rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}

function AbstractShapes8() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ animation: "slowSpin 30s linear infinite" }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-sky-400/25 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-full h-20 bg-indigo-400/15 rounded-t-[2rem]" />
      <div className="absolute top-1/3 left-6 w-8 h-8 rounded-full bg-sky-300/40" />
    </div>
  );
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    category: "品牌设计",
    title: "咖啡品牌视觉识别系统",
    gradient: "from-emerald-500/15 via-teal-400/10 to-emerald-600/20",
    rowSpan: "row-span-2",
    aspect: "aspect-[3/4]",
    shapes: <AbstractShapes1 />,
  },
  {
    category: "产品摄影",
    title: "护肤品商业摄影合成",
    gradient: "from-amber-500/15 via-orange-400/10 to-amber-600/20",
    colSpan: "col-span-2",
    aspect: "aspect-[16/9]",
    shapes: <AbstractShapes2 />,
  },
  {
    category: "插画设计",
    title: "城市生活系列插画",
    gradient: "from-violet-500/15 via-purple-400/10 to-violet-600/20",
    aspect: "aspect-square",
    shapes: <AbstractShapes3 />,
  },
  {
    category: "海报设计",
    title: "音乐节活动主视觉海报",
    gradient: "from-rose-500/15 via-pink-400/10 to-rose-600/20",
    aspect: "aspect-[3/4]",
    shapes: <AbstractShapes4 />,
  },
  {
    category: "UI 设计",
    title: "金融 App 界面设计",
    gradient: "from-blue-500/15 via-cyan-400/10 to-blue-600/20",
    aspect: "aspect-square",
    shapes: <AbstractShapes5 />,
  },
  {
    category: "包装设计",
    title: "茶饮品牌包装设计",
    gradient: "from-lime-500/15 via-green-400/10 to-lime-600/20",
    colSpan: "col-span-2",
    aspect: "aspect-[16/9]",
    shapes: <AbstractShapes6 />,
  },
  {
    category: "Logo 设计",
    title: "科技初创公司品牌标志",
    gradient: "from-fuchsia-500/15 via-purple-400/10 to-fuchsia-600/20",
    aspect: "aspect-square",
    shapes: <AbstractShapes7 />,
  },
  {
    category: "社媒设计",
    title: "电商促销社交媒体套图",
    gradient: "from-sky-500/15 via-indigo-400/10 to-sky-600/20",
    rowSpan: "row-span-2",
    aspect: "aspect-[3/4]",
    shapes: <AbstractShapes8 />,
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
        "relative rounded-xl overflow-hidden group cursor-pointer shadow-inner",
        "border border-border/50",
        item.colSpan,
        item.rowSpan
      )}
    >
      {/* Gradient background */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br",
          item.gradient
        )}
      />

      {/* Abstract shapes */}
      {item.shapes}

      {/* Content spacer for aspect ratio */}
      <div className={cn("relative w-full", item.rowSpan ? "" : item.aspect)} />

      {/* Hover overlay — glassmorphism */}
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
        <p className="text-white text-sm font-medium leading-snug">{item.title}</p>
      </div>

      {/* Scale on hover */}
      <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.02]" />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ShowcaseGallery
// ---------------------------------------------------------------------------

export function ShowcaseGallery() {
  return (
    <section id="showcase" className="py-24 md:py-32">
      <style>{galleryStyles}</style>
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-14 md:mb-20">
          <SectionHeader
            title="创意无界"
            subtitle="探索 AI 驱动的无限设计可能"
          />
        </div>

        <StaggerContainer
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 auto-rows-[200px] lg:auto-rows-[180px]"
        >
          {GALLERY_ITEMS.map((item) => (
            <GalleryCard key={item.title} item={item} />
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
