"use client";

import { LayoutTemplate } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useImageOutputPreference } from "../hooks/use-image-output-preference";
import type { ArchitecturePromptTemplateSuggestion } from "../lib/architecture-prompt-templates";
import { AgentModelSelector } from "./agent-model-selector";
import {
  PromptTemplateBrowser,
  type PromptTemplateBrowserCategory,
  type PromptTemplateBrowserLayout,
} from "./prompt-template-browser";

const IMAGE_ASPECT_RATIO_OPTIONS = [
  "auto",
  "16:9",
  "4:3",
  "1:1",
  "3:4",
  "9:16",
  "21:9",
] as const;

const IMAGE_RESOLUTION_OPTIONS = ["1K", "2K", "4K"] as const;
const VIEWPORT_PADDING = 16;
const POPOVER_GAP = 12;

export type ArchitectureChatControlsPreset = "home" | "canvas" | "sidebar";

type PopoverPosition = {
  left: number;
  top: number;
  width: number;
  placement: "above" | "below";
};

type ArchitectureChatControlsProps = {
  preset: ArchitectureChatControlsPreset;
  templateSuggestions?: ArchitecturePromptTemplateSuggestion[];
  onApplyTemplate: (template: ArchitecturePromptTemplateSuggestion) => void;
  className?: string;
  outputMenuTestId?: string;
  templateMenuTestId?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPresetConfig(preset: ArchitectureChatControlsPreset): {
  outputWidth: number;
  templateWidth: number;
  preferredPlacement: "above" | "below";
  align: "left" | "center" | "right";
  browserLayout: PromptTemplateBrowserLayout;
} {
  switch (preset) {
    case "canvas":
      return {
        outputWidth: 332,
        templateWidth: 720,
        preferredPlacement: "above",
        align: "center",
        browserLayout: "comfortable",
      };
    case "sidebar":
      return {
        outputWidth: 300,
        templateWidth: 430,
        preferredPlacement: "above",
        align: "left",
        browserLayout: "compact",
      };
    case "home":
    default:
      return {
        outputWidth: 332,
        templateWidth: 760,
        preferredPlacement: "below",
        align: "left",
        browserLayout: "comfortable",
      };
  }
}

function formatAspectRatioLabel(value: (typeof IMAGE_ASPECT_RATIO_OPTIONS)[number]) {
  return value === "auto" ? "自动" : value;
}

function computePopoverPosition(
  anchorRect: DOMRect,
  options: {
    preferredPlacement: "above" | "below";
    align: "left" | "center" | "right";
    width: number;
    estimatedHeight: number;
  },
): PopoverPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(options.width, viewportWidth - VIEWPORT_PADDING * 2);
  const spaceAbove = anchorRect.top - VIEWPORT_PADDING;
  const spaceBelow = viewportHeight - anchorRect.bottom - VIEWPORT_PADDING;
  const placement =
    options.preferredPlacement === "above"
      ? spaceAbove >= options.estimatedHeight || spaceAbove >= spaceBelow
        ? "above"
        : "below"
      : spaceBelow >= options.estimatedHeight || spaceBelow >= spaceAbove
        ? "below"
        : "above";

  let left = anchorRect.left;
  if (options.align === "center") {
    left = anchorRect.left + anchorRect.width / 2 - width / 2;
  } else if (options.align === "right") {
    left = anchorRect.right - width;
  }

  return {
    left: clamp(left, VIEWPORT_PADDING, viewportWidth - VIEWPORT_PADDING - width),
    top:
      placement === "above"
        ? anchorRect.top - POPOVER_GAP
        : anchorRect.bottom + POPOVER_GAP,
    width,
    placement,
  };
}

