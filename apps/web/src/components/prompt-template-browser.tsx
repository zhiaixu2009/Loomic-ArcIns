"use client";

import { Search, ChevronDown } from "lucide-react";
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

type PromptTemplateBrowserProps = {
  categories: PromptTemplateBrowserCategory[];
  dataTestId?: string;
  className?: string;
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
}: PromptTemplateBrowserProps) {
  const [query, setQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    categories[0]?.id ?? null,
  );

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
        "grid w-[620px] grid-cols-[168px_minmax(0,1fr)] gap-4 rounded-[10px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.1)]",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0">
        <label className="flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
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
          className="mt-3 flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden"
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
                className={`flex h-9 items-center justify-between rounded-[10px] border px-3 text-left text-sm transition-colors ${
                  active
                    ? "border-slate-900 bg-slate-800 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="truncate">{category.label}</span>
                {category.showChevron ? (
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 ${active ? "text-white/80" : "text-slate-400"}`}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 border-l border-slate-200 pl-4">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-7 w-[3px] rounded-full bg-slate-900" />
          <div className="min-w-0 text-lg font-semibold text-slate-900">
            {activeCategory?.label ?? "模版"}
          </div>
        </div>

        <div
          data-testid="template-browser-item-grid"
          className="grid max-h-[320px] grid-cols-3 gap-3 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden"
          style={HIDDEN_SCROLLBAR_STYLE}
        >
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onSelect}
              className="flex h-9 items-center rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-left text-[13px] text-slate-700 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900"
              title={item.label}
            >
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>

        {visibleItems.length === 0 ? (
          <div className="mt-4 rounded-[10px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            未找到匹配模板
          </div>
        ) : null}
      </div>
    </div>
  );
}
