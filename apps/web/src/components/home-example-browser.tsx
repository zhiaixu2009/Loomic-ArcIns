"use client";

import { useMemo, useState } from "react";

import type {
  HomeExampleCard,
  HomeExampleCategory,
  HomeExampleSelection,
} from "@/lib/home-example-seeds";
import { cn } from "@/lib/utils";

type HomeExampleBrowserProps = {
  categories: HomeExampleCategory[];
  selectedExample?: HomeExampleSelection | null;
  onExampleSelect: (selection: HomeExampleSelection) => void;
};

type ExampleCardRecord = {
  category: HomeExampleCategory;
  example: HomeExampleCard;
};

const HOME_CASE_TITLE_MAP: Record<string, string> = {
  "Design pixel-perfect web interface.": "设计像素级网页界面",
  "Solve a complex math problem on the white board.": "白板推导复杂数学题",
  "Design a Bauhaus-inspired poster.": "设计包豪斯风海报",
  "Design a ceramic dinnerware set.": "设计陶瓷餐具套组",
  "Generate logo options.": "生成 Logo 方案",
  "Design branded merch for your coffee shop.": "为咖啡品牌设计周边",
  "From sketch to endless illustration styles.": "从草图延展多种插画风格",
  "Turn your photo into an ink drawing.": "将照片转成墨线插画",
  "Show your clothing on a model.": "让服装上身展示",
  "Generate new angles for your clothing.": "生成服装新角度",
  "Turn product photos into 360° videos.": "将产品图生成 360° 视频",
  "Turn static ads into scroll-stopping animations.": "将静态广告生成动态短片",
};

function localizeCaseTitle(title: string) {
  return HOME_CASE_TITLE_MAP[title] ?? title;
}

function ExamplePreviewCard({
  categoryLabel,
  title,
  previewImages,
  selected,
  onClick,
}: {
  categoryLabel: string;
  title: string;
  previewImages: string[];
  selected: boolean;
  onClick: () => void;
}) {
  const displayTitle = localizeCaseTitle(title);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={displayTitle}
      aria-pressed={selected}
      className={cn(
        "group flex min-h-[188px] flex-col justify-between overflow-hidden rounded-[10px] border px-4 py-4 text-left transition-all duration-300",
        selected
          ? "border-slate-300 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_36px_rgba(15,23,42,0.06)]",
      )}
    >
      <div>
        <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
          {categoryLabel}
        </div>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-900">
          {displayTitle}
        </p>
      </div>

      <div className="relative mt-5 h-[92px] w-full">
        {previewImages.slice(0, 3).map((image, index) => {
          const positionClasses = [
            "left-[6%] top-[14%] w-[32%] -rotate-[10deg]",
            "left-[28%] top-0 w-[36%] rotate-[4deg]",
            "left-[56%] top-[10%] w-[32%] rotate-[13deg]",
          ];

          return (
            <img
              key={image}
              src={image}
              alt={`${displayTitle} 预览 ${index + 1}`}
              loading="lazy"
              className={cn(
                "absolute aspect-[7/8] rounded-[8px] border border-slate-200 object-cover shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition-transform duration-500 ease-out group-hover:-translate-y-1",
                positionClasses[index] ?? positionClasses[0],
                selected && "shadow-[0_16px_26px_rgba(15,23,42,0.12)]",
              )}
            />
          );
        })}
      </div>
    </button>
  );
}

function toSelection(
  category: HomeExampleCategory,
  example: HomeExampleCard,
): HomeExampleSelection {
  return {
    categoryKey: category.key,
    categoryLabel: category.label,
    title: example.title,
    prompt: example.prompt,
    previewImages: example.previewImages,
    inputMentions: example.inputMentions,
  };
}

export function HomeExampleBrowser({
  categories,
  selectedExample,
  onExampleSelect,
}: HomeExampleBrowserProps) {
  const [internalSelection, setInternalSelection] =
    useState<HomeExampleSelection | null>(null);
  const currentSelection = selectedExample ?? internalSelection;

  const visibleCards = useMemo<ExampleCardRecord[]>(
    () =>
      categories.flatMap((category) =>
        category.examples.slice(0, 2).map((example) => ({
          category,
          example,
        })),
      ),
    [categories],
  );

  const applySelection = (selection: HomeExampleSelection) => {
    if (selectedExample === undefined) {
      setInternalSelection(selection);
    }
    onExampleSelect(selection);
  };

  if (visibleCards.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 w-full">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleCards.map(({ category, example }) => (
          <ExamplePreviewCard
            key={`${category.key}-${example.title}`}
            categoryLabel={category.label}
            title={example.title}
            previewImages={example.previewImages}
            selected={currentSelection?.prompt === example.prompt}
            onClick={() => applySelection(toSelection(category, example))}
          />
        ))}
      </div>
    </div>
  );
}
