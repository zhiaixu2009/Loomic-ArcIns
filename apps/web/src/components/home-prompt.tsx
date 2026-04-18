"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ImageGenerationPreference,
  VideoGenerationPreference,
} from "@loomic/shared";

import type {
  ImageAttachmentState,
  ReadyAttachment,
} from "../hooks/use-image-attachments";
import type { HomeExampleSelection } from "@/lib/home-example-seeds";
import {
  HOME_PROMPT_TEMPLATE_CATEGORIES,
  type HomePromptTemplate,
} from "../lib/home-prompt-template-data";
import { AgentModelSelector } from "./agent-model-selector";
import { ImageAttachmentBar } from "./image-attachment-bar";
import { PromptTemplateBrowser } from "./prompt-template-browser";
import { useAgentModel } from "../hooks/use-agent-model";
import { useImageModelPreference } from "../hooks/use-image-model-preference";
import { useImageOutputPreference } from "../hooks/use-image-output-preference";
import { useVideoModelPreference } from "../hooks/use-video-model-preference";
import { buildTemplateRecommendedImagePreference } from "../lib/image-model-utils";

export type HomePromptHandle = {
  fill: (text: string) => void;
};

type HomePromptProps = {
  onSubmit: (
    prompt: string,
    attachments?: ReadyAttachment[],
    imageGenerationPreference?: ImageGenerationPreference,
    videoGenerationPreference?: VideoGenerationPreference,
    model?: string,
  ) => void;
  disabled?: boolean;
  attachments?: ImageAttachmentState[];
  onAddFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  isUploading?: boolean;
  readyAttachments?: ReadyAttachment[];
  selectedSeed?: HomeExampleSelection | null;
  onClearSelectedSeed?: () => void;
};

const toolbarButtons = [
  {
    key: "upload",
    title: "上传参考图",
    viewBox: "0 0 24 24",
    path: "M16 1.1A4.9 4.9 0 0 1 20.9 6a4.9 4.9 0 0 1-1.429 3.457h.001l-8.414 8.587-.007.006a2.9 2.9 0 0 1-3.887.193l-.213-.192a2.9 2.9 0 0 1-.007-4.095l8.414-8.586a.9.9 0 0 1 1.286 1.26L8.23 15.216l-.007.006a1.1 1.1 0 0 0 1.556 1.555l8.407-8.579.007-.007a3.1 3.1 0 0 0 .105-4.271l-.105-.112a3.1 3.1 0 0 0-4.384 0L5.4 12.387l-.007.006a5.1 5.1 0 0 0 7.214 7.213l7.749-7.934a.9.9 0 0 1 1.288 1.256l-7.753 7.938q-.005.007-.012.014a6.9 6.9 0 0 1-9.758-9.76l8.408-8.578.007-.007A4.9 4.9 0 0 1 16 1.1",
  },
  {
    key: "template",
    title: "模版",
    viewBox: "0 0 24 24",
    path: "M4 5.75A1.75 1.75 0 0 1 5.75 4h12.5A1.75 1.75 0 0 1 20 5.75v12.5A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25zm1.5 0v3.75h13V5.75a.25.25 0 0 0-.25-.25H5.75a.25.25 0 0 0-.25.25m13 5.25h-13v7.25c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25zM7.75 7a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 7.75 7m3.75 0a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 11.5 7m4.5.75a.75.75 0 0 0-1.5 0v.5a.75.75 0 0 0 1.5 0z",
  },
] as const;

const submitIcon = {
  viewBox: "0 0 14 14",
  path: ["M7 11.5V2.5", "M3 6.5L7 2.5L11 6.5"],
};

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

const HIDDEN_SCROLLBAR_STYLE = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
} as const;

