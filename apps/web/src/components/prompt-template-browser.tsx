"use client";

import { ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type PromptTemplateBrowserItem = {
  id: string;
  label: string;
  keywords?: string[];
  onSelect: () => void;
};

export type PromptTemplateBrowserCategory = {
  id: string;
  label: string;
  items: PromptTemplateBrowserItem[];
  showChevron?: boolean;
};

export type PromptTemplateBrowserLayout = "comfortable" | "compact";

type PromptTemplateBrowserProps = {
  categories: PromptTemplateBrowserCategory[];
  dataTestId?: string;
  className?: string;
  layout?: PromptTemplateBrowserLayout;
};

const HIDDEN_SCROLLBAR_STYLE = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
} as const;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function PromptTemplateBrowser({
  categories,
  dataTestId,
  className,
  layout = "comfortable",
}: PromptTemplateBrowserProps) {
  const [query, setQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    categories[0]?.id ?? null,
  );
  const compact = layout === "compact";

  useEffect(() => {
    if (categories.length === 0) {
      setActiveCategoryId(null);
      return;
    }

    if (
      activeCategoryId &&
      categories.some((category) => category.id === activeCategoryId)
    ) {
      return;
    }

    setActiveCategoryId(categories[0]?.id ?? null);
  }, [activeCategoryId, categories]);

  const normalizedQuery = normalizeText(query);
  const activeCategory =
    categories.find((category) => category.id === activeCategoryId) ??
    categories[0] ??
    null;

  const visibleItems = useMemo(() => {
    if (!activeCategory) {
      return [];
    }

    if (!normalizedQuery) {
      return activeCategory.items;
    }

    return activeCategory.items.filter((item) => {
      const haystacks = [
        item.label,
        ...(item.keywords ?? []),
        activeCategory.label,
      ].map(normalizeText);

      return haystacks.some((value) => value.includes(normalizedQuery));
    });
  }, [activeCategory, normalizedQuery]);

  return (
    <div
      data-testid={dataTestId}
      className={[
        compact
          ? "grid w-full grid-cols-[124px_minmax(0,1fr)] gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_24px_64px_rgba(15,23,42,0.12)]"
          : "grid w-full grid-cols-[172px_minmax(0,1fr)] gap-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_64px_rgba(15,23,42,0.12)]",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0">
        <label
          className={`flex items-center gap-2 rounded-[16px] border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 ${
            compact ? "h-9" : "h-10"
          }`}
        >
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索"
            aria-label="搜索"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </label>

        <div
          data-testid="template-browser-category-list"
          className={`mt-3 flex flex-col gap-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden ${
            compact ? "max-h-[280px]" : "max-h-[340px]"
          }`}
          style={HIDDEN_SCROLLBAR_STYLE}
        >
          {categories.map((category) => {
            const active = category.id === activeCategory?.id;

            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveCategoryId(category.id)}
                className={`flex h-9 items-center justify-between rounded-[14px] border px-3 text-left text-sm transition-colors ${
                  active
                    ? "border-slate-300 bg-slate-100 text-slate-900"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="truncate">{category.label}</span>
                {category.showChevron ? (
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-slate-500" : "text-slate-400"
                    }`}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`min-w-0 border-l border-slate-200 ${
          compact ? "pl-3" : "pl-4"
        }`}
      >
        <div className={`flex items-center gap-3 ${compact ? "mb-3" : "mb-4"}`}>
          <span className="h-7 w-[3px] rounded-full bg-slate-400" />
          <div
            className={`min-w-0 font-semibold text-slate-900 ${
              compact ? "text-base" : "text-lg"
            }`}
          >
            {activeCategory?.label ?? "模板"}
          </div>
        </div>

        <div
          data-testid="template-browser-item-grid"
          className={`grid gap-3 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden ${
            compact ? "max-h-[280px] grid-cols-2" : "max-h-[340px] grid-cols-3"
          }`}
          style={HIDDEN_SCROLLBAR_STYLE}
        >
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onSelect}
              className={`flex items-center rounded-[16px] border border-slate-200 bg-slate-50 px-3 text-left text-[13px] text-slate-700 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900 ${
                compact ? "min-h-[44px]" : "min-h-[48px]"
              }`}
              title={item.label}
            >
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>

        {visibleItems.length === 0 ? (
          <div className="mt-4 rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            未找到匹配模板
          </div>
        ) : null}
      </div>
    </div>
  );
}
