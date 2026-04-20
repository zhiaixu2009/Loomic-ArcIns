"use client";

import { Heart, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ArchitecturePromptTemplateSuggestion } from "../lib/architecture-prompt-templates";
import { resolveBrowserAssetUrl } from "../lib/browser-asset-url";
import {
  buildOfficialPromptTemplateSuggestion,
  type OfficialPromptTemplate,
  type OfficialPromptTemplateLibrary,
} from "../lib/prompt-template-library";

export type PromptTemplateBrowserLayout = "comfortable" | "compact";

type PromptTemplateBrowserProps = {
  library: OfficialPromptTemplateLibrary | null;
  status: "idle" | "loading" | "ready" | "error";
  error?: string | null;
  favoriteTemplateIds: Set<string>;
  favoritePendingIds?: Set<string>;
  onToggleFavorite: (templateId: string) => void | Promise<void>;
  onApplyTemplate: (template: ArchitecturePromptTemplateSuggestion) => void;
  onRetry?: () => void | Promise<void>;
  dataTestId?: string;
  className?: string;
  layout?: PromptTemplateBrowserLayout;
  maxHeightPx?: number;
};

const HIDDEN_SCROLLBAR_STYLE = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
} as const;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function buildTemplateImages(template: OfficialPromptTemplate) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of [
    ...template.previewImageUrls,
    template.coverImageUrl,
    template.outputImageUrl,
    ...template.referenceImageUrls,
  ]) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function getCategoryPath(template: OfficialPromptTemplate) {
  return template.topCategoryName === template.leafCategoryName
    ? template.topCategoryName
    : `${template.topCategoryName} / ${template.leafCategoryName}`;
}

function matchesTemplateQuery(template: OfficialPromptTemplate, query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return true;
  }

  return [
    template.title,
    template.promptText,
    template.topCategoryName,
    template.leafCategoryName,
  ]
    .map(normalizeText)
    .some((value) => value.includes(normalizedQuery));
}

