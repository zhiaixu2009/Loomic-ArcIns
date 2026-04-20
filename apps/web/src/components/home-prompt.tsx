"use client";

import {
  forwardRef,
  useCallback,
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
import type { ArchitecturePromptTemplateSuggestion } from "../lib/architecture-prompt-templates";
import { ArchitectureChatControls } from "./architecture-chat-controls";
import { ImageAttachmentBar } from "./image-attachment-bar";
import { useAgentModel } from "../hooks/use-agent-model";
import { useImageModelPreference } from "../hooks/use-image-model-preference";
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
] as const;

const submitIcon = {
  viewBox: "0 0 14 14",
  path: ["M7 11.5V2.5", "M3 6.5L7 2.5L11 6.5"],
};

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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { preference, setPreference } = useImageModelPreference();
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

    const handleApplyTemplate = useCallback((template: ArchitecturePromptTemplateSuggestion) => {
      setPreference(buildTemplateRecommendedImagePreference(template.recommendedImageModelId));
      setValue(template.prompt);
      requestAnimationFrame(() => {
        resizeTextarea();
        textareaRef.current?.focus();
      });
    }, [resizeTextarea, setPreference]);

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
              <ArchitectureChatControls
                preset="home"
                onApplyTemplate={handleApplyTemplate}
                templateMenuTestId="home-prompt-template-menu"
              />

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
