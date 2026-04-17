"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
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
import { AgentModelSelector } from "./agent-model-selector";
import { ImageAttachmentBar } from "./image-attachment-bar";
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

type HomePromptTemplate = {
  id: string;
  label: string;
  prompt: string;
  recommendedImageModelId?: string;
};

const toolbarButtons = [
  {
    key: "upload",
    title: "上传参考图",
    viewBox: "0 0 24 24",
    path: "M16 1.1A4.9 4.9 0 0 1 20.9 6a4.9 4.9 0 0 1-1.429 3.457h.001l-8.414 8.587-.007.006a2.9 2.9 0 0 1-3.887.193l-.213-.192a2.9 2.9 0 0 1-.007-4.095l8.414-8.586a.9.9 0 0 1 1.286 1.26L8.23 15.216l-.007.006a1.1 1.1 0 0 0 1.556 1.555l8.407-8.579.007-.007a3.1 3.1 0 0 0 .105-4.271l-.105-.112a3.1 3.1 0 0 0-4.384 0L5.4 12.387l-.007.006a5.1 5.1 0 0 0 7.214 7.213l7.749-7.934a.9.9 0 0 1 1.288 1.256l-7.753 7.938q-.005.007-.012.014a6.9 6.9 0 0 1-9.758-9.76l8.408-8.578.007-.007A4.9 4.9 0 0 1 16 1.1",
  },
  {
    key: "model-preference",
    title: "模型偏好",
    viewBox: "0 0 24 24",
    path: "M10.8 1.307a2.33 2.33 0 0 1 2.4 0l7.67 4.602A2.33 2.33 0 0 1 22 7.907v8.361a2.33 2.33 0 0 1-1.13 1.998l-7.67 4.602-.141.078a2.33 2.33 0 0 1-2.258-.078l-7.67-4.602A2.33 2.33 0 0 1 2 16.268V7.907a2.33 2.33 0 0 1 1.003-1.915l.128-.083z",
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
  path: [
    "M7 11.5V2.5",
    "M3 6.5L7 2.5L11 6.5",
  ],
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

const HOME_PROMPT_TEMPLATES: HomePromptTemplate[] = [
  {
    id: "site-analysis",
    label: "场地分析框架",
    prompt:
      "请围绕当前项目整理场地关系、动线、视线与功能分区，输出一份可以直接进入无限画布的场地分析框架。",
  },
  {
    id: "render-variation",
    label: "效果图深化方向",
    prompt:
      "请基于当前建筑概念整理一组效果图深化方向，明确体量、材料、光线、时间段和氛围关键词。",
  },
  {
    id: "presentation-video",
    label: "演示视频脚本",
    prompt:
      "请为当前建筑方案生成一份演示视频脚本，包含开场、场地进入、核心空间展示、动线体验与结尾总结。",
  },
];

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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const templateBtnRef = useRef<HTMLButtonElement>(null);
    const templateMenuRef = useRef<HTMLDivElement>(null);
    const aspectRatioBtnRef = useRef<HTMLButtonElement>(null);
    const aspectRatioMenuRef = useRef<HTMLDivElement>(null);
    const resolutionBtnRef = useRef<HTMLButtonElement>(null);
    const resolutionMenuRef = useRef<HTMLDivElement>(null);
    const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
    const [aspectRatioMenuOpen, setAspectRatioMenuOpen] = useState(false);
    const [resolutionMenuOpen, setResolutionMenuOpen] = useState(false);
    const { preference, setPreference } = useImageModelPreference();
    const {
      preference: imageOutputPreference,
      setAspectRatio,
      setResolution,
    } = useImageOutputPreference();
    const { preference: videoPreference } = useVideoModelPreference();
    const { model: agentModel } = useAgentModel();

    useImperativeHandle(ref, () => ({
      fill(text: string) {
        setValue(text);
        requestAnimationFrame(() => {
          const textarea = textareaRef.current;
          if (!textarea) return;
          textarea.style.height = "auto";
          textarea.style.height = `${textarea.scrollHeight}px`;
          textarea.focus();
        });
      },
    }));

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

    const hasContent =
      value.trim().length > 0 || Boolean(attachments && attachments.length > 0);
    const architectureAspectRatioLabel =
      imageOutputPreference.aspectRatio === "auto"
        ? "自动"
        : imageOutputPreference.aspectRatio;
    const architectureResolutionLabel = imageOutputPreference.resolution;

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
        readyAttachments && readyAttachments.length > 0
          ? [...readyAttachments]
          : undefined;

      const seedImageMentions =
        selectedSeed?.inputMentions?.filter((mention) => mention.type === "image") ?? [];

      if (seedImageMentions.length > 0) {
        const seedAttachments: ReadyAttachment[] = seedImageMentions.map(
          (mention, index) => ({
            assetId: `seed-${selectedSeed!.categoryKey}-${index}`,
            url: mention.imgSrc,
            mimeType: "image/webp",
            source: "upload" as const,
            name: mention.name,
          }),
        );

        mergedAttachments = mergedAttachments
          ? [...mergedAttachments, ...seedAttachments]
          : seedAttachments;
      }

      onSubmit(
        trimmed,
        mergedAttachments,
        preference.mode === "manual" && preference.models.length > 0
          ? preference
          : undefined,
        videoPreference.mode === "manual" && videoPreference.models.length > 0
          ? videoPreference
          : undefined,
        agentModel ?? undefined,
      );

      setValue("");
      setTemplateMenuOpen(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }, [
      agentModel,
      attachments,
      disabled,
      isUploading,
      onSubmit,
      preference,
      readyAttachments,
      selectedSeed,
      value,
      videoPreference,
    ]);

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.nativeEvent.isComposing
        ) {
          event.preventDefault();
          handleSubmit();
        }
      },
      [handleSubmit],
    );

    const handlePaste = useCallback(
      (event: React.ClipboardEvent) => {
        if (!onAddFiles) return;

        const files = Array.from(event.clipboardData.items)
          .filter((item) => item.type.startsWith("image/"))
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null);

        if (files.length > 0) {
          event.preventDefault();
          onAddFiles(files);
        }
      },
      [onAddFiles],
    );

    const handleInput = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }, []);

    const handleApplyTemplate = useCallback((template: HomePromptTemplate) => {
      setPreference(
        buildTemplateRecommendedImagePreference(
          template.recommendedImageModelId,
        ),
      );
      setValue(template.prompt);
      setTemplateMenuOpen(false);
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
        textarea.focus();
      });
    }, [setPreference]);

    const handleSelectAspectRatio = useCallback(
      (nextAspectRatio: (typeof IMAGE_ASPECT_RATIO_OPTIONS)[number]) => {
        setAspectRatio(nextAspectRatio);
        setAspectRatioMenuOpen(false);
      },
      [setAspectRatio],
    );

    const handleSelectResolution = useCallback(
      (nextResolution: (typeof IMAGE_RESOLUTION_OPTIONS)[number]) => {
        setResolution(nextResolution);
        setResolutionMenuOpen(false);
      },
      [setResolution],
    );

    return (
      <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        {attachments && onRemoveAttachment ? (
          <ImageAttachmentBar
            attachments={attachments}
            onRemove={onRemoveAttachment}
          />
        ) : null}

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

            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
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
          <div
            data-testid="home-prompt-input-row"
            className="flex min-h-[86px] items-end gap-3 rounded-[10px] border border-slate-200 bg-white px-3 py-3"
          >
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
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <svg
                    className="h-[16px] w-[16px]"
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
                className="inline-flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600 opacity-40"
              >
                <svg
                  className="h-[16px] w-[16px]"
                  viewBox={toolbarButtons[0].viewBox}
                  fill="currentColor"
                  role="img"
                  aria-label={toolbarButtons[0].title}
                >
                  <path d={toolbarButtons[0].path} />
                </svg>
              </button>
            )}

            <textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onInput={handleInput}
              placeholder="添加图片输入文案开始创作之旅..."
              disabled={disabled}
              rows={2}
              className="min-h-[72px] flex-1 resize-none bg-transparent text-[15px] leading-7 text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={disabled || isUploading || !hasContent}
              aria-label="开始创作"
              className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-20"
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

          <div className="relative mt-3 flex items-center justify-between gap-3">
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
                  title={architectureAspectRatioLabel}
                  aria-label={architectureAspectRatioLabel}
                  onClick={() => {
                    setAspectRatioMenuOpen((previous) => !previous);
                    setResolutionMenuOpen(false);
                    setTemplateMenuOpen(false);
                  }}
                  className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
                    aspectRatioMenuOpen
                      ? "border-slate-300 bg-slate-100 text-slate-900"
                      : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span>{architectureAspectRatioLabel}</span>
                </button>
                {aspectRatioMenuOpen ? (
                  <div
                    ref={aspectRatioMenuRef}
                    className="absolute bottom-full left-0 z-20 mb-2 w-[220px] rounded-[10px] border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.1)]"
                  >
                    <div className="mb-2 px-2 text-[11px] font-medium text-slate-500">
                      画幅比例
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {IMAGE_ASPECT_RATIO_OPTIONS.map((option) => {
                        const label = option === "auto" ? "自动" : option;
                        const selected = imageOutputPreference.aspectRatio === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleSelectAspectRatio(option)}
                            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              selected
                                ? "border-slate-300 bg-slate-100 text-slate-900"
                                : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  ref={resolutionBtnRef}
                  type="button"
                  title={architectureResolutionLabel}
                  aria-label={architectureResolutionLabel}
                  onClick={() => {
                    setResolutionMenuOpen((previous) => !previous);
                    setAspectRatioMenuOpen(false);
                    setTemplateMenuOpen(false);
                  }}
                  className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
                    resolutionMenuOpen
                      ? "border-slate-300 bg-slate-100 text-slate-900"
                      : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span>{architectureResolutionLabel}</span>
                </button>
                {resolutionMenuOpen ? (
                  <div
                    ref={resolutionMenuRef}
                    className="absolute bottom-full left-0 z-20 mb-2 w-[220px] rounded-[10px] border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.1)]"
                  >
                    <div className="mb-2 px-2 text-[11px] font-medium text-slate-500">
                      输出分辨率
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {IMAGE_RESOLUTION_OPTIONS.map((option) => {
                        const selected = imageOutputPreference.resolution === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleSelectResolution(option)}
                            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              selected
                                ? "border-slate-300 bg-slate-100 text-slate-900"
                                : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                ref={templateBtnRef}
                type="button"
                aria-label="模版"
                onClick={() => {
                  setTemplateMenuOpen((previous) => !previous);
                  setAspectRatioMenuOpen(false);
                  setResolutionMenuOpen(false);
                }}
                className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
                  templateMenuOpen
                    ? "border-slate-300 bg-slate-100 text-slate-900"
                    : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                }`}
              >
                <svg
                  className="h-[14px] w-[14px]"
                  viewBox={toolbarButtons[2].viewBox}
                  fill="currentColor"
                >
                  <path d={toolbarButtons[2].path} />
                </svg>
                <span>模版</span>
              </button>
            </div>

            {templateMenuOpen ? (
              <div
                ref={templateMenuRef}
                className="absolute bottom-full left-[208px] z-20 mb-2 w-[260px] rounded-[10px] border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.1)]"
              >
                <div className="mb-2 px-2 text-[11px] font-medium text-slate-500">
                  快捷模版
                </div>
                <div className="flex flex-wrap gap-2">
                  {HOME_PROMPT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleApplyTemplate(template)}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition-colors hover:bg-slate-50"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  },
);