export const HomePrompt = forwardRef<HomePromptHandle, HomePromptProps>(
  function HomePrompt(
    {
      onSubmit,
      disabled,
      attachments,
      onAddFiles,
      onRemoveAttachment,
      isUploading,
      readyAttachments,
      selectedSeed,
      onClearSelectedSeed,
    },
    ref,
  ) {
    const [value, setValue] = useState("");
    const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
    const [aspectRatioMenuOpen, setAspectRatioMenuOpen] = useState(false);
    const [resolutionMenuOpen, setResolutionMenuOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const templateBtnRef = useRef<HTMLButtonElement>(null);
    const templateMenuRef = useRef<HTMLDivElement>(null);
    const aspectRatioBtnRef = useRef<HTMLButtonElement>(null);
    const aspectRatioMenuRef = useRef<HTMLDivElement>(null);
    const resolutionBtnRef = useRef<HTMLButtonElement>(null);
    const resolutionMenuRef = useRef<HTMLDivElement>(null);
    const { preference, setPreference } = useImageModelPreference();
    const {
      preference: imageOutputPreference,
      setAspectRatio,
      setResolution,
    } = useImageOutputPreference();
    const { preference: videoPreference } = useVideoModelPreference();
    const { model: agentModel } = useAgentModel();

    const resizeTextarea = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 104)}px`;
    }, []);

    useImperativeHandle(ref, () => ({
      fill(text: string) {
        setValue(text);
        requestAnimationFrame(() => {
          resizeTextarea();
          textareaRef.current?.focus();
        });
      },
    }), [resizeTextarea]);

    useEffect(() => {
      if (!templateMenuOpen && !aspectRatioMenuOpen && !resolutionMenuOpen) {
        return;
      }

      const handlePointerDown = (event: MouseEvent) => {
        const target = event.target as Node;
        if (
          templateMenuRef.current?.contains(target) ||
          templateBtnRef.current?.contains(target) ||
          aspectRatioMenuRef.current?.contains(target) ||
          aspectRatioBtnRef.current?.contains(target) ||
          resolutionMenuRef.current?.contains(target) ||
          resolutionBtnRef.current?.contains(target)
        ) {
          return;
        }

        setTemplateMenuOpen(false);
        setAspectRatioMenuOpen(false);
        setResolutionMenuOpen(false);
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setTemplateMenuOpen(false);
          setAspectRatioMenuOpen(false);
          setResolutionMenuOpen(false);
        }
      };

      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [aspectRatioMenuOpen, resolutionMenuOpen, templateMenuOpen]);

    const handleSubmit = useCallback(() => {
      const trimmed = value.trim();
      if (
        (!trimmed && (!attachments || attachments.length === 0) && !selectedSeed) ||
        disabled ||
        isUploading
      ) {
        return;
      }

      let mergedAttachments: ReadyAttachment[] | undefined =
        readyAttachments && readyAttachments.length > 0 ? [...readyAttachments] : undefined;

      const seedImageMentions =
        selectedSeed?.inputMentions?.filter((mention) => mention.type === "image") ?? [];

      if (seedImageMentions.length > 0) {
        const seedAttachments: ReadyAttachment[] = seedImageMentions.map((mention, index) => ({
          assetId: `seed-${selectedSeed!.categoryKey}-${index}`,
          url: mention.imgSrc,
          mimeType: "image/webp",
          source: "upload" as const,
          name: mention.name,
        }));

        mergedAttachments = mergedAttachments
          ? [...mergedAttachments, ...seedAttachments]
          : seedAttachments;
      }

      onSubmit(
        trimmed,
        mergedAttachments,
        preference.mode === "manual" && preference.models.length > 0 ? preference : undefined,
        videoPreference.mode === "manual" && videoPreference.models.length > 0
          ? videoPreference
          : undefined,
        agentModel ?? undefined,
      );

      setValue("");
      setTemplateMenuOpen(false);
      resizeTextarea();
    }, [
      agentModel,
      attachments,
      disabled,
      isUploading,
      onSubmit,
      preference,
      readyAttachments,
      resizeTextarea,
      selectedSeed,
      value,
      videoPreference,
    ]);

    const handleApplyTemplate = useCallback((template: HomePromptTemplate) => {
      setPreference(buildTemplateRecommendedImagePreference(template.recommendedImageModelId));
      setValue(template.prompt);
      setTemplateMenuOpen(false);
      requestAnimationFrame(() => {
        resizeTextarea();
        textareaRef.current?.focus();
      });
    }, [resizeTextarea, setPreference]);

    const allTemplateItems = useMemo(
      () =>
        HOME_PROMPT_TEMPLATE_CATEGORIES.flatMap((category) =>
          category.templates.map((template) => ({
            id: template.id,
            label: template.label,
            keywords: [category.label],
            onSelect: () => handleApplyTemplate(template),
          })),
        ),
      [handleApplyTemplate],
    );

    const templateBrowserCategories = useMemo(() => {
      const baseCategories = HOME_PROMPT_TEMPLATE_CATEGORIES.map((category) => ({
        id: category.id,
        label: category.label,
        showChevron: true,
        items: category.templates.map((template) => ({
          id: template.id,
          label: template.label,
          keywords: [category.label],
          onSelect: () => handleApplyTemplate(template),
        })),
      }));

      return [
        {
          id: "all",
          label: "全部",
          items: allTemplateItems,
        },
        {
          id: "hot",
          label: "热度",
          items: allTemplateItems,
        },
        {
          id: "latest",
          label: "最新",
          items: [...allTemplateItems].reverse(),
        },
        ...baseCategories,
      ];
    }, [allTemplateItems, handleApplyTemplate]);

    const handlePaste = useCallback((event: React.ClipboardEvent) => {
      if (!onAddFiles) return;
      const files = Array.from(event.clipboardData.items)
        .filter((item) => item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      if (files.length > 0) {
        event.preventDefault();
        onAddFiles(files);
      }
    }, [onAddFiles]);

    const hasContent =
      value.trim().length > 0 ||
      Boolean(attachments && attachments.length > 0) ||
      Boolean(selectedSeed);
    const aspectRatioLabel =
      imageOutputPreference.aspectRatio === "auto" ? "自动" : imageOutputPreference.aspectRatio;

    return (
      <div className="rounded-[10px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        {selectedSeed ? (
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                  {selectedSeed.categoryLabel}
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {selectedSeed.title}
                </p>
              </div>
              {onClearSelectedSeed ? (
                <button
                  type="button"
                  onClick={onClearSelectedSeed}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-100"
                >
                  清除
                </button>
              ) : null}
            </div>
            <div
              className="flex items-center gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden"
              style={HIDDEN_SCROLLBAR_STYLE}
            >
              {selectedSeed.inputMentions
                .filter((mention) => mention.type === "image")
                .map((mention) => (
                  <div
                    key={`${selectedSeed.title}-${mention.imgSrc}`}
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={mention.imgSrc}
                      alt={mention.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
            </div>
          </div>
        ) : null}
        <div className="px-4 pb-4 pt-4">
          <div className="relative flex min-h-[176px] flex-col rounded-[10px] border border-slate-200 bg-white px-3 py-3">
            <div
              data-testid="home-prompt-input-row"
              className="flex min-h-0 flex-1 flex-col gap-3"
            >
              <div
                data-testid="home-prompt-attachment-rail"
                className="flex min-h-[60px] items-start gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden"
                style={HIDDEN_SCROLLBAR_STYLE}
              >
                {attachments && onRemoveAttachment ? (
                  <ImageAttachmentBar
                    attachments={attachments}
                    onRemove={onRemoveAttachment}
                    variant="composer-inline"
                  />
                ) : null}
                {onAddFiles ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        const files = event.target.files;
                        if (files && files.length > 0) {
                          onAddFiles(Array.from(files));
                        }
                        event.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title={toolbarButtons[0].title}
                      aria-label={toolbarButtons[0].title}
                      className="inline-flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <svg
                        className="h-[18px] w-[18px]"
                        viewBox={toolbarButtons[0].viewBox}
                        fill="currentColor"
                        role="img"
                        aria-label={toolbarButtons[0].title}
                      >
                        <path d={toolbarButtons[0].path} />
                      </svg>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled
                    title={toolbarButtons[0].title}
                    aria-label={toolbarButtons[0].title}
                    className="inline-flex h-[60px] w-[60px] shrink-0 cursor-not-allowed items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600 opacity-40"
                  >
                    <svg
                      className="h-[18px] w-[18px]"
                      viewBox={toolbarButtons[0].viewBox}
                      fill="currentColor"
                      role="img"
                      aria-label={toolbarButtons[0].title}
                    >
                      <path d={toolbarButtons[0].path} />
                    </svg>
                  </button>
                )}
              </div>
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                onPaste={handlePaste}
                onInput={resizeTextarea}
                placeholder="添加图片输入文案开始创作之旅..."
                disabled={disabled}
                rows={1}
                style={HIDDEN_SCROLLBAR_STYLE}
                className="min-h-[56px] max-h-[104px] w-full resize-none bg-transparent px-1 text-[15px] leading-7 text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 [&::-webkit-scrollbar]:hidden"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AgentModelSelector
                  compact
                  fallbackLabel="Banana Pro"
                  source="image"
                />
                <div className="relative">
                  <button
                    ref={aspectRatioBtnRef}
                    type="button"
                    title={aspectRatioLabel}
                    aria-label={aspectRatioLabel}
                    onClick={() => {
                      setAspectRatioMenuOpen((previous) => !previous);
                      setResolutionMenuOpen(false);
                      setTemplateMenuOpen(false);
                    }}
                    className={`flex h-8 items-center gap-1.5 rounded-[10px] border px-2.5 text-[11px] font-medium transition-colors ${
                      aspectRatioMenuOpen
                        ? "border-slate-300 bg-slate-100 text-slate-900"
                        : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <span>{aspectRatioLabel}</span>
                  </button>
                  {aspectRatioMenuOpen ? (
                    <div
                      ref={aspectRatioMenuRef}
                      className="absolute left-0 top-full z-20 mt-3 w-[220px] rounded-[10px] border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.1)]"
                    >
                      <div className="mb-2 px-2 text-[11px] font-medium text-slate-500">
                        画幅比例
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {IMAGE_ASPECT_RATIO_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setAspectRatio(option);
                              setAspectRatioMenuOpen(false);
                            }}
                            className={`inline-flex items-center rounded-[10px] border px-3 py-1.5 text-xs font-medium transition-colors ${
                              imageOutputPreference.aspectRatio === option
                                ? "border-slate-300 bg-slate-100 text-slate-900"
                                : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                            }`}
                          >
                            {option === "auto" ? "自动" : option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="relative">
                  <button
                    ref={resolutionBtnRef}
                    type="button"
                    title={imageOutputPreference.resolution}
                    aria-label={imageOutputPreference.resolution}
                    onClick={() => {
                      setResolutionMenuOpen((previous) => !previous);
                      setAspectRatioMenuOpen(false);
                      setTemplateMenuOpen(false);
                    }}
                    className={`flex h-8 items-center gap-1.5 rounded-[10px] border px-2.5 text-[11px] font-medium transition-colors ${
                      resolutionMenuOpen
                        ? "border-slate-300 bg-slate-100 text-slate-900"
                        : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <span>{imageOutputPreference.resolution}</span>
                  </button>
                  {resolutionMenuOpen ? (
                    <div
                      ref={resolutionMenuRef}
                      className="absolute left-0 top-full z-20 mt-3 w-[220px] rounded-[10px] border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.1)]"
                    >
                      <div className="mb-2 px-2 text-[11px] font-medium text-slate-500">
                        输出分辨率
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {IMAGE_RESOLUTION_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setResolution(option);
                              setResolutionMenuOpen(false);
                            }}
                            className={`inline-flex items-center rounded-[10px] border px-3 py-1.5 text-xs font-medium transition-colors ${
                              imageOutputPreference.resolution === option
                                ? "border-slate-300 bg-slate-100 text-slate-900"
                                : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="relative">
                  <button
                    ref={templateBtnRef}
                    type="button"
                    aria-label="模版"
                    onClick={() => {
                      setTemplateMenuOpen((previous) => !previous);
                      setAspectRatioMenuOpen(false);
                      setResolutionMenuOpen(false);
                    }}
                    className={`flex h-8 items-center gap-1.5 rounded-[10px] border px-2.5 text-[11px] font-medium transition-colors ${
                      templateMenuOpen
                        ? "border-slate-300 bg-slate-100 text-slate-900"
                        : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <svg
                      className="h-[14px] w-[14px]"
                      viewBox={toolbarButtons[1].viewBox}
                      fill="currentColor"
                    >
                      <path d={toolbarButtons[1].path} />
                    </svg>
                    <span>模版</span>
                  </button>

                  {templateMenuOpen ? (
                    <div
                      ref={templateMenuRef}
                      className="absolute left-0 top-full z-20 mt-3"
                    >
                      <PromptTemplateBrowser
                        dataTestId="home-prompt-template-menu"
                        categories={templateBrowserCategories}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={disabled || isUploading || !hasContent}
                aria-label="开始创作"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-slate-900 text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-20"
              >
                <svg
                  className="h-[14px] w-[14px]"
                  viewBox={submitIcon.viewBox}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                >
                  {submitIcon.path.map((segment) => (
                    <path key={segment} d={segment} />
                  ))}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
