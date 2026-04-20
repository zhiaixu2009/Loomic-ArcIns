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
import { ArrowLeft, ArrowRight, LayoutTemplate, X } from "lucide-react";

import type { MessageMention } from "@loomic/shared";
import type { ImageAttachmentState } from "../hooks/use-image-attachments";
import type { CanvasSelectedElement } from "./canvas-editor";
import { useImageModelPreference } from "../hooks/use-image-model-preference";
import { useImageOutputPreference } from "../hooks/use-image-output-preference";
import { useVideoModelPreference } from "../hooks/use-video-model-preference";
import type { ArchitecturePromptTemplateSuggestion } from "../lib/architecture-prompt-templates";
import { resolveBrowserAssetUrl } from "../lib/browser-asset-url";
import { buildTemplateRecommendedImagePreference } from "../lib/image-model-utils";
import { AgentModelSelector } from "./agent-model-selector";
import {
  ArchitectureChatControls,
  type ArchitectureChatControlsPreset,
} from "./architecture-chat-controls";
import { ImageAttachmentBar } from "./image-attachment-bar";
import { ImageModelPreferencePopover } from "./image-model-preference";

type ChatInputProps = {
  onSend: (message: string) => void;
  attachedReferenceCount?: number;
  disabled?: boolean;
  attachments?: ImageAttachmentState[];
  onAddFiles?: (files: File[]) => void;
  onAttachSelectedCanvasImages?: () => void;
  onMoveSelectedCanvasImage?: (
    elementId: string,
    direction: "left" | "right",
  ) => void;
  onRemoveSelectedCanvasImage?: (elementId: string) => void;
  onMoveAttachment?: (id: string, direction: "left" | "right") => void;
  onRemoveAttachment?: (id: string) => void;
  onRetryAttachment?: (id: string) => void;
  isUploading?: boolean;
  onAtQuery?: (query: string | null) => void;
  mentions?: MessageMention[];
  onRemoveMention?: (mention: MessageMention) => void;
  selectedCanvasElements?: CanvasSelectedElement[];
  templateSuggestions?: ChatInputTemplateSuggestion[];
  immersiveArchitecture?: boolean;
  architectureControlsPreset?: ArchitectureChatControlsPreset;
  externalDraft?: {
    id: string;
    prompt: string;
  } | null;
  draftValue?: string;
  onDraftChange?: (value: string) => void;
  onInputFocus?: () => void;
};

export type ChatInputHandle = {
  clearAtQuery: () => void;
};

export type ChatInputTemplateSuggestion = ArchitecturePromptTemplateSuggestion;