export function PromptTemplateBrowser({
  library,
  status,
  error,
  favoriteTemplateIds,
  favoritePendingIds = new Set<string>(),
  onToggleFavorite,
  onApplyTemplate,
  onRetry,
  dataTestId,
  className,
  layout = "comfortable",
  maxHeightPx,
}: PromptTemplateBrowserProps) {
  const compact = layout === "compact";
  const browserHeight = maxHeightPx
    ? `${maxHeightPx}px`
    : compact
      ? "clamp(480px, calc(100vh - 56px), 620px)"
      : "clamp(520px, calc(100vh - 56px), 700px)";
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeTopCategoryKey, setActiveTopCategoryKey] = useState<string | null>(
    null,
  );
  const [activeLeafCategoryKey, setActiveLeafCategoryKey] = useState<string | null>(
    null,
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  const topCategories = library?.topCategories ?? [];
  const activeTopCategory =
    topCategories.find((category) => category.key === activeTopCategoryKey) ??
    topCategories[0] ??
    null;
  const leafTabs =
    activeTopCategory?.children.length && activeTopCategory.children.length > 0
      ? activeTopCategory.children
      : [];

  useEffect(() => {
    if (topCategories.length === 0) {
      setActiveTopCategoryKey(null);
      return;
    }

    if (activeTopCategoryKey && topCategories.some((item) => item.key === activeTopCategoryKey)) {
      return;
    }

    setActiveTopCategoryKey(topCategories[0]?.key ?? null);
  }, [activeTopCategoryKey, topCategories]);

  useEffect(() => {
    if (!activeTopCategory) {
      setActiveLeafCategoryKey(null);
      return;
    }

    if (leafTabs.length === 0) {
      setActiveLeafCategoryKey(activeTopCategory.key);
      return;
    }

    if (activeLeafCategoryKey && leafTabs.some((item) => item.key === activeLeafCategoryKey)) {
      return;
    }

    setActiveLeafCategoryKey(leafTabs[0]?.key ?? null);
  }, [activeLeafCategoryKey, activeTopCategory, leafTabs]);

  const normalizedQuery = normalizeText(query);
  const globalFilterMode = normalizedQuery.length > 0 || favoritesOnly;

  const visibleTemplates = useMemo(() => {
    if (!library || !activeTopCategory) {
      return [];
    }

    return library.templates.filter((template) => {
      if (favoritesOnly && !favoriteTemplateIds.has(template.id)) {
        return false;
      }

      if (!matchesTemplateQuery(template, normalizedQuery)) {
        return false;
      }

      if (globalFilterMode) {
        return true;
      }

      return (
        template.topCategoryKey === activeTopCategory.key &&
        template.leafCategoryKey === activeLeafCategoryKey
      );
    });
  }, [
    activeLeafCategoryKey,
    activeTopCategory,
    favoriteTemplateIds,
    favoritesOnly,
    globalFilterMode,
    library,
    normalizedQuery,
  ]);

  useEffect(() => {
    if (visibleTemplates.length === 0) {
      setActiveTemplateId(null);
      setActivePreviewIndex(0);
      return;
    }

    if (activeTemplateId && visibleTemplates.some((item) => item.id === activeTemplateId)) {
      return;
    }

    setActiveTemplateId(visibleTemplates[0]?.id ?? null);
    setActivePreviewIndex(0);
  }, [activeTemplateId, visibleTemplates]);

  const activeTemplate =
    visibleTemplates.find((template) => template.id === activeTemplateId) ??
    visibleTemplates[0] ??
    null;
  const activeTemplateImages = activeTemplate ? buildTemplateImages(activeTemplate) : [];
  const activePreviewUrl = activeTemplateImages[activePreviewIndex] ?? activeTemplateImages[0] ?? "";

  useEffect(() => {
    if (activePreviewIndex < activeTemplateImages.length) {
      return;
    }

    setActivePreviewIndex(0);
  }, [activePreviewIndex, activeTemplateImages.length]);

  const summaryLabel = globalFilterMode
    ? favoritesOnly && normalizedQuery.length === 0
      ? "收藏模板"
      : `搜索结果 ${visibleTemplates.length}`
    : activeTopCategory?.name ?? "模板";

  const renderContent = () => {
    if (status === "loading" && !library) {
      return (
        <div className="flex min-h-[360px] items-center justify-center rounded-[8px] border border-slate-200 bg-slate-50 text-sm text-slate-500">
          正在加载官方模板库...
        </div>
      );
    }

    if (status === "error" && !library) {
      return (
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-[8px] border border-slate-200 bg-slate-50 px-6 text-center">
          <p className="text-sm text-slate-600">
            {error ?? "模板库暂时不可用，请稍后再试。"}
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={() => void onRetry()}
              className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
              <span>重新加载</span>
            </button>
          ) : null}
        </div>
      );
    }

    return (
      <div
        className={`grid min-h-0 flex-1 gap-3 ${
          compact
            ? "grid-cols-1 md:grid-cols-[156px_minmax(0,1fr)] xl:grid-cols-[156px_minmax(0,1fr)_288px]"
            : "grid-cols-1 md:grid-cols-[168px_minmax(0,1fr)] xl:grid-cols-[168px_minmax(0,1fr)_300px]"
        }`}
      >
        <div className="flex min-w-0 min-h-0 flex-col">
          <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            分类
          </div>
          <div
            data-testid="template-browser-top-category-list"
            className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden"
            style={HIDDEN_SCROLLBAR_STYLE}
          >
            {topCategories.map((category) => {
              const active = category.key === activeTopCategory?.key;

              return (
                <button
                  key={category.key}
                  type="button"
                  aria-label={category.name}
                  aria-pressed={active}
                  onClick={() => {
                    setActiveTopCategoryKey(category.key);
                    setActiveLeafCategoryKey(category.children[0]?.key ?? category.key);
                  }}
                  className={`flex min-h-[44px] flex-col items-start justify-center gap-0.5 rounded-[8px] border px-2.5 py-2 text-left transition-colors ${
                    active
                      ? "border-slate-300 bg-slate-100 text-slate-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="w-full whitespace-normal break-words text-[12px] font-medium leading-4">
                    {category.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {category.templateCount} 个模板
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 min-h-0 flex-col">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">{summaryLabel}</div>
              <div className="mt-1 text-xs text-slate-500">
                {globalFilterMode
                  ? "搜索和收藏会跨分类聚合展示，方便快速找到官方模板。"
                  : "悬停或点击模板卡片即可在右侧查看完整提示词与预览图。"}
              </div>
            </div>
            {status === "loading" && library ? (
              <div className="text-xs text-slate-400">正在同步...</div>
            ) : null}
          </div>

          {!globalFilterMode && leafTabs.length > 0 ? (
            <div
              data-testid="template-browser-leaf-tabs"
              className="mb-2 flex flex-wrap gap-1.5"
            >
              {leafTabs.map((leaf) => {
                const active = leaf.key === activeLeafCategoryKey;

                return (
                  <button
                    key={leaf.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveLeafCategoryKey(leaf.key)}
                    className={`inline-flex items-center rounded-[8px] border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                      active
                        ? "border-slate-300 bg-slate-100 text-slate-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {leaf.name}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div
            data-testid="template-browser-card-grid"
            className={`grid min-h-0 flex-1 content-start auto-rows-max gap-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden ${
              compact ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-3"
            }`}
            style={HIDDEN_SCROLLBAR_STYLE}
          >
            {visibleTemplates.map((template) => {
              const active = template.id === activeTemplate?.id;
              const isFavorite = favoriteTemplateIds.has(template.id);
              const cardImage = buildTemplateImages(template)[0] ?? template.coverImageUrl;

              return (
                <div
                  key={template.id}
                  className={`group relative rounded-[8px] border transition-colors ${
                    active
                      ? "border-slate-300 bg-slate-100/80"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={template.title}
                    onClick={() => {
                      setActiveTemplateId(template.id);
                      setActivePreviewIndex(0);
                    }}
                    onFocus={() => {
                      setActiveTemplateId(template.id);
                      setActivePreviewIndex(0);
                    }}
                    onMouseEnter={() => {
                      setActiveTemplateId(template.id);
                      setActivePreviewIndex(0);
                    }}
                    className="flex w-full flex-col overflow-hidden rounded-[8px] text-left"
                  >
                    <div className="aspect-[21/10] w-full overflow-hidden bg-slate-100">
                      {cardImage ? (
                        <img
                          src={resolveBrowserAssetUrl(cardImage)}
                          alt={`${template.title} 封面图`}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                          暂无预览
                        </div>
                      )}
                    </div>
                    <div className="px-2.5 pb-2 pt-1.5">
                      <div className="min-h-[2.25rem] line-clamp-2 text-[13px] font-semibold leading-[1.125rem] text-slate-900">
                        {template.title}
                      </div>
                      <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {getCategoryPath(template)}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-label={`${isFavorite ? "取消收藏" : "收藏"} ${template.title}`}
                    onClick={() => void onToggleFavorite(template.id)}
                    disabled={favoritePendingIds.has(template.id)}
                    className={`absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-[8px] border bg-white/90 backdrop-blur transition-colors ${
                      isFavorite
                        ? "border-slate-300 text-slate-900"
                        : "border-slate-200 text-slate-500 hover:text-slate-900"
                    } disabled:cursor-wait disabled:opacity-60`}
                  >
                    <Heart
                      className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {visibleTemplates.length === 0 ? (
            <div className="mt-2 rounded-[8px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              {favoritesOnly
                ? "还没有收藏任何模板。"
                : normalizedQuery
                  ? "没有找到匹配的官方模板。"
                  : "当前分类暂无可用模板。"}
            </div>
          ) : null}
        </div>

        <div
          data-testid="template-browser-detail-panel"
          className="md:col-span-2 xl:col-span-1 flex h-full min-h-0 min-w-0 flex-col rounded-[8px] border border-slate-200 bg-slate-50 p-2.5"
        >
          {activeTemplate ? (
            <>
              <div className="mb-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="line-clamp-2 text-base font-semibold text-slate-900">
                    {activeTemplate.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {getCategoryPath(activeTemplate)}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`${
                    favoriteTemplateIds.has(activeTemplate.id) ? "取消收藏" : "收藏"
                  } ${activeTemplate.title}`}
                  onClick={() => void onToggleFavorite(activeTemplate.id)}
                  disabled={favoritePendingIds.has(activeTemplate.id)}
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border bg-white transition-colors ${
                    favoriteTemplateIds.has(activeTemplate.id)
                      ? "border-slate-300 text-slate-900"
                      : "border-slate-200 text-slate-500 hover:text-slate-900"
                  } disabled:cursor-wait disabled:opacity-60`}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      favoriteTemplateIds.has(activeTemplate.id) ? "fill-current" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
                {activePreviewUrl ? (
                  <img
                    src={resolveBrowserAssetUrl(activePreviewUrl)}
                    alt={`${activeTemplate.title} 预览图 ${activePreviewIndex + 1}`}
                    className="aspect-[5/4] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[5/4] items-center justify-center text-sm text-slate-400">
                    暂无预览图
                  </div>
                )}
              </div>

              {activeTemplateImages.length > 1 ? (
                <div
                  className="mt-2.5 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
                  style={HIDDEN_SCROLLBAR_STYLE}
                >
                  {activeTemplateImages.map((imageUrl, index) => {
                    const active = index === activePreviewIndex;

                    return (
                      <button
                        key={`${activeTemplate.id}-${imageUrl}`}
                        type="button"
                        aria-label={`${activeTemplate.title} 预览缩略图 ${index + 1}`}
                        onClick={() => setActivePreviewIndex(index)}
                        className={`h-12 w-12 shrink-0 overflow-hidden rounded-[8px] border transition-colors ${
                          active
                            ? "border-slate-300"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <img
                          src={resolveBrowserAssetUrl(imageUrl)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-3 flex min-h-0 flex-1 flex-col">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  完整提示词
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto rounded-[8px] border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-700 [&::-webkit-scrollbar]:hidden">
                  {activeTemplate.promptText}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onApplyTemplate(buildOfficialPromptTemplateSuggestion(activeTemplate))
                }
                className="mt-3 inline-flex w-full items-center justify-center rounded-[8px] bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                使用模板
              </button>
            </>
          ) : (
            <div className="flex h-full min-h-[360px] items-center justify-center text-center text-sm text-slate-500">
              选择一个模板后，这里会显示完整提示词和预览图。
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      data-testid={dataTestId}
      className={[
        compact
          ? "flex h-full w-full flex-col overflow-hidden rounded-[10px] border border-slate-200 bg-white p-3 shadow-[0_20px_56px_rgba(15,23,42,0.12)]"
          : "flex h-full w-full flex-col overflow-hidden rounded-[10px] border border-slate-200 bg-white p-3 shadow-[0_20px_56px_rgba(15,23,42,0.12)]",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        height: browserHeight,
        maxHeight: "calc(100vh - 32px)",
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索模板"
            aria-label="搜索模板"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </label>
        <div className="inline-flex items-center gap-1.5 rounded-[10px] border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            aria-pressed={!favoritesOnly}
            onClick={() => setFavoritesOnly(false)}
            className={`rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors ${
              !favoritesOnly
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            全部
          </button>
          <button
            type="button"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly(true)}
            className={`rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors ${
              favoritesOnly
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            收藏
          </button>
        </div>
      </div>

      {error && library ? (
        <div className="mb-3 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {error}
        </div>
      ) : null}

      {renderContent()}
    </div>
  );
}