export function ArchitectureChatControls({
  preset,
  templateSuggestions = [],
  onApplyTemplate,
  className,
  outputMenuTestId,
  templateMenuTestId,
}: ArchitectureChatControlsProps) {
  const { preference, setAspectRatio, setResolution } =
    useImageOutputPreference();
  const outputButtonRef = useRef<HTMLButtonElement>(null);
  const outputMenuRef = useRef<HTMLDivElement>(null);
  const templateButtonRef = useRef<HTMLButtonElement>(null);
  const templateMenuRef = useRef<HTMLDivElement>(null);
  const [outputMenuOpen, setOutputMenuOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [outputMenuPosition, setOutputMenuPosition] =
    useState<PopoverPosition | null>(null);
  const [templateMenuPosition, setTemplateMenuPosition] =
    useState<PopoverPosition | null>(null);
  const presetConfig = getPresetConfig(preset);

  const outputLabel = `${formatAspectRatioLabel(preference.aspectRatio)} | ${preference.resolution}`;
  const hasTemplates = templateSuggestions.length > 0;

  const templateCategories = useMemo<PromptTemplateBrowserCategory[]>(() => {
    const grouped = new Map<string, PromptTemplateBrowserCategory>();

    templateSuggestions.forEach((template) => {
      const categoryId = template.categoryId ?? "architecture";
      const categoryLabel = template.categoryLabel ?? "建筑模板";
      const category = grouped.get(categoryId);
      const item = {
        id: template.id,
        label: template.label,
        keywords: [categoryLabel, template.prompt],
        onSelect: () => {
          onApplyTemplate(template);
          setTemplateMenuOpen(false);
        },
      };

      if (category) {
        category.items.push(item);
        return;
      }

      grouped.set(categoryId, {
        id: categoryId,
        label: categoryLabel,
        showChevron: true,
        items: [item],
      });
    });

    return Array.from(grouped.values());
  }, [onApplyTemplate, templateSuggestions]);

  const updateOutputMenuPosition = useCallback(() => {
    if (!outputButtonRef.current) {
      return;
    }

    setOutputMenuPosition(
      computePopoverPosition(outputButtonRef.current.getBoundingClientRect(), {
        preferredPlacement: presetConfig.preferredPlacement,
        align: presetConfig.align,
        width: presetConfig.outputWidth,
        estimatedHeight: 220,
      }),
    );
  }, [presetConfig.align, presetConfig.outputWidth, presetConfig.preferredPlacement]);

  const updateTemplateMenuPosition = useCallback(() => {
    if (!templateButtonRef.current) {
      return;
    }

    setTemplateMenuPosition(
      computePopoverPosition(templateButtonRef.current.getBoundingClientRect(), {
        preferredPlacement: presetConfig.preferredPlacement,
        align:
          preset === "canvas"
            ? "center"
            : preset === "sidebar"
              ? "left"
              : "left",
        width: presetConfig.templateWidth,
        estimatedHeight: presetConfig.browserLayout === "compact" ? 360 : 420,
      }),
    );
  }, [
    preset,
    presetConfig.browserLayout,
    presetConfig.preferredPlacement,
    presetConfig.templateWidth,
  ]);

  useEffect(() => {
    if (!outputMenuOpen) {
      setOutputMenuPosition(null);
      return;
    }

    updateOutputMenuPosition();
    const handleWindowChange = () => updateOutputMenuPosition();
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [outputMenuOpen, updateOutputMenuPosition]);

  useEffect(() => {
    if (!templateMenuOpen) {
      setTemplateMenuPosition(null);
      return;
    }

    updateTemplateMenuPosition();
    const handleWindowChange = () => updateTemplateMenuPosition();
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [templateMenuOpen, updateTemplateMenuPosition]);

  useEffect(() => {
    if (!outputMenuOpen && !templateMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        outputMenuRef.current?.contains(target) ||
        outputButtonRef.current?.contains(target) ||
        templateMenuRef.current?.contains(target) ||
        templateButtonRef.current?.contains(target)
      ) {
        return;
      }

      setOutputMenuOpen(false);
      setTemplateMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOutputMenuOpen(false);
        setTemplateMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [outputMenuOpen, templateMenuOpen]);

  return (
    <>
      <div className={["flex items-center gap-2", className ?? ""].filter(Boolean).join(" ")}>
        <AgentModelSelector compact fallbackLabel="Banana Pro" source="image" />

        <button
          ref={outputButtonRef}
          type="button"
          aria-label={outputLabel}
          title={outputLabel}
          onClick={() => {
            setOutputMenuOpen((previous) => !previous);
            setTemplateMenuOpen(false);
          }}
          className={`inline-flex h-8 items-center justify-center rounded-full border px-3 text-[11px] font-medium text-slate-700 transition-colors ${
            outputMenuOpen
              ? "border-slate-300 bg-slate-100 text-slate-900"
              : "border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          {outputLabel}
        </button>

        {hasTemplates ? (
          <button
            ref={templateButtonRef}
            type="button"
            aria-label="模板"
            title="模板"
            onClick={() => {
              setTemplateMenuOpen((previous) => !previous);
              setOutputMenuOpen(false);
            }}
            className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-3 text-[11px] font-medium text-slate-700 transition-colors ${
              templateMenuOpen
                ? "border-slate-300 bg-slate-100 text-slate-900"
                : "border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            <span>模板</span>
          </button>
        ) : null}
      </div>

      {outputMenuOpen && outputMenuPosition
        ? createPortal(
            <div
              ref={outputMenuRef}
              data-testid={outputMenuTestId}
              className="fixed z-[120] rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_24px_64px_rgba(15,23,42,0.12)]"
              style={{
                left: outputMenuPosition.left,
                top: outputMenuPosition.top,
                width: outputMenuPosition.width,
                transform:
                  outputMenuPosition.placement === "above"
                    ? "translateY(-100%)"
                    : undefined,
              }}
            >
              <div className="mb-3">
                <div className="mb-2 px-1 text-[11px] font-medium text-slate-500">
                  画幅比例
                </div>
                <div className="flex flex-wrap gap-2">
                  {IMAGE_ASPECT_RATIO_OPTIONS.map((option) => {
                    const selected = preference.aspectRatio === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setAspectRatio(option)}
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selected
                            ? "border-slate-300 bg-slate-100 text-slate-900"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {formatAspectRatioLabel(option)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 px-1 text-[11px] font-medium text-slate-500">
                  输出清晰度
                </div>
                <div className="flex flex-wrap gap-2">
                  {IMAGE_RESOLUTION_OPTIONS.map((option) => {
                    const selected = preference.resolution === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setResolution(option)}
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selected
                            ? "border-slate-300 bg-slate-100 text-slate-900"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 px-1 text-[11px] text-slate-500">
                  高分辨率实际生成受账号权限影响，所选规格会在三处创作入口之间同步。
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}

      {templateMenuOpen && templateMenuPosition && hasTemplates
        ? createPortal(
            <div
              ref={templateMenuRef}
              data-testid={templateMenuTestId}
              className="fixed z-[120]"
              style={{
                left: templateMenuPosition.left,
                top: templateMenuPosition.top,
                width: templateMenuPosition.width,
                transform:
                  templateMenuPosition.placement === "above"
                    ? "translateY(-100%)"
                    : undefined,
              }}
            >
              <PromptTemplateBrowser
                categories={templateCategories}
                layout={presetConfig.browserLayout}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