type ChatInputTemplateCategory = {
  id: string;
  label: string;
  suggestions: ChatInputTemplateSuggestion[];
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

const SELECTED_REFERENCE_PLACEHOLDER =
  "\u57fa\u4e8e\u5df2\u9009\u53c2\u8003\u56fe\u7ee7\u7eed\u7ec6\u5316\uff0c\u63cf\u8ff0\u5e0c\u671b\u4fdd\u7559\u6216\u6539\u52a8\u7684\u5185\u5bb9";
const SELECTED_MULTI_REFERENCE_PLACEHOLDER =
  "\u57fa\u4e8e\u6240\u9009\u591a\u5f20\u53c2\u8003\u56fe\u7ee7\u7eed\u751f\u6210\uff0c\u8bf4\u660e\u60f3\u4fdd\u7559\u7684\u5171\u540c\u70b9\u3001\u5dee\u5f02\u70b9\u4e0e\u878d\u5408\u65b9\u5411";
const ATTACHED_REFERENCE_PLACEHOLDER =
  "\u5df2\u63a5\u5165\u5bf9\u8bdd\u53c2\u8003\u56fe\uff0c\u7ee7\u7eed\u63cf\u8ff0\u5e0c\u671b\u4fdd\u7559\u6216\u6539\u52a8\u7684\u5185\u5bb9";
const SELECTION_PLACEHOLDER =
  "\u5df2\u9009\u4e2d\u753b\u5e03\u5185\u5bb9\uff0c\u544a\u8bc9\u667a\u80fd\u4f53\u4e0b\u4e00\u6b65\u9700\u8981\u600e\u4e48\u5904\u7406";
const DEFAULT_PLACEHOLDER =
  "\u63cf\u8ff0\u5efa\u7b51\u6548\u679c\u56fe\u3001\u955c\u5934\u811a\u672c\u6216\u8bc4\u5ba1\u76ee\u6807\uff0c\u8f93\u5165 @ \u53ef\u5f15\u7528\u7d20\u6750";
const IMMERSIVE_DEFAULT_PLACEHOLDER =
  "\u6dfb\u52a0\u56fe\u7247\u8f93\u5165\u6587\u6848\u5f00\u59cb\u521b\u4f5c\u4e4b\u65c5...";
const HIDDEN_SCROLLBAR_STYLE = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
} as const;

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput(
    {
      onSend,
      attachedReferenceCount = 0,
      disabled,
      attachments,
      onAddFiles,
      onAttachSelectedCanvasImages,
      onMoveSelectedCanvasImage,
      onMoveAttachment,
      onRemoveSelectedCanvasImage,
      onRemoveAttachment,
      onRetryAttachment,
      isUploading,
      onAtQuery,
      mentions,
      onRemoveMention,
      selectedCanvasElements,
      templateSuggestions = [],
      immersiveArchitecture = false,
      architectureControlsPreset = "sidebar",
      externalDraft = null,
      draftValue,
      onDraftChange,
      onInputFocus,
    },
    ref,
  ) {
    const [internalValue, setInternalValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { preference, setPreference } = useImageModelPreference();
    const {
      preference: imageOutputPreference,
      setAspectRatio,
      setResolution,
    } = useImageOutputPreference();
    const { preference: videoPreference } = useVideoModelPreference();
    const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
    const modelBtnRef = useRef<HTMLButtonElement>(null);
    const [aspectRatioMenuOpen, setAspectRatioMenuOpen] = useState(false);
    const aspectRatioMenuRef = useRef<HTMLDivElement>(null);
    const aspectRatioBtnRef = useRef<HTMLButtonElement>(null);
    const [resolutionMenuOpen, setResolutionMenuOpen] = useState(false);
    const resolutionMenuRef = useRef<HTMLDivElement>(null);
    const resolutionBtnRef = useRef<HTMLButtonElement>(null);
    const [immersiveOutputMenuOpen, setImmersiveOutputMenuOpen] = useState(false);
    const immersiveOutputMenuRef = useRef<HTMLDivElement>(null);
    const immersiveOutputBtnRef = useRef<HTMLButtonElement>(null);
    const [immersiveOutputMenuPosition, setImmersiveOutputMenuPosition] =
      useState<{ left: number; top: number; width: number } | null>(null);
    const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
    const templateMenuRef = useRef<HTMLDivElement>(null);
    const templateBtnRef = useRef<HTMLButtonElement>(null);
    const [templateMenuPosition, setTemplateMenuPosition] = useState<{
      left: number;
      top: number;
      width: number;
      placement: "above" | "below";
    } | null>(null);
    const [activeTemplateCategoryId, setActiveTemplateCategoryId] = useState<
      string | null
    >(null);
    const lastExternalDraftIdRef = useRef<string | null>(null);
    const suppressNextInputFocusRef = useRef(false);
    const value = draftValue ?? internalValue;

    const updateValue = useCallback(
      (nextValue: string | ((prev: string) => string)) => {
        const resolvedValue =
          typeof nextValue === "function" ? nextValue(value) : nextValue;

        if (draftValue !== undefined) {
          onDraftChange?.(resolvedValue);
          return;
        }

        setInternalValue(resolvedValue);
      },
      [draftValue, onDraftChange, value],
    );

    useImperativeHandle(ref, () => ({
      clearAtQuery() {
        updateValue((prev) => {
          const lastAtIdx = prev.lastIndexOf("@");
          if (lastAtIdx === -1) return prev;
          return prev.slice(0, lastAtIdx);
        });
      },
    }), [updateValue]);

    const focusTextareaWithoutConfirmingSelection = useCallback(() => {
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea || document.activeElement === textarea) {
          return;
        }

        suppressNextInputFocusRef.current = true;
        textarea.focus();

        requestAnimationFrame(() => {
          if (
            suppressNextInputFocusRef.current &&
            document.activeElement !== textarea
          ) {
            suppressNextInputFocusRef.current = false;
          }
        });
      });
    }, []);

    const handleTextareaFocus = useCallback(() => {
      if (suppressNextInputFocusRef.current) {
        suppressNextInputFocusRef.current = false;
        return;
      }

      onInputFocus?.();
    }, [onInputFocus]);

    const handleSubmit = useCallback(() => {
      const trimmed = value.trim();
      if (
        (!trimmed && (!attachments || attachments.length === 0)) ||
        disabled ||
        isUploading
      ) {
        return;
      }

      onSend(trimmed);
      updateValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }, [attachments, disabled, isUploading, onSend, updateValue, value]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          handleSubmit();
        }
      },
      [handleSubmit],
    );

    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.style.height = "auto";
      const minHeight = immersiveArchitecture ? 56 : 72;
      const maxHeight = immersiveArchitecture ? 112 : 240;
      const nextHeight = Math.min(
        Math.max(textarea.scrollHeight || minHeight, minHeight),
        maxHeight,
      );
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY =
        textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    }, [immersiveArchitecture, value]);

    useEffect(() => {
      if (!externalDraft) {
        return;
      }

      if (lastExternalDraftIdRef.current === externalDraft.id) {
        return;
      }

      lastExternalDraftIdRef.current = externalDraft.id;
      updateValue(externalDraft.prompt);
      onAtQuery?.(null);
      focusTextareaWithoutConfirmingSelection();
    }, [
      externalDraft,
      focusTextareaWithoutConfirmingSelection,
      onAtQuery,
      updateValue,
    ]);

    useEffect(() => {
      if (
        !templateMenuOpen &&
        !aspectRatioMenuOpen &&
        !resolutionMenuOpen &&
        !immersiveOutputMenuOpen
      ) {
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
          resolutionBtnRef.current?.contains(target) ||
          immersiveOutputMenuRef.current?.contains(target) ||
          immersiveOutputBtnRef.current?.contains(target)
        ) {
          return;
        }

        setTemplateMenuOpen(false);
        setAspectRatioMenuOpen(false);
        setResolutionMenuOpen(false);
        setImmersiveOutputMenuOpen(false);
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setTemplateMenuOpen(false);
          setAspectRatioMenuOpen(false);
          setResolutionMenuOpen(false);
          setImmersiveOutputMenuOpen(false);
        }
      };

      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [
      aspectRatioMenuOpen,
      immersiveOutputMenuOpen,
      resolutionMenuOpen,
      templateMenuOpen,
    ]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        updateValue(newValue);

        if (!onAtQuery) return;

        const lastAtIdx = newValue.lastIndexOf("@");
        if (lastAtIdx === -1) {
          onAtQuery(null);
          return;
        }

        const charBefore = lastAtIdx > 0 ? newValue[lastAtIdx - 1] : " ";
        if (charBefore !== " " && charBefore !== "\n" && lastAtIdx !== 0) {
          onAtQuery(null);
          return;
        }

        const query = newValue.slice(lastAtIdx + 1);
        if (query.includes(" ") || query.includes("\n")) {
          onAtQuery(null);
          return;
        }

        onAtQuery(query);
      },
      [onAtQuery, updateValue],
    );

    const handleFileChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0 && onAddFiles) {
          onAddFiles(Array.from(files));
        }
        e.target.value = "";
      },
      [onAddFiles],
    );

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        if (!onAddFiles) return;

        const files = Array.from(e.dataTransfer.files).filter((file) =>
          file.type.startsWith("image/"),
        );
        if (files.length > 0) {
          onAddFiles(files);
        }
      },
      [onAddFiles],
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
    }, []);

    const handlePaste = useCallback(
      (e: React.ClipboardEvent) => {
        if (!onAddFiles) return;

        const files = Array.from(e.clipboardData.items)
          .filter((item) => item.type.startsWith("image/"))
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null);

        if (files.length > 0) {
          e.preventDefault();
          onAddFiles(files);
        }
      },
      [onAddFiles],
    );

    const hasContent =
      value.trim().length > 0 || Boolean(attachments && attachments.length > 0);

    const selectionSummary = useMemo(() => {
      const imageCount =
        selectedCanvasElements?.filter((element) => element.type === "image")
          .length ?? 0;
      const totalCount = selectedCanvasElements?.length ?? 0;

      return {
        selectionImageCount: imageCount,
        selectionShapeCount: totalCount - imageCount,
        hasSelection: totalCount > 0,
      };
    }, [selectedCanvasElements]);

    const { selectionImageCount, selectionShapeCount, hasSelection } =
      selectionSummary;

    const selectedImageElements = useMemo(
      () =>
        selectedCanvasElements?.filter((element) => {
          if (
            element.type !== "image" ||
            !Boolean(element.storageUrl || element.dataUrl)
          ) {
            return false;
          }

          const elementUrl = element.storageUrl ?? element.dataUrl ?? "";
          return !(attachments ?? []).some((attachment) => {
            if (attachment.source !== "canvas-ref") {
              return false;
            }

            const attachmentUrl = attachment.url ?? attachment.preview ?? "";
            if (attachment.assetId) {
              return attachment.assetId === element.id;
            }

            return elementUrl.length > 0 && attachmentUrl === elementUrl;
          });
        }) ?? [],
      [attachments, selectedCanvasElements],
    );

    const placeholder = useMemo(() => {
      if (immersiveArchitecture) {
        if (attachedReferenceCount > 0) {
          return ATTACHED_REFERENCE_PLACEHOLDER;
        }
        return IMMERSIVE_DEFAULT_PLACEHOLDER;
      }
      if (selectedImageElements.length > 1) {
        return SELECTED_MULTI_REFERENCE_PLACEHOLDER;
      }
      if (selectedImageElements.length > 0) {
        return SELECTED_REFERENCE_PLACEHOLDER;
      }
      if (attachedReferenceCount > 0) {
        return ATTACHED_REFERENCE_PLACEHOLDER;
      }
      if (hasSelection) {
        return SELECTION_PLACEHOLDER;
      }
      return DEFAULT_PLACEHOLDER;
    }, [
      attachedReferenceCount,
      hasSelection,
      immersiveArchitecture,
      selectedImageElements.length,
    ]);

    const showSelectionReferenceBlock =
      !immersiveArchitecture && selectedImageElements.length > 0;
    const showImmersiveSelectionChips =
      immersiveArchitecture && selectedImageElements.length > 0;
    const showSelectionSummaryBlock =
      !immersiveArchitecture && !showSelectionReferenceBlock && hasSelection;
    const templateCategories = useMemo<ChatInputTemplateCategory[]>(() => {
      const categories = new Map<string, ChatInputTemplateCategory>();

      templateSuggestions.forEach((template) => {
        const categoryId = template.categoryId ?? "default";
        const categoryLabel = template.categoryLabel ?? "快捷模版";
        const currentCategory = categories.get(categoryId);

        if (currentCategory) {
          currentCategory.suggestions.push(template);
          return;
        }

        categories.set(categoryId, {
          id: categoryId,
          label: categoryLabel,
          suggestions: [template],
        });
      });

      return Array.from(categories.values());
    }, [templateSuggestions]);
    const activeTemplateCategory =
      templateCategories.find(
        (category) => category.id === activeTemplateCategoryId,
      ) ??
      templateCategories[0] ??
      null;
    const showTemplateSuggestions =
      !immersiveArchitecture && templateCategories.length > 0;
    useEffect(() => {
      if (templateCategories.length === 0) {
        if (activeTemplateCategoryId !== null) {
          setActiveTemplateCategoryId(null);
        }
        return;
      }

      if (
        activeTemplateCategoryId &&
        templateCategories.some(
          (category) => category.id === activeTemplateCategoryId,
        )
      ) {
        return;
      }

      setActiveTemplateCategoryId(templateCategories[0]?.id ?? null);
    }, [activeTemplateCategoryId, templateCategories]);

    const renderSelectedCanvasChip = useCallback(
      (element: CanvasSelectedElement, index: number, total: number) => {
        const orderLabel = `参考图 ${index + 1}`;
        const canMoveLeft = Boolean(onMoveSelectedCanvasImage && index > 0);
        const canMoveRight = Boolean(
          onMoveSelectedCanvasImage && index < total - 1,
        );
        const arrowButtonClass =
          "absolute bottom-1 inline-flex h-5 w-5 items-center justify-center rounded-[6px] bg-black/72 text-white transition-colors hover:bg-black/86 disabled:cursor-not-allowed disabled:bg-black/35 disabled:text-white/65";

        return (
            <div
              key={element.id}
              data-testid="chat-input-selected-canvas-chip"
              className="relative h-[68px] w-[68px] shrink-0 overflow-visible"
            >
              <div className="relative h-[60px] w-[60px] overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50">
                {element.storageUrl || element.dataUrl ? (
                  <img
                  src={resolveBrowserAssetUrl(
                    element.storageUrl ?? element.dataUrl,
                  )}
                  alt={orderLabel}
                  className="h-full w-full object-cover"
                />
              ) : null}
              {onRemoveSelectedCanvasImage ? (
                  <button
                    type="button"
                    aria-label={`移除待选${orderLabel}`}
                    onClick={() => onRemoveSelectedCanvasImage(element.id)}
                    className="absolute -right-1 -top-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/72 text-white transition-colors hover:bg-black/86"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              <button
                type="button"
                aria-label={`将${orderLabel} 向前移动`}
                disabled={!canMoveLeft}
                onClick={() =>
                  canMoveLeft
                    ? onMoveSelectedCanvasImage?.(element.id, "left")
                    : undefined
                }
                className={`${arrowButtonClass} left-1`}
              >
                <ArrowLeft className="h-2.5 w-2.5" />
              </button>
              <button
                type="button"
                aria-label={`将${orderLabel} 向后移动`}
                disabled={!canMoveRight}
                onClick={() =>
                  canMoveRight
                    ? onMoveSelectedCanvasImage?.(element.id, "right")
                    : undefined
                }
                className={`${arrowButtonClass} right-1`}
              >
                <ArrowRight className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        );
      },
      [onMoveSelectedCanvasImage, onRemoveSelectedCanvasImage],
    );

    const handleApplyTemplate = useCallback(
      (template: ChatInputTemplateSuggestion) => {
        setPreference(
          buildTemplateRecommendedImagePreference(
            template.recommendedImageModelId,
          ),
        );
        updateValue(template.prompt);
        setTemplateMenuOpen(false);
        onAtQuery?.(null);
        focusTextareaWithoutConfirmingSelection();
      },
      [
        focusTextareaWithoutConfirmingSelection,
        onAtQuery,
        setPreference,
        updateValue,
      ],
    );

    const handleSelectAspectRatio = useCallback(
      (nextAspectRatio: (typeof IMAGE_ASPECT_RATIO_OPTIONS)[number]) => {
        setAspectRatio(nextAspectRatio);
        setAspectRatioMenuOpen(false);
        setImmersiveOutputMenuOpen(false);
      },
      [setAspectRatio],
    );

    const handleSelectResolution = useCallback(
      (nextResolution: (typeof IMAGE_RESOLUTION_OPTIONS)[number]) => {
        setResolution(nextResolution);
        setResolutionMenuOpen(false);
        setImmersiveOutputMenuOpen(false);
      },
      [setResolution],
    );

    const architectureAspectRatioLabel =
      imageOutputPreference.aspectRatio === "auto"
        ? "自动"
        : imageOutputPreference.aspectRatio;
    const architectureResolutionLabel = imageOutputPreference.resolution;
    const immersiveOutputLabel = `${architectureAspectRatioLabel} / ${architectureResolutionLabel}`;
    const uploadButtonLabel = immersiveArchitecture ? "添加图片" : "上传图片";

    const nonImmersiveContainerClass =
      "flex min-h-[120px] flex-col justify-between gap-2 rounded-[10px] border-[0.5px] border-border bg-card p-2 transition-[border] focus-within:border-border";
    const showImmersiveEmbeddedMedia = immersiveArchitecture;
    const hasImmersiveMetaItems =
      showImmersiveSelectionChips ||
      Boolean(attachments && attachments.length > 0) ||
      Boolean(mentions && mentions.length > 0);

    const updateImmersiveOutputMenuPosition = useCallback(() => {
      const button = immersiveOutputBtnRef.current;
      if (!button) {
        return;
      }

      const rect = button.getBoundingClientRect();
      const menuWidth = 320;
      const left = Math.min(
        Math.max(rect.left - 140, 16),
        Math.max(window.innerWidth - menuWidth - 16, 16),
      );
      const preferredTop = rect.top - 264;
      const fallbackTop = Math.min(rect.bottom + 12, window.innerHeight - 220);
      setImmersiveOutputMenuPosition({
        left,
        top: preferredTop >= 16 ? preferredTop : Math.max(fallbackTop, 16),
        width: menuWidth,
      });
    }, []);

    const updateTemplateMenuPosition = useCallback(() => {
      const button = templateBtnRef.current;
      const menu = templateMenuRef.current;
      if (!button || !menu) {
        return;
      }

      const rect = button.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const menuWidth = Math.min(620, window.innerWidth - 32);
      const gap = 12;
      const left = Math.min(
        Math.max(rect.left - 48, 16),
        Math.max(window.innerWidth - menuWidth - 16, 16),
      );
      const fitsAbove = rect.top - gap - menuRect.height >= 16;
      const placement = fitsAbove ? "above" : "below";
      const top =
        placement === "above"
          ? rect.top - gap
          : Math.min(
              rect.bottom + gap,
              Math.max(window.innerHeight - menuRect.height - 16, 16),
            );

      setTemplateMenuPosition({
        left,
        top,
        width: menuWidth,
        placement,
      });
    }, []);

    useEffect(() => {
      if (!immersiveOutputMenuOpen) {
        return;
      }

      updateImmersiveOutputMenuPosition();
      const handleWindowChange = () => updateImmersiveOutputMenuPosition();
      window.addEventListener("resize", handleWindowChange);
      window.addEventListener("scroll", handleWindowChange, true);
      return () => {
        window.removeEventListener("resize", handleWindowChange);
        window.removeEventListener("scroll", handleWindowChange, true);
      };
    }, [immersiveOutputMenuOpen, updateImmersiveOutputMenuPosition]);

    useEffect(() => {
      if (!templateMenuOpen || !immersiveArchitecture) {
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
    }, [
      immersiveArchitecture,
      templateMenuOpen,
      updateTemplateMenuPosition,
    ]);

    if (immersiveArchitecture) {
      return (
        <div className="px-2 pb-2">
          <div
            data-testid="chat-input-immersive-shell"
            data-layout="fixed"
            className="flex max-h-[272px] flex-col rounded-[10px] border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-[border] focus-within:border-slate-300"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div
              data-testid="chat-input-immersive-composer-body"
              className="flex min-h-0 flex-1 flex-col"
            >
            {showImmersiveEmbeddedMedia ? (
              <div
                data-testid="chat-input-immersive-inline-rail"
                className={`flex items-start gap-2 overflow-x-auto overflow-y-hidden pb-0.5 pr-1 [&::-webkit-scrollbar]:hidden ${
                  hasImmersiveMetaItems ? "min-h-[68px]" : "min-h-[60px]"
                }`}
                style={HIDDEN_SCROLLBAR_STYLE}
              >
                {showImmersiveSelectionChips
                  ? selectedImageElements.map((element, index) =>
                      renderSelectedCanvasChip(
                        element,
                        index,
                        selectedImageElements.length,
                      ),
                    )
                  : null}

                {attachments && onRemoveAttachment ? (
                  <div className="shrink-0">
                    <ImageAttachmentBar
                      attachments={attachments}
                      onRemove={onRemoveAttachment}
                      variant="composer-inline"
                      {...(onMoveAttachment ? { onMove: onMoveAttachment } : {})}
                      {...(onRetryAttachment ? { onRetry: onRetryAttachment } : {})}
                    />
                  </div>
                ) : null}

                {mentions && mentions.length > 0 && onRemoveMention ? (
                  <div className="flex shrink-0 items-center gap-1 px-1 py-1">
                    {mentions.map((mention) => (
                      <button
                        key={`${mention.mentionType}:${mention.id}`}
                        type="button"
                        onClick={() => onRemoveMention(mention)}
                        className="inline-flex items-center gap-1 rounded-[8px] border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 transition-colors hover:bg-slate-100"
                        title="移除引用"
                      >
                        <span className="text-slate-400">@</span>
                        <span className="max-w-[120px] truncate">{mention.label}</span>
                        <svg
                          className="h-3 w-3 text-slate-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    ))}
                  </div>
                ) : null}
                {onAddFiles ? (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={uploadButtonLabel}
                  className="inline-flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  title={uploadButtonLabel}
                  disabled={!onAddFiles}
                >
                  <svg
                    className="h-[18px] w-[18px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 12h8M12 8v8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <rect
                      x="4.75"
                      y="4.75"
                      width="14.5"
                      height="14.5"
                      rx="3.25"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </button>
              </div>
            ) : null}

            <div className="relative mt-1.5 flex min-h-0 flex-col px-0 pb-0 pt-0">
              <div
                data-testid="chat-input-immersive-input-row"
                className="flex min-h-0 items-start gap-3"
              >
                <textarea
                  ref={textareaRef}
                  data-chat-input
                  value={value}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onFocus={handleTextareaFocus}
                  onPaste={handlePaste}
                  placeholder={placeholder}
                  aria-label={"输入消息"}
                  rows={1}
                  style={HIDDEN_SCROLLBAR_STYLE}
                  className="min-h-[56px] max-h-[112px] flex-1 resize-none bg-transparent px-1 py-1 text-[15px] leading-7 text-foreground placeholder:text-muted-foreground focus:outline-none [&::-webkit-scrollbar]:hidden"
                />

                <button
                  onClick={handleSubmit}
                  disabled={disabled || !hasContent || isUploading}
                  aria-label="发送消息"
                  className="flex h-10 min-w-10 shrink-0 items-center justify-center self-end rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/80 active:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-20"
                >
                  <svg
                    className="h-[14px] w-[14px]"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                  >
                    <path d="M7 11.5V2.5" />
                    <path d="M3 6.5L7 2.5L11 6.5" />
                  </svg>
                </button>
              </div>

              <div
                data-testid="chat-input-immersive-control-row"
                className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2"
              >
                <ArchitectureChatControls
                  preset={architectureControlsPreset}
                  onApplyTemplate={handleApplyTemplate}
                  outputMenuTestId="chat-input-immersive-output-menu"
                  templateMenuTestId="chat-input-template-menu"
                />
              </div>
            </div>
          </div>
        </div>
        </div>
      );
    }

    return (
      <div className="px-2 pb-2">
        <div
          className={nonImmersiveContainerClass}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {showSelectionReferenceBlock ? (
            <div className="rounded-[10px] border border-border/70 bg-muted/40 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {selectedImageElements.length > 1
                      ? "\u5df2\u5173\u8054\u53c2\u8003\u56fe\u7ec4"
                      : "\u5df2\u5173\u8054\u53c2\u8003\u56fe"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedImageElements.length > 1
                      ? "\u53d1\u9001\u540e\u4f1a\u628a\u8fd9\u7ec4\u56fe\u7247\u4f5c\u4e3a\u540c\u4e00\u4e2a\u53c2\u8003\u7ec4\u4f20\u7ed9\u667a\u80fd\u4f53\uff0c\u7528\u4e8e\u63d0\u70bc\u5171\u6027\u3001\u5dee\u5f02\u4e0e\u878d\u5408\u65b9\u5411\u3002"
                      : "\u53d1\u9001\u540e\u4f1a\u81ea\u52a8\u4ee5\u8fd9\u4e9b\u753b\u5e03\u56fe\u7247\u4f5c\u4e3a\u5f53\u524d\u8f6e\u6b21\u7684\u53c2\u8003\u4e0a\u4e0b\u6587\u3002"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onAttachSelectedCanvasImages ? (
                    <button
                      type="button"
                      onClick={onAttachSelectedCanvasImages}
                      className="inline-flex min-h-8 items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      {selectedImageElements.length > 1
                        ? "\u6574\u7ec4\u53d1\u9001\u81f3\u5bf9\u8bdd"
                        : "\u53d1\u9001\u81f3\u5bf9\u8bdd"}
                    </button>
                  ) : null}
                  <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-foreground">
                    {selectedImageElements.length}
                    {" \u5f20"}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {selectedImageElements.map((element, index) =>
                  renderSelectedCanvasChip(
                    element,
                    index,
                    selectedImageElements.length,
                  ),
                )}
              </div>
            </div>
          ) : showImmersiveSelectionChips ? (
            <div className="flex items-start gap-2 overflow-x-auto pb-1">
              {selectedImageElements.map((element, index) =>
                renderSelectedCanvasChip(
                  element,
                  index,
                  selectedImageElements.length,
                ),
              )}
            </div>
          ) : showSelectionSummaryBlock ? (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
              <div className="flex min-w-0 items-center gap-1.5">
                {selectionImageCount > 0 ? (
                  <span className="flex items-center gap-1">
                    <svg
                      className="h-3 w-3 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                    {"\u5df2\u9009\u4e2d "}
                    {selectionImageCount}
                    {" \u5f20\u56fe\u7247"}
                  </span>
                ) : null}
                {selectionImageCount > 0 && selectionShapeCount > 0 ? (
                  <span className="text-muted-foreground/40">&middot;</span>
                ) : null}
                {selectionShapeCount > 0 ? (
                  <span className="flex items-center gap-1">
                    <svg
                      className="h-3 w-3 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                    {"\u53e6\u6709 "}
                    {selectionShapeCount}
                    {" \u4e2a\u753b\u5e03\u5bf9\u8c61"}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {showTemplateSuggestions ? (
            <div className="rounded-[10px] border border-border/70 bg-background/70 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {"\u5feb\u6377\u6a21\u7248"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {
                      "\u70b9\u51fb\u540e\u4f1a\u628a\u5efa\u7b51\u573a\u666f\u6a21\u7248\u76f4\u63a5\u5199\u5165\u8f93\u5165\u6846\uff0c\u4fbf\u4e8e\u7ee7\u7eed\u5fae\u8c03\u3002"
                    }
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                {templateCategories.map((category) => (
                  <div key={category.id}>
                    {templateCategories.length > 1 ? (
                      <div className="mb-2 px-1 text-[11px] font-medium text-muted-foreground">
                        {category.label}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {category.suggestions.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleApplyTemplate(template)}
                          className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
                        >
                          {template.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {attachments && onRemoveAttachment ? (
            <ImageAttachmentBar
              attachments={attachments}
              onRemove={onRemoveAttachment}
              {...(onRetryAttachment ? { onRetry: onRetryAttachment } : {})}
            />
          ) : null}

          {mentions && mentions.length > 0 && onRemoveMention ? (
            <div className="flex flex-wrap items-center gap-1 px-2 py-1">
              {mentions.map((mention) => (
                <button
                  key={`${mention.mentionType}:${mention.id}`}
                  type="button"
                  onClick={() => onRemoveMention(mention)}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-foreground transition-colors hover:bg-muted/80"
                  title="\u79fb\u9664\u5f15\u7528"
                >
                  <span className="text-muted-foreground">@</span>
                  <span className="max-w-[180px] truncate">
                    {mention.label}
                  </span>
                  <svg
                    className="h-3 w-3 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              ))}
            </div>
          ) : null}

          <textarea
            ref={textareaRef}
            data-chat-input
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleTextareaFocus}
            onPaste={handlePaste}
            placeholder={placeholder}
            aria-label={"\u8f93\u5165\u6d88\u606f"}
            rows={1}
            style={{ scrollbarWidth: "none" }}
            className="min-h-[48px] max-h-60 resize-none bg-transparent px-1 text-sm leading-[1.8] text-foreground placeholder:text-muted-foreground focus:outline-none [&::-webkit-scrollbar]:hidden"
          />

          {immersiveArchitecture && aspectRatioMenuOpen ? (
            <div
              ref={aspectRatioMenuRef}
              className="rounded-[10px] border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.1)]"
            >
              <div className="mb-2 px-2 text-[11px] font-medium text-muted-foreground">
                画幅比例
              </div>
              <div className="flex flex-wrap gap-2">
                {IMAGE_ASPECT_RATIO_OPTIONS.map((option) => {
                  const selected = imageOutputPreference.aspectRatio === option;
                  const label = option === "auto" ? "自动" : option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelectAspectRatio(option)}
                      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        selected
                          ? "border-slate-300 bg-slate-100 text-foreground"
                          : "border-slate-200 bg-white text-foreground hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {immersiveArchitecture && resolutionMenuOpen ? (
            <div
              ref={resolutionMenuRef}
              className="rounded-[10px] border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.1)]"
            >
              <div className="mb-2 px-2 text-[11px] font-medium text-muted-foreground">
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
                          ? "border-slate-300 bg-slate-100 text-foreground"
                          : "border-slate-200 bg-white text-foreground hover:bg-slate-50"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 px-2 text-[11px] text-muted-foreground">
                高分辨率实际生成受账号权限影响
              </p>
            </div>
          ) : null}

          {immersiveArchitecture && templateMenuOpen && templateCategories.length > 0 ? (
            <div
              ref={templateMenuRef}
              className="rounded-[10px] border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.1)]"
            >
              <div className="mb-2 px-2 text-[11px] font-medium text-muted-foreground">
                快捷模版
              </div>
              {templateCategories.length > 1 ? (
                <div className="mb-3 flex flex-wrap gap-2 px-1">
                  {templateCategories.map((category) => {
                    const selected = activeTemplateCategory?.id === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setActiveTemplateCategoryId(category.id)}
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selected
                            ? "border-slate-300 bg-slate-100 text-foreground"
                            : "border-slate-200 bg-white text-foreground hover:bg-slate-50"
                        }`}
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {activeTemplateCategory?.suggestions.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleApplyTemplate(template)}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-50"
                  >
                    {template.label}
                  </button>
                )) ?? null}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {onAddFiles ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={uploadButtonLabel}
                  className={`flex h-8 w-8 items-center justify-center transition-colors ${
                    immersiveArchitecture
                      ? "rounded-[10px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      : "rounded-full border-[0.5px] border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  title={uploadButtonLabel}
                  >
                    {immersiveArchitecture ? (
                      <svg
                        className="h-[16px] w-[16px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M8 12h8M12 8v8"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <rect
                          x="4.75"
                          y="4.75"
                          width="14.5"
                          height="14.5"
                          rx="3.25"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-[14px] w-[14px]"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M16 1.1A4.9 4.9 0 0 1 20.9 6a4.9 4.9 0 0 1-1.429 3.457h.001l-8.414 8.587-.007.006a2.9 2.9 0 0 1-3.887.193l-.213-.192a2.9 2.9 0 0 1-.007-4.095l8.414-8.586a.9.9 0 0 1 1.286 1.26L8.23 15.216l-.007.006a1.1 1.1 0 0 0 1.556 1.555l8.407-8.579.007-.007a3.1 3.1 0 0 0 .105-4.271l-.105-.112a3.1 3.1 0 0 0-4.384 0L5.4 12.387l-.007.006a5.1 5.1 0 0 0 7.214 7.213l7.749-7.934a.9.9 0 0 1 1.288 1.256l-7.753 7.938q-.005.007-.012.014a6.9 6.9 0 0 1-9.758-9.76l8.408-8.578.007-.007A4.9 4.9 0 0 1 16 1.1" />
                      </svg>
                    )}
                  </button>
                </>
              ) : null}

              <AgentModelSelector
                compact
                {...(immersiveArchitecture
                  ? { fallbackLabel: "Banana Pro", source: "image" as const }
                  : {})}
              />

              {immersiveArchitecture ? (
                <>
                  <button
                    ref={aspectRatioBtnRef}
                    type="button"
                    onClick={() => {
                      setAspectRatioMenuOpen((prev) => !prev);
                      setResolutionMenuOpen(false);
                      setTemplateMenuOpen(false);
                    }}
                    title={architectureAspectRatioLabel}
                    aria-label={architectureAspectRatioLabel}
                    className={`flex h-8 items-center justify-center rounded-[10px] border px-2.5 text-[11px] font-medium transition-colors ${
                      aspectRatioMenuOpen
                        ? "border-slate-300 bg-slate-100 text-foreground"
                        : "border-slate-200 bg-white text-foreground hover:bg-slate-50"
                    }`}
                  >
                    <span>{architectureAspectRatioLabel}</span>
                  </button>

                  <button
                    ref={resolutionBtnRef}
                    type="button"
                    aria-label={architectureResolutionLabel}
                    title={architectureResolutionLabel}
                    onClick={() => {
                      setResolutionMenuOpen((prev) => !prev);
                      setAspectRatioMenuOpen(false);
                      setTemplateMenuOpen(false);
                    }}
                    className={`flex h-8 items-center justify-center rounded-[10px] border px-2.5 text-[11px] font-medium transition-colors ${
                      resolutionMenuOpen
                        ? "border-slate-300 bg-slate-100 text-foreground"
                        : "border-slate-200 bg-white text-foreground hover:bg-slate-50"
                    }`}
                  >
                    <span>{architectureResolutionLabel}</span>
                  </button>
                </>
              ) : (
                <div className="relative">
                  <button
                    ref={modelBtnRef}
                    type="button"
                    onClick={() => setModelPopoverOpen((prev) => !prev)}
                    title="\u6a21\u578b\u504f\u597d"
                    aria-label="\u6a21\u578b\u504f\u597d"
                    className={`flex items-center justify-center rounded-full border-[0.5px] transition-colors ${
                      preference.mode === "manual" ||
                      videoPreference.mode === "manual"
                        ? "border-slate-300 bg-slate-100 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    } h-8 w-8`}
                  >
                    <svg
                      className="h-[14px] w-[14px]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M10.8 1.307a2.33 2.33 0 0 1 2.4 0l7.67 4.602A2.33 2.33 0 0 1 22 7.907v8.361a2.33 2.33 0 0 1-1.13 1.998l-7.67 4.602-.141.078a2.33 2.33 0 0 1-2.258-.078l-7.67-4.602A2.33 2.33 0 0 1 2 16.268V7.907a2.33 2.33 0 0 1 1.003-1.915l.128-.083z" />
                    </svg>
                  </button>
                  <ImageModelPreferencePopover
                    open={modelPopoverOpen}
                    onClose={() => setModelPopoverOpen(false)}
                    anchorRef={modelBtnRef}
                  />
                </div>
              )}

              {immersiveArchitecture && templateCategories.length > 0 ? (
                <button
                  ref={templateBtnRef}
                  type="button"
                  aria-label="模版"
                  onClick={() => {
                    setTemplateMenuOpen((prev) => !prev);
                    setAspectRatioMenuOpen(false);
                    setResolutionMenuOpen(false);
                  }}
                  className={`flex h-8 items-center gap-1.5 rounded-[10px] border border-slate-200 px-2.5 text-[11px] font-medium transition-colors ${
                    templateMenuOpen
                      ? "border-slate-300 bg-slate-100 text-foreground"
                      : "bg-white text-foreground hover:bg-slate-50"
                  }`}
                >
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  <span>模版</span>
                </button>
              ) : null}
            </div>

            <button
              onClick={handleSubmit}
              disabled={disabled || !hasContent || isUploading}
              className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/80 active:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-20"
            >
              <svg
                className="h-[14px] w-[14px]"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
              >
                <path d="M7 11.5V2.5" />
                <path d="M3 6.5L7 2.5L11 6.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  },
);
