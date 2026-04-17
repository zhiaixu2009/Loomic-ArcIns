"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useBreakpoint } from "../hooks/use-breakpoint";
import type {
  AgentPlanBlock,
  ContentBlock,
  ImageArtifact,
  ImageGenerationPreference,
  ImageOutputPreference,
  MessageMention,
  RunCreateRequest,
  StreamEvent,
  WsCommandAck,
  VideoArtifact,
  VideoGenerationPreference,
} from "@loomic/shared";
import { useAgentModel } from "../hooks/use-agent-model";
import type { Message as SessionMessage } from "../hooks/use-chat-sessions";
import { useChatSessions } from "../hooks/use-chat-sessions";
import { useChatStream } from "../hooks/use-chat-stream";
import {
  INITIAL_AGENT_MODEL_KEY,
  INITIAL_ATTACHMENTS_KEY,
  INITIAL_IMAGE_GENERATION_PREFERENCE_KEY,
} from "../hooks/use-create-project";
import type { ReadyAttachment } from "../hooks/use-image-attachments";
import { useImageAttachments } from "../hooks/use-image-attachments";
import { useImageModelPreference } from "../hooks/use-image-model-preference";
import { useImageOutputPreference } from "../hooks/use-image-output-preference";
import { useVideoModelPreference } from "../hooks/use-video-model-preference";
import type { WebSocketHandle } from "../hooks/use-websocket";
import { fetchBrandKit } from "../lib/brand-kit-api";
import { claimDailyCredits } from "../lib/credits-api";
import { fetchImageModels, fetchWorkspaceSkills, saveMessage } from "../lib/server-api";
import type { ArchitectureBoardKind, ArchitectureContext } from "../lib/architecture-canvas";
import type { CanvasComposerCommand } from "../lib/canvas-context-actions";
import type { CanvasSelectedElement } from "./canvas-editor";
import {
  type BrandKitMentionItem,
  type CanvasImageItem,
  type ImageModelMentionItem,
  type SkillMentionItem,
  MessageMentionPicker,
  type MessageMentionPickerItem,
} from "./canvas-image-picker";
import { AgentPlanPanel } from "./agent-plan-panel";
import { ChatInput, type ChatInputTemplateSuggestion } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { ChatSkills } from "./chat-skills";
import { CanvasFilesPanel } from "./canvas-files-panel";
import { CreditInsufficientDialog } from "./credits/credit-insufficient-dialog";
import { useTierLimitToast } from "./credits/tier-limit-toast";
import { useToast } from "./toast";
import { ErrorBoundary } from "./error-boundary";
import { SessionSelector } from "./session-selector";

type ChatSidebarProps = {
  accessToken: string;
  architectureContext?: ArchitectureContext | null;
  canvasId: string;
  collapsedLabel?: string;
  headerSlot?: ReactNode;
  immersive?: boolean;
  panelTitle?: string;
  open: boolean;
  onToggle: () => void;
  onImageGenerated?: (artifact: ImageArtifact) => void;
  onVideoGenerated?: (artifact: VideoArtifact) => void;
  onCanvasSync?: () => void;
  /** Called for every stream event, used by job fallback polling to detect timed-out jobs. */
  onStreamEvent?: (event: StreamEvent) => void;
  initialPrompt?: string | undefined;
  initialSessionId?: string | undefined;
  onSessionChange?: (sessionId: string) => void;
  onRequestCanvasImages?: () => CanvasImageItem[];
  currentBrandKitId?: string | null;
  ws: WebSocketHandle;
  selectedCanvasElements?: CanvasSelectedElement[];
  generatedFilesApi?: any;
  composerCommand?: CanvasComposerCommand | null;
  onComposerCommandHandled?: (commandId: string) => void;
};

type ImmersiveRecordStatus = "pending" | "completed";

type ImmersiveRecordItem = {
  id: string;
  prompt: string;
  references: ReadyAttachment[];
  createdAtLabel: string;
  status: ImmersiveRecordStatus;
  generatedFileCount: number;
  startingGeneratedFileCount: number;
  modelLabel: string;
};

function ImmersiveHeaderActionButton({
  label,
  onClick,
  onMouseEnter,
  onFocus,
  children,
}: {
  label: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </button>
  );
}

function AddDialogIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.75 6.75A2.75 2.75 0 0 1 7.5 4h6.75A2.75 2.75 0 0 1 17 6.75v4.5A2.75 2.75 0 0 1 14.25 14H7.5a2.75 2.75 0 0 1-2.75-2.75z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M18 10.5h1.25A2.75 2.75 0 0 1 22 13.25V18a2 2 0 0 1-2 2h-5.25A2.75 2.75 0 0 1 12 17.25V16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11 7.5v3m-1.5-1.5h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12a8 8 0 1 0 2.34-5.66L4.5 8.18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 4.75v3.5h3.5M12 8.5v4l2.75 1.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileListIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 5.25h9A2.25 2.25 0 0 1 18.75 7.5v9A2.25 2.25 0 0 1 16.5 18.75h-9A2.25 2.25 0 0 1 5.25 16.5v-9A2.25 2.25 0 0 1 7.5 5.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8.5 9h7m-7 3h7m-7 3h4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShrinkIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 3.25a.75.75 0 0 1 .75.75v16a.75.75 0 0 1-1.5 0V4A.75.75 0 0 1 4 3.25m9.47 2.22a.75.75 0 0 1 1.06 0l6 6a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 1 1-1.06-1.06l4.72-4.72H8a.75.75 0 0 1 0-1.5h10.19l-4.72-4.72a.75.75 0 0 1 0-1.06"
        fill="currentColor"
      />
    </svg>
  );
}

function ImmersiveWelcomeState() {
  return (
    <div className="flex min-h-[220px] items-center justify-center px-6 py-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[10px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <svg className="h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M7 6.75A1.75 1.75 0 0 1 8.75 5h6.5A1.75 1.75 0 0 1 17 6.75v6.5A1.75 1.75 0 0 1 15.25 15h-2.13a1 1 0 0 0-.7.29l-1.72 1.72a1 1 0 0 1-1.42 0l-1.72-1.72a1 1 0 0 0-.7-.29H8.75A1.75 1.75 0 0 1 7 13.25z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M9.25 9.5h5.5M9.25 12h3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-[13px] leading-6 text-slate-500">
          在下方输入你的创意来生成图片吧
        </p>
      </div>
    </div>
  );
}

function formatImmersiveRecordTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function extractTextFromMessage(message: SessionMessage) {
  return message.contentBlocks
    .filter((block): block is Extract<ContentBlock, { type: "text" }> => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

function findLatestAgentPlanBlock(messages: SessionMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== "assistant") continue;

    const block = message.contentBlocks.find(
      (contentBlock): contentBlock is AgentPlanBlock =>
        contentBlock.type === "agent-plan",
    );

    if (block) {
      return block;
    }
  }

  return null;
}

function messageHasTranscriptContent(message: SessionMessage) {
  return message.contentBlocks.some((block) => block.type !== "agent-plan");
}

function countGeneratedCanvasImages(excalidrawApi: any) {
  if (!excalidrawApi || typeof excalidrawApi.getSceneElements !== "function") {
    return 0;
  }

  const sceneElements = excalidrawApi.getSceneElements() ?? [];
  return sceneElements.filter(
    (element: any) =>
      !element?.isDeleted &&
      element?.type === "image" &&
      element?.customData?.source === "generated",
  ).length;
}

function buildSelectedCanvasImageAttachments(
  selectedCanvasElements?: CanvasSelectedElement[],
): ReadyAttachment[] {
  const seenKeys = new Set<string>();
  const refs: ReadyAttachment[] = [];

  (selectedCanvasElements ?? []).forEach((element) => {
    if (
      element.type !== "image" ||
      !Boolean(element.storageUrl || element.dataUrl)
    ) {
      return;
    }

    const url = element.storageUrl ?? element.dataUrl;
    if (!url) {
      return;
    }

    const key = `${element.id}::${url}`;
    if (seenKeys.has(key)) {
      return;
    }
    seenKeys.add(key);

    refs.push({
      assetId: element.id,
      url,
      mimeType: "image/png",
      source: "canvas-ref",
      name: `画布参考图 ${refs.length + 1}`,
    });
  });

  return refs;
}

const RENDER_TEMPLATE_CATEGORY = {
  id: "render",
  label: "效果渲染",
} as const;

const SITE_COLOR_TEMPLATE_CATEGORY = {
  id: "site-color",
  label: "总平填色",
} as const;

function templateCategoryByBoard(boardKind: ArchitectureBoardKind) {
  return boardKind === "site_analysis"
    ? SITE_COLOR_TEMPLATE_CATEGORY
    : RENDER_TEMPLATE_CATEGORY;
}

function withTemplateCategory(
  category: { id: string; label: string },
  suggestions: ChatInputTemplateSuggestion[],
): ChatInputTemplateSuggestion[] {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    categoryId: category.id,
    categoryLabel: category.label,
  }));
}

function isCanvasImageSelection(
  element: CanvasSelectedElement,
): element is CanvasSelectedElement & {
  type: "image";
} {
  return (
    element.type === "image" &&
    Boolean(element.storageUrl || element.dataUrl)
  );
}

function buildOrderedCanvasSelection(
  selectedCanvasElements: CanvasSelectedElement[] | undefined,
  imageOrder: string[],
  dismissedImageIds: string[],
) {
  if (!selectedCanvasElements || selectedCanvasElements.length === 0) {
    return {
      orderedSelectedCanvasElements: selectedCanvasElements,
      orderedSelectedCanvasImages: [] as CanvasSelectedElement[],
    };
  }

  const dismissedImageIdSet = new Set(dismissedImageIds);
  const selectedImages = selectedCanvasElements.filter(
    (element) =>
      isCanvasImageSelection(element) && !dismissedImageIdSet.has(element.id),
  );
  const selectedImageMap = new Map(
    selectedImages.map((element) => [element.id, element] as const),
  );
  const orderedSelectedCanvasImages = [
    ...imageOrder
      .map((imageId) => selectedImageMap.get(imageId))
      .filter((element): element is CanvasSelectedElement => Boolean(element)),
    ...selectedImages.filter((element) => !imageOrder.includes(element.id)),
  ];
  const nonImageSelections = selectedCanvasElements.filter(
    (element) => !isCanvasImageSelection(element),
  );

  return {
    orderedSelectedCanvasElements: [
      ...orderedSelectedCanvasImages,
      ...nonImageSelections,
    ],
    orderedSelectedCanvasImages,
  };
}

export function buildArchitectureTemplateSuggestions(args: {
  architectureContext?: ArchitectureContext | null;
  attachments?: ReadyAttachment[];
  selectedCanvasElements?: CanvasSelectedElement[];
}): ChatInputTemplateSuggestion[] {
  const { architectureContext, attachments, selectedCanvasElements } = args;
  if (!architectureContext) {
    return [];
  }

  const referenceImageKeys = new Set<string>();
  for (const element of selectedCanvasElements ?? []) {
    if (
      element.type === "image" &&
      Boolean(element.storageUrl || element.dataUrl)
    ) {
      referenceImageKeys.add(`canvas:${element.id}`);
    }
  }
  for (const attachment of attachments ?? []) {
    if (attachment.mimeType.startsWith("image/")) {
      referenceImageKeys.add(
        attachment.source === "canvas-ref"
          ? `canvas:${attachment.assetId || attachment.url}`
          : attachment.assetId
            ? `attachment:${attachment.assetId}`
            : `attachment:${attachment.url}`,
      );
    }
  }
  const activeBoard =
    architectureContext.boards.find(
      (board) => board.boardId === architectureContext.activeBoardId,
    ) ?? architectureContext.boards.find((board) => board.status === "active");

  return templateSuggestionsByBoard(
    activeBoard?.kind ?? "reference_board",
    referenceImageKeys.size,
  );
}

function templateSuggestionsByBoard(
  boardKind: ArchitectureBoardKind,
  referenceImageCount: number,
): ChatInputTemplateSuggestion[] {
  const hasReferenceImage = referenceImageCount > 0;
  const hasReferenceGroup = referenceImageCount > 1;
  const category = templateCategoryByBoard(boardKind);

  if (hasReferenceGroup) {
    switch (boardKind) {
      case "site_analysis":
        return withTemplateCategory(category, [
          {
            id: "site-analysis-reference-group",
            label: "提炼多图场地线索",
            prompt:
              "请基于这组参考图提炼共同的场地信息，梳理动线、视线、边界与限制条件，并指出它们之间的关键差异。",
          },
          {
            id: "site-analysis-reference-compare",
            label: "输出多图差异结论",
            prompt:
              "请对比这组参考图在场地分析上的差异，输出一份适合直接放入画布的对比结论。",
          },
        ]);
      case "massing_options":
        return withTemplateCategory(category, [
          {
            id: "massing-reference-group",
            label: "对比多张体量方向",
            prompt:
              "请基于这组参考图对比体量组织、天际线、退台和城市界面，输出 2 到 3 个可继续深化的方向。",
          },
          {
            id: "massing-reference-merge",
            label: "融合多图生成体量",
            prompt:
              "请把这组参考图里最有价值的体量特征融合成一版统一的建筑体量方向，并说明融合逻辑。",
          },
        ]);
      case "render_variations":
        return withTemplateCategory(category, [
          {
            id: "render-reference-group",
            label: "提炼多图共同语言",
            prompt:
              "请基于这组参考图提炼共同的立面气质、材料语言和光影氛围，输出一份可直接用于效果图生成的合并提示。",
          },
          {
            id: "render-reference-compare",
            label: "输出多图差异结论",
            prompt:
              "请对比这组参考图在材料、肌理、光影和氛围上的差异，总结成一份设计结论。",
          },
        ]);
      case "storyboard_shots":
        return withTemplateCategory(category, [
          {
            id: "storyboard-reference-group",
            label: "整理多图镜头顺序",
            prompt:
              "请基于这组参考图整理一组镜头顺序，说明每一张图适合承担的镜头角色和过渡关系。",
          },
          {
            id: "storyboard-reference-focus",
            label: "提炼多图叙事重点",
            prompt:
              "请从这组参考图中提炼叙事重点，生成一份适合建筑演示视频的镜头脚本提纲。",
          },
        ]);
      case "video_output":
        return withTemplateCategory(category, [
          {
            id: "video-reference-group",
            label: "合并多图视频脚本",
            prompt:
              "请基于这组参考图生成一份建筑汇报视频脚本，整合每张图的关键亮点、镜头作用和解说重点。",
          },
          {
            id: "video-reference-compare",
            label: "生成多图对比解说",
            prompt:
              "请围绕这组参考图生成一版对比解说词，突出设计差异、共同点和最终推荐方向。",
          },
        ]);
      case "reference_board":
      default:
        return withTemplateCategory(category, [
          {
            id: "reference-group-language",
            label: "提炼多图共同语言",
            prompt:
              "请基于这组参考图提炼共同的建筑语言、材料气质、构图偏好与情绪方向，输出一份合并策略。",
          },
          {
            id: "reference-group-diff",
            label: "输出多图差异结论",
            prompt:
              "请对比这组参考图的差异点，总结哪些内容适合保留，哪些应当被删减或重新组合。",
          },
        ]);
    }
  }

  if (hasReferenceImage) {
    switch (boardKind) {
      case "site_analysis":
        return withTemplateCategory(category, [
          {
            id: "site-analysis-refine",
            label: "保留视角强化场地分析",
            prompt:
              "请基于已选参考图，保留主要构图与视角关系，强化场地分析表达，补充动线、界面关系与关键约束标注。",
          },
          {
            id: "site-analysis-variants",
            label: "生成两版分析变体",
            prompt:
              "请基于已选参考图生成两版场地分析变体，保持主体位置与镜头方向，重点比较动线组织、景观层次和入口策略。",
          },
        ]);
      case "massing_options":
        return withTemplateCategory(category, [
          {
            id: "massing-preserve-view",
            label: "保留视角深化体量",
            prompt:
              "请基于已选参考图，保持当前视角和主体体量关系，输出 3 个体量深化方向，突出基座、塔楼退台与公共界面差异。",
          },
          {
            id: "massing-compare",
            label: "生成体量对比",
            prompt:
              "请基于已选参考图生成两种体量对比方案，保留镜头关系，重点比较高度控制、轮廓变化和天际线表现。",
          },
        ]);
      case "render_variations":
        return withTemplateCategory(category, [
          {
            id: "render-preserve-angle",
            label: "保留视角深化立面",
            prompt:
              "请基于已选参考图，保持当前视角和主体构图，继续深化建筑立面、材料与光影氛围。",
          },
          {
            id: "render-lighting-variants",
            label: "生成光影变体",
            prompt:
              "请基于已选参考图，在保持镜头不变的前提下生成白天、黄昏、夜景三种光影版本，并强化立面材质差异。",
          },
        ]);
      case "storyboard_shots":
        return withTemplateCategory(category, [
          {
            id: "storyboard-continue-shot",
            label: "延展当前镜头脚本",
            prompt:
              "请基于已选参考图，保持当前画面视角，继续补完该镜头前后衔接的 3 个建筑展示镜头，并写出镜头目的与运动方式。",
          },
          {
            id: "storyboard-shot-alt",
            label: "重构镜头节奏",
            prompt:
              "请基于已选参考图，在保留核心主体的前提下重构镜头节奏，给出开场、转场和高潮三个关键镜头建议。",
          },
        ]);
      case "video_output":
        return withTemplateCategory(category, [
          {
            id: "video-output-refine",
            label: "整理视频输出脚本",
            prompt:
              "请基于已选参考图，保持当前镜头主体关系，整理为可执行的建筑演示视频输出脚本，包含字幕、旁白与节奏建议。",
          },
          {
            id: "video-output-review",
            label: "生成汇报版说明",
            prompt:
              "请基于已选参考图，整理一版适合客户汇报的视频说明，突出设计亮点、场景顺序与重点镜头。",
          },
        ]);
      case "reference_board":
      default:
        return withTemplateCategory(category, [
          {
            id: "reference-extract",
            label: "提炼参考图方向",
            prompt:
              "请基于已选参考图，提炼建筑气质、材料语言、色彩氛围与镜头策略，并输出后续效果图生成建议。",
          },
          {
            id: "reference-remix",
            label: "重组参考图情绪",
            prompt:
              "请基于已选参考图，保留主要构图关系，重组为更适合建筑效果图推进的情绪方向，并说明关键变化点。",
          },
        ]);
    }
  }

  switch (boardKind) {
    case "site_analysis":
      return withTemplateCategory(category, [
        {
          id: "site-analysis-create",
          label: "生成场地分析板",
          prompt:
            "请为当前项目生成一版建筑场地分析板，包含区位、交通、视线、日照与限制条件，并给出画面组织建议。",
        },
      ]);
    case "massing_options":
      return withTemplateCategory(category, [
        {
          id: "massing-create",
          label: "生成体量对比",
          prompt:
            "请输出 3 个建筑体量方向，对比基座组织、塔楼比例、退台策略与公共界面，并说明推荐方案。",
        },
      ]);
    case "render_variations":
      return withTemplateCategory(category, [
        {
          id: "render-create",
          label: "生成立面表现方向",
          prompt:
            "请生成一组建筑效果图方向，比对立面材质、灯光氛围和镜头机位，并给出推荐理由。",
        },
      ]);
    case "storyboard_shots":
      return withTemplateCategory(category, [
        {
          id: "storyboard-create",
          label: "生成镜头脚本",
          prompt:
            "请为建筑演示视频生成镜头脚本，包含开场、场地进入、主体展示、重点空间与结尾镜头。",
        },
      ]);
    case "video_output":
      return withTemplateCategory(category, [
        {
          id: "video-output-create",
          label: "生成视频输出方案",
          prompt:
            "请整理一版建筑演示视频输出方案，包含镜头顺序、时长建议、旁白重点与输出格式。",
        },
      ]);
    case "reference_board":
    default:
      return withTemplateCategory(category, [
        {
          id: "reference-create",
          label: "生成参考图方向",
          prompt:
            "请基于当前项目目标生成一组建筑参考图方向，包含体量气质、材料氛围、景观关系与展示镜头建议。",
        },
      ]);
  }
}

export function ChatSidebar({
  accessToken,
  architectureContext,
  canvasId,
  collapsedLabel = "\u5bf9\u8bdd",
  headerSlot,
  immersive = false,
  panelTitle = "Loomic \u667a\u80fd\u52a9\u7406",
  open,
  onToggle,
  onImageGenerated,
  onVideoGenerated,
  onCanvasSync,
  onStreamEvent,
  initialPrompt,
  initialSessionId,
  onSessionChange,
  onRequestCanvasImages,
  currentBrandKitId,
  ws,
  selectedCanvasElements,
  generatedFilesApi,
  composerCommand = null,
  onComposerCommandHandled,
}: ChatSidebarProps) {
  const breakpoint = useBreakpoint();
  const isOverlay = breakpoint !== "desktop";
  const architectureImmersiveMode = immersive && Boolean(architectureContext);

  // 鈹€鈹€ Session & message management (extracted hook with LRU cache) 鈹€鈹€
  const {
    sessions,
    activeSessionId,
    activeSessionIdRef,
    messages,
    messagesRef,
    setMessages,
    sessionsLoading,
    messagesLoading,
    streaming,
    setStreaming,
    updateSessionMessages,
    handleSelectSession,
    handleNewChat,
    handleDeleteSession,
    autoTitleSession,
    reloadMessages,
    accessTokenRef,
  } = useChatSessions({
    canvasId,
    accessToken,
    initialSessionId,
    onSessionChange,
  });

  // 鈹€鈹€ Stream event handler (extracted hook, shared between send & reconnect) 鈹€鈹€
  const { applyStreamEvent } = useChatStream(updateSessionMessages);

  // 鈹€鈹€ Mention & attachment state 鈹€鈹€
  const [atQuery, setAtQuery] = useState<string | null>(null);
  const [messageMentions, setMessageMentions] = useState<MessageMention[]>([]);
  const [brandKitMentionItems, setBrandKitMentionItems] = useState<
    BrandKitMentionItem[]
  >([]);
  const [imageModelMentionItems, setImageModelMentionItems] = useState<
    ImageModelMentionItem[]
  >([]);
  const [skillMentionItems, setSkillMentionItems] = useState<
    SkillMentionItem[]
  >([]);
  const [creditDialog, setCreditDialog] = useState<{
    open: boolean;
    currentBalance: number;
    requiredAmount: number;
    plan: string;
    dailyClaimed: boolean;
  } | null>(null);
  const chatInputRef = useRef<import("./chat-input").ChatInputHandle>(null);
  const [externalDraft, setExternalDraft] = useState<{
    id: string;
    prompt: string;
  } | null>(null);
  const [composerDraft, setComposerDraft] = useState("");
  const [selectedCanvasImageOrder, setSelectedCanvasImageOrder] = useState<
    string[]
  >([]);
  const [immersiveRecords, setImmersiveRecords] = useState<ImmersiveRecordItem[]>(
    [],
  );
  const [immersiveNoticeDismissed, setImmersiveNoticeDismissed] = useState(false);
  const [immersivePanelView, setImmersivePanelView] = useState<"records" | "files">(
    "records",
  );
  const [immersiveHistoryPopoverOpen, setImmersiveHistoryPopoverOpen] =
    useState(false);
  const [immersiveGeneratedFileCount, setImmersiveGeneratedFileCount] =
    useState(0);
  const [showImmersiveReferenceCard, setShowImmersiveReferenceCard] =
    useState(false);
  const handledComposerCommandIdRef = useRef<string | null>(null);
  const showingImmersiveFilePanel =
    architectureImmersiveMode && immersivePanelView === "files";

  const initialPromptSent = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const messageMentionsRef = useRef(messageMentions);
  messageMentionsRef.current = messageMentions;
  const architectureContextRef = useRef(architectureContext);
  architectureContextRef.current = architectureContext;
  const prevConnectedRef = useRef(false);

  const {
    attachments: imageAttachments,
    addFiles,
    addCanvasRef,
    replaceCanvasRefs,
    retryUpload,
    removeAttachment,
    clearUploads,
    isUploading,
    readyAttachments,
  } = useImageAttachments(accessToken);

  const { activeImageGenerationPreference } = useImageModelPreference();
  const activeImageGenerationPreferenceRef = useRef(
    activeImageGenerationPreference,
  );
  activeImageGenerationPreferenceRef.current = activeImageGenerationPreference;

  const { activeImageOutputPreference } = useImageOutputPreference();
  const activeImageOutputPreferenceRef = useRef<ImageOutputPreference | undefined>(
    activeImageOutputPreference,
  );
  activeImageOutputPreferenceRef.current = activeImageOutputPreference;

  const { activeVideoGenerationPreference } = useVideoModelPreference();
  const activeVideoGenerationPreferenceRef = useRef(
    activeVideoGenerationPreference,
  );
  activeVideoGenerationPreferenceRef.current = activeVideoGenerationPreference;

  const { model: agentModel } = useAgentModel();
  const agentModelRef = useRef(agentModel);
  agentModelRef.current = agentModel;

  const { showTierLimit } = useTierLimitToast();
  const { toast: showToast } = useToast();
  const [dismissedSelectedCanvasImageIds, setDismissedSelectedCanvasImageIds] =
    useState<string[]>([]);

  const { orderedSelectedCanvasElements, orderedSelectedCanvasImages } =
    useMemo(
      () =>
        buildOrderedCanvasSelection(
          selectedCanvasElements,
          selectedCanvasImageOrder,
          dismissedSelectedCanvasImageIds,
        ),
      [
        dismissedSelectedCanvasImageIds,
        selectedCanvasElements,
        selectedCanvasImageOrder,
      ],
    );
  const selectedCanvasElementsRef = useRef(orderedSelectedCanvasElements);
  selectedCanvasElementsRef.current = orderedSelectedCanvasElements;
  const focusConfirmedCanvasRefAssetIdsRef = useRef<string[]>([]);

  const attachCanvasRefsToConversation = useCallback(
    (referenceAttachments: ReadyAttachment[]) => {
      const existingCanvasRefKeys = new Set(
        readyAttachments
          .filter((attachment) => attachment.source === "canvas-ref")
          .map((attachment) => `${attachment.assetId}::${attachment.url}`),
      );

      let attachedCount = 0;

      referenceAttachments.forEach((attachment) => {
        const key = `${attachment.assetId}::${attachment.url}`;
        if (existingCanvasRefKeys.has(key)) {
          return;
        }

        existingCanvasRefKeys.add(key);
        addCanvasRef({
          assetId: attachment.assetId,
          url: attachment.url,
          mimeType: attachment.mimeType,
          ...(attachment.name ? { name: attachment.name } : {}),
        });
        attachedCount += 1;
      });

      return attachedCount;
    },
    [addCanvasRef, readyAttachments],
  );

  useEffect(() => {
    const nextImageIds = orderedSelectedCanvasImages.map((element) => element.id);

    setSelectedCanvasImageOrder((prev) => {
      const retainedOrder = prev.filter((imageId) =>
        nextImageIds.includes(imageId),
      );
      const nextOrder = [
        ...retainedOrder,
        ...nextImageIds.filter((imageId) => !retainedOrder.includes(imageId)),
      ];

      if (
        prev.length === nextOrder.length &&
        prev.every((imageId, index) => imageId === nextOrder[index])
      ) {
        return prev;
      }

      return nextOrder;
    });
  }, [orderedSelectedCanvasImages]);

  useEffect(() => {
    const selectedImageIds =
      selectedCanvasElements?.filter(isCanvasImageSelection).map(
        (element) => element.id,
      ) ?? [];

    setDismissedSelectedCanvasImageIds((prev) => {
      const next = prev.filter((imageId) => selectedImageIds.includes(imageId));

      if (
        prev.length === next.length &&
        prev.every((imageId, index) => imageId === next[index])
      ) {
        return prev;
      }

      return next;
    });
  }, [selectedCanvasElements]);

  useEffect(() => {
    setComposerDraft("");
    setExternalDraft(null);
    setSelectedCanvasImageOrder([]);
    setDismissedSelectedCanvasImageIds([]);
    setImmersiveRecords([]);
    setShowImmersiveReferenceCard(false);
    focusConfirmedCanvasRefAssetIdsRef.current = [];
  }, [canvasId]);

  // 鈹€鈹€ Sidebar resize 鈹€鈹€
  const SIDEBAR_MIN = 300;
  const SIDEBAR_MAX = 600;
  const SIDEBAR_KEYBOARD_STEP = 20;
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const isResizing = useRef(false);

  const clampWidth = useCallback(
    (w: number) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w)),
    [],
  );

  useEffect(() => {
    setImmersiveNoticeDismissed(false);
  }, [canvasId]);

  useEffect(() => {
    if (!architectureImmersiveMode || !generatedFilesApi) {
      setImmersiveGeneratedFileCount(0);
      return;
    }

    const refreshGeneratedFileCount = () => {
      setImmersiveGeneratedFileCount(
        countGeneratedCanvasImages(generatedFilesApi),
      );
    };

    refreshGeneratedFileCount();

    const unsubscribe =
      typeof generatedFilesApi.onChange === "function"
        ? generatedFilesApi.onChange(() => {
            refreshGeneratedFileCount();
          })
        : null;

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [architectureImmersiveMode, canvasId, generatedFilesApi]);

  useEffect(() => {
    if (!architectureImmersiveMode || immersiveGeneratedFileCount <= 0) {
      return;
    }

    setImmersiveRecords((prev) => {
      let didUpdate = false;

      return prev.map((record) => {
        if (
          didUpdate ||
          record.status !== "pending" ||
          immersiveGeneratedFileCount <= record.startingGeneratedFileCount
        ) {
          return record;
        }

        didUpdate = true;
        return {
          ...record,
          status: "completed",
          generatedFileCount: Math.max(
            immersiveGeneratedFileCount - record.startingGeneratedFileCount,
            1,
          ),
        };
      });
    });
  }, [architectureImmersiveMode, immersiveGeneratedFileCount]);

  useEffect(() => {
    if (!architectureImmersiveMode || !open) {
      setImmersivePanelView("records");
      setImmersiveHistoryPopoverOpen(false);
    }
  }, [architectureImmersiveMode, open]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizing.current) return;
        const delta = startX - moveEvent.clientX;
        setSidebarWidth(clampWidth(startWidth + delta));
      };

      const handleMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [sidebarWidth, clampWidth],
  );

  // Touch support for resize handle (mobile / tablet)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      isResizing.current = true;
      const startX = touch.clientX;
      const startWidth = sidebarWidth;

      const handleTouchMove = (moveEvent: TouchEvent) => {
        if (!isResizing.current) return;
        const t = moveEvent.touches[0];
        if (!t) return;
        moveEvent.preventDefault(); // prevent scroll during resize
        const delta = startX - t.clientX;
        setSidebarWidth(clampWidth(startWidth + delta));
      };

      const handleTouchEnd = () => {
        isResizing.current = false;
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
        document.removeEventListener("touchcancel", handleTouchEnd);
      };

      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
      document.addEventListener("touchcancel", handleTouchEnd);
    },
    [sidebarWidth, clampWidth],
  );

  // Keyboard support for resize handle (ArrowLeft/ArrowRight)
  const handleResizeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSidebarWidth((prev) => clampWidth(prev + SIDEBAR_KEYBOARD_STEP));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSidebarWidth((prev) => clampWidth(prev - SIDEBAR_KEYBOARD_STEP));
      }
    },
    [clampWidth],
  );

  // 鈹€鈹€ Auto-scroll to bottom 鈹€鈹€
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 鈹€鈹€ Fetch image models for @mention picker 鈹€鈹€
  useEffect(() => {
    let cancelled = false;

    fetchImageModels()
      .then((data) => {
        if (cancelled) return;
        setImageModelMentionItems(
          data.models.map((model) => ({
            kind: "image-model",
            id: model.id,
            label: model.displayName,
            description: model.description,
            ...(model.iconUrl ? { iconUrl: model.iconUrl } : {}),
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setImageModelMentionItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch enabled workspace skills for @ mention
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    fetchWorkspaceSkills(accessToken)
      .then((data) => {
        if (cancelled) return;
        const allSkills = data.skills ?? [];
        const enabledSkills = allSkills.filter((s) => s.enabled);
        console.log(`[chat-sidebar] Workspace skills loaded: ${allSkills.length} total, ${enabledSkills.length} enabled`);
        setSkillMentionItems(
          enabledSkills.map((s) => ({
            kind: "skill" as const,
            id: s.id,
            label: s.name,
            slug: s.slug,
            description: s.description,
          })),
        );
      })
      .catch((err) => {
        console.error("[chat-sidebar] Failed to load workspace skills:", err);
        if (!cancelled) setSkillMentionItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  // 鈹€鈹€ Fetch brand kit items for @mention picker 鈹€鈹€
  useEffect(() => {
    if (!currentBrandKitId) {
      setBrandKitMentionItems([]);
      return;
    }

    let cancelled = false;
    fetchBrandKit(accessTokenRef.current, currentBrandKitId)
      .then((kit) => {
        if (cancelled) return;
        setBrandKitMentionItems(
          kit.assets.map((asset) => ({
            kind: "brand-kit-asset" as const,
            id: asset.id,
            label: asset.display_name,
            assetType: asset.asset_type,
            ...(asset.text_content !== null
              ? { textContent: asset.text_content }
              : {}),
            ...(asset.file_url !== null ? { fileUrl: asset.file_url } : {}),
            ...(
              (asset.asset_type === "logo" || asset.asset_type === "image") &&
              asset.file_url
                ? { thumbnailUrl: asset.file_url }
                : {}
            ),
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setBrandKitMentionItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [currentBrandKitId, accessTokenRef]);

  // 鈹€鈹€ Send message 鈹€鈹€
  const startManagedRun = useCallback(
    async ({
      assistantId,
      onAck,
      sessionId,
      start,
      trackPerf = false,
    }: {
      assistantId: string;
      onAck?: ((ack: WsCommandAck) => void) | undefined;
      sessionId: string;
      start: (onAck?: (ack: WsCommandAck) => void) => void;
      trackPerf?: boolean;
    }) => {
      setStreaming(true);
      abortRef.current = false;

      const perf = trackPerf
        ? {
            t0Send: performance.now(),
            tAck: 0,
            tFirstToken: 0,
            gotFirstToken: false,
          }
        : null;

      let resolveStream!: () => void;
      const streamDone = new Promise<void>((resolve) => {
        resolveStream = resolve;
      });
      const runIdRef = { current: "" };

      const cleanup = ws.onEvent((event) => {
        if (!runIdRef.current || !("runId" in event) || event.runId !== runIdRef.current) {
          return;
        }
        if (abortRef.current) {
          resolveStream();
          return;
        }

        if (perf && !perf.gotFirstToken && event.type === "message.delta") {
          perf.tFirstToken = performance.now();
          perf.gotFirstToken = true;
          console.log(
            `[perf] send 鈫?first token: ${(perf.tFirstToken - perf.t0Send).toFixed(0)}ms` +
              ` (ack鈫抰oken: ${(perf.tFirstToken - perf.tAck).toFixed(0)}ms)`,
          );
        }

        if (event.type === "billing.error") {
          if (event.code === "insufficient_credits") {
            setCreditDialog({
              open: true,
              currentBalance: event.currentBalance ?? 0,
              requiredAmount: event.requiredAmount ?? 0,
              plan: event.plan ?? "free",
              dailyClaimed: event.dailyClaimed ?? false,
            });
          } else {
            showTierLimit({ code: event.code, message: event.message });
          }
        }

        applyStreamEvent(event, assistantId, sessionId);
        onStreamEvent?.(event);

        const backendInserted = event.type === "tool.completed"
          && event.output
          && typeof (event.output as Record<string, unknown>).elementId === "string";
        if (
          event.type === "tool.completed" &&
          event.artifacts &&
          event.toolName !== "screenshot_canvas" &&
          !backendInserted
        ) {
          for (const artifact of event.artifacts) {
            if (artifact.type === "image" && onImageGenerated) {
              onImageGenerated(artifact as ImageArtifact);
            }
            if (artifact.type === "video" && onVideoGenerated) {
              onVideoGenerated(artifact as VideoArtifact);
            }
          }
        }

        if (event.type === "canvas.sync" && onCanvasSync) {
          onCanvasSync();
        }

        if (event.type === "run.failed") {
          const currentModel = agentModelRef.current ?? "";
          if (currentModel.includes("preview")) {
            showToast(
              "当前 Preview 模型请求不稳定，建议切换模型后重试。",
              "error",
            );
          }
        }

        if (
          event.type === "run.completed" ||
          event.type === "run.failed" ||
          event.type === "run.canceled" ||
          event.type === "run.interrupted"
        ) {
          resolveStream();
        }
      });

      try {
        await new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("WebSocket ack timeout - connection may be down"));
          }, 10_000);

          start((ack) => {
            clearTimeout(timeout);
            if (perf) {
              perf.tAck = performance.now();
              console.log(
                `[perf] send 鈫?ack: ${(perf.tAck - perf.t0Send).toFixed(0)}ms`,
              );
            }
            const id = ack.payload.runId as string;
            runIdRef.current = id;
            onAck?.(ack);
            resolve(id);
          });
        });

        await streamDone;
      } finally {
        cleanup();
        setStreaming(false);
      }
    },
    [
      applyStreamEvent,
      onCanvasSync,
      onImageGenerated,
      onStreamEvent,
      onVideoGenerated,
      showTierLimit,
      showToast,
      ws,
    ],
  );

  const buildContinuationPayload = useCallback(
    (block: AgentPlanBlock): RunCreateRequest | null => {
      const currentSessionId = activeSessionIdRef.current;
      if (!currentSessionId) {
        return null;
      }

      const latestUserPrompt =
        [...messagesRef.current]
          .reverse()
          .find((message) => message.role === "user")
          ? extractTextFromMessage(
              [...messagesRef.current]
                .reverse()
                .find((message) => message.role === "user")!,
            )
          : "";

      return {
        sessionId: currentSessionId,
        conversationId: canvasId,
        prompt: latestUserPrompt || block.plan.goal,
        canvasId,
        accessToken: accessTokenRef.current,
        ...(architectureContextRef.current
          ? { architectureContext: architectureContextRef.current }
          : {}),
        ...(activeImageOutputPreferenceRef.current
          ? { imageOutputPreference: activeImageOutputPreferenceRef.current }
          : {}),
        ...(agentModelRef.current ? { model: agentModelRef.current } : {}),
      };
    },
    [activeSessionIdRef, accessTokenRef, canvasId, messagesRef],
  );

  const handleAttachSelectedCanvasImages = useCallback(() => {
    const selectedEls = selectedCanvasElementsRef.current ?? [];
    const selectedImageRefs = buildSelectedCanvasImageAttachments(selectedEls);

    console.log("[chat-sidebar] attach-selection received", {
      selectedCount: selectedEls.length,
      selectedImageCount: selectedImageRefs.length,
      readyAttachmentCount: readyAttachments.length,
      immersive: architectureImmersiveMode,
      open,
    });

    if (selectedImageRefs.length === 0) {
      return;
    }

    // Explicit "发送至对话" is a separate semantic path from focus-confirmed refs.
    focusConfirmedCanvasRefAssetIdsRef.current = [];

    const attachedCount = attachCanvasRefsToConversation(selectedImageRefs);

    if (architectureImmersiveMode) {
      setImmersivePanelView("records");
      setShowImmersiveReferenceCard(true);
    }

    console.log("[chat-sidebar] confirmed selected refs for conversation context", {
      attachedCount,
      confirmedCount: selectedImageRefs.length,
    });

    if (selectedImageRefs.length > 0) {
      showToast(
        `\u5df2\u5c06 ${selectedImageRefs.length} \u5f20\u753b\u5e03\u53c2\u8003\u56fe\u53d1\u9001\u81f3\u5bf9\u8bdd`,
        "success",
      );
    }
  }, [
    architectureImmersiveMode,
    attachCanvasRefsToConversation,
    open,
    readyAttachments.length,
    showToast,
  ]);

  const handleConfirmSelectedCanvasImagesOnFocus = useCallback(() => {
    const selectedImageRefs = buildSelectedCanvasImageAttachments(
      selectedCanvasElementsRef.current ?? [],
    );

    if (architectureImmersiveMode) {
      setShowImmersiveReferenceCard(false);
    }

    if (selectedImageRefs.length === 0) {
      return;
    }

    const attachedCount = attachCanvasRefsToConversation(selectedImageRefs);
    focusConfirmedCanvasRefAssetIdsRef.current = selectedImageRefs.map(
      (attachment) => attachment.assetId,
    );

    if (attachedCount > 0) {
      console.log("[chat-sidebar] confirmed pending canvas refs on composer focus", {
        canvasId,
        attachedCount,
      });
    }
  }, [architectureImmersiveMode, attachCanvasRefsToConversation, canvasId]);

  useEffect(() => {
    const previousFocusedAssetIds = focusConfirmedCanvasRefAssetIdsRef.current;
    if (
      composerDraft.trim().length === 0 ||
      previousFocusedAssetIds.length === 0 ||
      orderedSelectedCanvasImages.length === 0
    ) {
      return;
    }

    const nextSelectedImageRefs = buildSelectedCanvasImageAttachments(
      orderedSelectedCanvasImages,
    );
    const nextFocusedAssetIds = nextSelectedImageRefs.map(
      (attachment) => attachment.assetId,
    );

    const selectionUnchanged =
      previousFocusedAssetIds.length === nextFocusedAssetIds.length &&
      previousFocusedAssetIds.every(
        (assetId, index) => assetId === nextFocusedAssetIds[index],
      );

    if (selectionUnchanged) {
      return;
    }

    console.log("[chat-sidebar] replacing focus-confirmed canvas refs after base image change", {
      canvasId,
      previousFocusedAssetIds,
      nextFocusedAssetIds,
      draftLength: composerDraft.length,
    });

    replaceCanvasRefs(previousFocusedAssetIds, nextSelectedImageRefs);
    focusConfirmedCanvasRefAssetIdsRef.current = nextFocusedAssetIds;
  }, [
    canvasId,
    composerDraft,
    orderedSelectedCanvasImages,
    replaceCanvasRefs,
  ]);

  const handleMoveSelectedCanvasImage = useCallback(
    (elementId: string, direction: "left" | "right") => {
      setSelectedCanvasImageOrder((prev) => {
        const baseOrder =
          prev.length > 0
            ? prev
            : orderedSelectedCanvasImages.map((element) => element.id);
        const currentIndex = baseOrder.indexOf(elementId);
        if (currentIndex === -1) {
          return prev;
        }

        const targetIndex =
          direction === "left" ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= baseOrder.length) {
          return prev;
        }

        const nextOrder = [...baseOrder];
        [nextOrder[currentIndex], nextOrder[targetIndex]] = [
          nextOrder[targetIndex],
          nextOrder[currentIndex],
        ];

        console.log("[chat-sidebar] reordered selected canvas references", {
          canvasId,
          elementId,
          direction,
          nextOrder,
        });

        return nextOrder;
      });
    },
    [canvasId, orderedSelectedCanvasImages],
  );

  const handleRemoveSelectedCanvasImage = useCallback(
    (elementId: string) => {
      setDismissedSelectedCanvasImageIds((prev) => {
        if (prev.includes(elementId)) {
          return prev;
        }

        const next = [...prev, elementId];
        console.log("[chat-sidebar] removed pending selected canvas reference", {
          canvasId,
          elementId,
          nextDismissedIds: next,
        });
        return next;
      });
      setSelectedCanvasImageOrder((prev) =>
        prev.filter((imageId) => imageId !== elementId),
      );
    },
    [canvasId],
  );

  const handleRemoveAttachment = useCallback(
    (attachmentId: string) => {
      const removedAttachment = imageAttachments.find(
        (attachment) => attachment.id === attachmentId,
      );
      removeAttachment(attachmentId);

      if (
        removedAttachment?.source === "canvas-ref" &&
        removedAttachment.assetId
      ) {
        focusConfirmedCanvasRefAssetIdsRef.current =
          focusConfirmedCanvasRefAssetIdsRef.current.filter(
            (assetId) => assetId !== removedAttachment.assetId,
          );
      }
    },
    [imageAttachments, removeAttachment],
  );

  useEffect(() => {
    if (!composerCommand) {
      return;
    }

    if (handledComposerCommandIdRef.current === composerCommand.id) {
      return;
    }

    handledComposerCommandIdRef.current = composerCommand.id;
    console.log("[chat-sidebar] handling composer command", {
      commandId: composerCommand.id,
      commandType: composerCommand.type,
      open,
      immersive: architectureImmersiveMode,
    });

    if (composerCommand.type === "attach-selection") {
      handleAttachSelectedCanvasImages();
    }

    if (composerCommand.type === "apply-template") {
      if (composerCommand.attachSelection !== false) {
        handleAttachSelectedCanvasImages();
      }
      setExternalDraft({
        id: composerCommand.id,
        prompt: composerCommand.prompt,
      });
    }

    onComposerCommandHandled?.(composerCommand.id);
  }, [
    composerCommand,
    handleAttachSelectedCanvasImages,
    onComposerCommandHandled,
  ]);

  const handleSend = useCallback(
    async (
      text: string,
      attachmentsOverride?: ReadyAttachment[],
      imageGenerationPreferenceOverride?: ImageGenerationPreference,
      mentionsOverride?: MessageMention[],
    ) => {
      const currentSessionId = activeSessionIdRef.current;
      if (streaming || !currentSessionId) return;

      const currentAttachments = attachmentsOverride ?? readyAttachments;
      const currentImageGenerationPreference =
        imageGenerationPreferenceOverride ??
        activeImageGenerationPreferenceRef.current;
      const currentImageOutputPreference = activeImageOutputPreferenceRef.current;
      const currentVideoGenerationPreference =
        activeVideoGenerationPreferenceRef.current;
      const currentMentions = mentionsOverride ?? messageMentionsRef.current;
      const recordReferences = architectureImmersiveMode
        ? currentAttachments.filter((attachment) => attachment.source === "canvas-ref")
        : [];

      // Add user message locally
      const imageBlocks: ContentBlock[] = currentAttachments.map((a) => ({
        type: "image" as const,
        assetId: a.assetId,
        url: a.url,
        mimeType: a.mimeType,
        source: a.source,
        ...(a.name ? { name: a.name } : {}),
      }));
      const mentionBlocks: ContentBlock[] = currentMentions.map((mention) =>
        mention.mentionType === "image-model"
          ? {
              type: "mention" as const,
              mentionType: "image-model" as const,
              id: mention.id,
              label: mention.label,
            }
          : mention.mentionType === "skill"
            ? {
                type: "mention" as const,
                mentionType: "skill" as const,
                id: mention.id,
                label: mention.label,
                slug: mention.slug,
              }
          : {
              type: "mention" as const,
              mentionType: "brand-kit-asset" as const,
              id: mention.id,
              label: mention.label,
              assetType: mention.assetType,
              ...(mention.textContent !== undefined
                ? { textContent: mention.textContent }
                : {}),
              ...(mention.fileUrl !== undefined
                ? { fileUrl: mention.fileUrl }
                : {}),
            },
      );
      const userMsg = {
        id: `user-${Date.now()}`,
        role: "user" as const,
        contentBlocks: [
          { type: "text" as const, text },
          ...mentionBlocks,
          ...imageBlocks,
        ],
      };
      updateSessionMessages(currentSessionId, (prev) => [...prev, userMsg]);

      // Persist user message (fire-and-forget)
      saveMessage(accessTokenRef.current, currentSessionId, {
        role: "user",
        content: text,
        contentBlocks: [
          { type: "text" as const, text },
          ...mentionBlocks,
          ...imageBlocks,
        ],
      }).catch((err) =>
        console.error("[chat] Failed to save user message:", err),
      );

      // Auto-title from first user message
      autoTitleSession(text);

      // Create assistant placeholder
      const assistantId = `assistant-${Date.now()}`;
      updateSessionMessages(currentSessionId, (prev) => [
        ...prev,
        { id: assistantId, role: "assistant" as const, contentBlocks: [] },
      ]);

      if (architectureImmersiveMode && recordReferences.length > 0) {
        setImmersiveRecords((prev) => [
          {
            id: `immersive-record-${Date.now()}`,
            prompt: text,
            references: recordReferences,
            createdAtLabel: formatImmersiveRecordTime(new Date()),
            status: "pending",
            generatedFileCount: 0,
            startingGeneratedFileCount: immersiveGeneratedFileCount,
            modelLabel: agentModelRef.current?.trim() || "Banana Pro",
          },
          ...prev,
        ]);
      }

      try {
        await startManagedRun({
          assistantId,
          onAck: () => {
            clearUploads();
            setMessageMentions([]);
          },
          sessionId: currentSessionId,
          start: (onAck) =>
            ws.startRun(
              {
                sessionId: currentSessionId,
                conversationId: canvasId,
                prompt: text,
                canvasId,
                accessToken: accessTokenRef.current,
                ...(architectureContextRef.current
                  ? { architectureContext: architectureContextRef.current }
                  : {}),
                ...(currentAttachments.length > 0
                  ? { attachments: currentAttachments }
                  : {}),
                ...(currentMentions.length > 0
                  ? { mentions: currentMentions }
                  : {}),
                ...(currentImageGenerationPreference
                  ? {
                      imageGenerationPreference: currentImageGenerationPreference,
                    }
                  : {}),
                ...(currentImageOutputPreference
                  ? {
                      imageOutputPreference: currentImageOutputPreference,
                    }
                  : {}),
                ...(currentVideoGenerationPreference
                  ? {
                      videoGenerationPreference: currentVideoGenerationPreference,
                    }
                  : {}),
                ...(agentModelRef.current
                  ? { model: agentModelRef.current }
                  : {}),
              },
              onAck,
            ),
          trackPerf: true,
        });
      } catch {
        updateSessionMessages(currentSessionId, (prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;
            const hasText = m.contentBlocks.some((b) => b.type === "text");
            if (hasText) return m;
            return {
              ...m,
              contentBlocks: [
                ...m.contentBlocks,
                {
                  type: "text" as const,
                  text: "\u83b7\u53d6\u54cd\u5e94\u5931\u8d25\u3002",
                },
              ],
            };
          }),
        );
      }
    },
    [
      activeSessionIdRef,
      accessTokenRef,
      architectureImmersiveMode,
      autoTitleSession,
      canvasId,
      clearUploads,
      immersiveGeneratedFileCount,
      readyAttachments,
      startManagedRun,
      streaming,
      updateSessionMessages,
      autoTitleSession,
      ws,
    ],
  );

  const handleInterruptPlan = useCallback(() => {
    const planBlock = findLatestAgentPlanBlock(messagesRef.current);
    if (!planBlock) {
      console.warn("[chat-sidebar] interrupt ignored because no plan block is available");
      return;
    }

    ws.interruptRun(planBlock.plan.runId);
  }, [messagesRef, ws]);

  const handleResumePlan = useCallback(async () => {
    const planBlock = findLatestAgentPlanBlock(messagesRef.current);
    const currentSessionId = activeSessionIdRef.current;
    if (streaming || !planBlock || !currentSessionId) {
      return;
    }

    const payload = buildContinuationPayload(planBlock);
    if (!payload) {
      return;
    }

    const assistantId = `assistant-${Date.now()}`;
    updateSessionMessages(currentSessionId, (prev) => [
      ...prev,
      { id: assistantId, role: "assistant" as const, contentBlocks: [] },
    ]);

    try {
      await startManagedRun({
        assistantId,
        sessionId: currentSessionId,
        start: (onAck) =>
          ws.resumeRun(
            {
              ...payload,
              sourceRunId: planBlock.plan.runId,
              plan: planBlock.plan,
            },
            onAck,
          ),
      });
    } catch {
      updateSessionMessages(currentSessionId, (prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                contentBlocks: [
                  ...message.contentBlocks,
                  {
                    type: "text" as const,
                    text:
                      "\u6062\u590d\u5df2\u4e2d\u65ad\u7684\u4efb\u52a1\u5931\u8d25\u3002",
                  },
                ],
              }
            : message,
        ),
      );
    }
  }, [
    activeSessionIdRef,
    buildContinuationPayload,
    messagesRef,
    startManagedRun,
    streaming,
    updateSessionMessages,
    ws,
  ]);

  const handleRetryPlan = useCallback(async () => {
    const planBlock = findLatestAgentPlanBlock(messagesRef.current);
    const currentSessionId = activeSessionIdRef.current;
    if (streaming || !planBlock || !currentSessionId) {
      return;
    }

    const payload = buildContinuationPayload(planBlock);
    if (!payload) {
      return;
    }

    const assistantId = `assistant-${Date.now()}`;
    updateSessionMessages(currentSessionId, (prev) => [
      ...prev,
      { id: assistantId, role: "assistant" as const, contentBlocks: [] },
    ]);

    try {
      await startManagedRun({
        assistantId,
        sessionId: currentSessionId,
        start: (onAck) =>
          ws.retryRun(
            {
              ...payload,
              sourceRunId: planBlock.plan.runId,
            },
            onAck,
          ),
      });
    } catch {
      updateSessionMessages(currentSessionId, (prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                contentBlocks: [
                  ...message.contentBlocks,
                  {
                    type: "text" as const,
                    text:
                      "\u91cd\u8bd5\u5df2\u4e2d\u65ad\u7684\u4efb\u52a1\u5931\u8d25\u3002",
                  },
                ],
              }
            : message,
        ),
      );
    }
  }, [
    activeSessionIdRef,
    buildContinuationPayload,
    messagesRef,
    startManagedRun,
    streaming,
    updateSessionMessages,
    ws,
  ]);

  // 鈹€鈹€ Mention picker 鈹€鈹€
  const mentionPickerItems: MessageMentionPickerItem[] = [
    ...(onRequestCanvasImages ? onRequestCanvasImages() : []),
    ...brandKitMentionItems,
    ...imageModelMentionItems,
    ...skillMentionItems,
  ];
  const templateSuggestions = useMemo(
    () =>
      buildArchitectureTemplateSuggestions({
        ...(architectureContext !== undefined ? { architectureContext } : {}),
        attachments: readyAttachments,
        ...(orderedSelectedCanvasElements
          ? { selectedCanvasElements: orderedSelectedCanvasElements }
          : {}),
      }),
    [architectureContext, orderedSelectedCanvasElements, readyAttachments],
  );
  const canvasReferenceAttachments = useMemo(
    () =>
      readyAttachments.filter((attachment) => attachment.source === "canvas-ref"),
    [readyAttachments],
  );
  const attachedReferenceCount = canvasReferenceAttachments.length;
  const effectiveConversationRefs = canvasReferenceAttachments;
  const latestCanvasReferenceAttachment =
    effectiveConversationRefs[effectiveConversationRefs.length - 1] ?? null;

  const handleMentionSelect = useCallback(
    (item: MessageMentionPickerItem) => {
      if (item.kind === "canvas-image") {
        addCanvasRef({
          assetId: item.assetId,
          url: item.url,
          mimeType: item.mimeType,
          name: item.name,
        });
        return;
      }

      setMessageMentions((prev) => {
        let nextMention: MessageMention;
        if (item.kind === "image-model") {
          nextMention = { mentionType: "image-model", id: item.id, label: item.label };
        } else if (item.kind === "skill") {
          nextMention = { mentionType: "skill", id: item.id, label: item.label, slug: item.slug };
        } else {
          nextMention = {
            mentionType: "brand-kit-asset",
            id: item.id,
            label: item.label,
            assetType: item.assetType,
            ...(item.textContent !== undefined
              ? { textContent: item.textContent }
              : {}),
            ...(item.fileUrl !== undefined
              ? { fileUrl: item.fileUrl }
              : {}),
          };
        }

        if (
          prev.some(
            (m) =>
              m.mentionType === nextMention.mentionType &&
              m.id === nextMention.id,
          )
        ) {
          return prev;
        }
        return [...prev, nextMention];
      });
    },
    [addCanvasRef],
  );

  const handleRemoveMention = useCallback((mention: MessageMention) => {
    setMessageMentions((prev) =>
      prev.filter(
        (item) =>
          !(item.mentionType === mention.mentionType && item.id === mention.id),
      ),
    );
  }, []);

  const handleApplyImmersiveRecordDraft = useCallback(
    (
      action: "night" | "redescribe",
      referenceAttachments: ReadyAttachment[] = effectiveConversationRefs,
    ) => {
      const referenceCount = referenceAttachments.length;
      if (referenceCount === 0) {
        return;
      }

      const latestReferenceAttachment =
        referenceAttachments[referenceAttachments.length - 1] ?? null;
      const referenceLabel =
        referenceCount > 1
          ? `这组 ${referenceCount} 张参考图`
          : latestReferenceAttachment?.name ?? "这张参考图";
      const prompt =
        action === "night"
          ? `请基于${referenceLabel}改为夜景效果图，保留主要建筑体量、构图关系与材质语言。`
          : `请重新描述${referenceLabel}的建筑气质、材质、光影与镜头重点，输出一份更清晰的生成提示。`;

      console.log("[chat-sidebar] apply immersive record shortcut", {
        action,
        canvasId,
        referenceCount,
      });

      attachCanvasRefsToConversation(referenceAttachments);
      setComposerDraft(prompt);
      setExternalDraft({
        id: `immersive-record-${action}-${Date.now()}`,
        prompt,
      });
    },
    [attachCanvasRefsToConversation, canvasId, effectiveConversationRefs],
  );

  const handleCreateImmersiveDialog = useCallback(() => {
    console.log("[chat-sidebar] immersive header add-dialog clicked", {
      canvasId,
    });
    void handleNewChat();
  }, [canvasId, handleNewChat]);

  const openImmersiveHistoryPopover = useCallback(() => {
    console.log("[chat-sidebar] immersive header history hovered", {
      canvasId,
      sessionCount: sessions.length,
    });
    setImmersiveHistoryPopoverOpen(true);
  }, [canvasId, sessions.length]);

  const closeImmersiveHistoryPopover = useCallback(() => {
    setImmersiveHistoryPopoverOpen(false);
  }, []);

  const handleSelectImmersiveHistorySession = useCallback(
    (sessionId: string) => {
      console.log("[chat-sidebar] immersive history session selected", {
        canvasId,
        sessionId,
      });
      setImmersiveHistoryPopoverOpen(false);
      void handleSelectSession(sessionId);
    },
    [canvasId, handleSelectSession],
  );

  const handleOpenImmersiveFilePanel = useCallback(() => {
    console.log("[chat-sidebar] immersive header file-list clicked", {
      canvasId,
      generatedFileCount: immersiveGeneratedFileCount,
    });
    setImmersiveHistoryPopoverOpen(false);
    setImmersivePanelView("files");
  }, [canvasId, immersiveGeneratedFileCount]);

  const handleCloseImmersiveFilePanel = useCallback(() => {
    setImmersivePanelView("records");
  }, []);

  // 鈹€鈹€ Auto-send initial prompt 鈹€鈹€
  useEffect(() => {
    if (
      !initialPrompt ||
      sessionsLoading ||
      !ws.connected ||
      initialPromptSent.current
    )
      return;

    let storedAttachments: ReadyAttachment[] | undefined;
    let storedImageGenerationPreference: ImageGenerationPreference | undefined;
    let storedAgentModel: string | undefined;
    try {
      const raw = sessionStorage.getItem(INITIAL_ATTACHMENTS_KEY);
      if (raw) {
        storedAttachments = JSON.parse(raw) as ReadyAttachment[];
        sessionStorage.removeItem(INITIAL_ATTACHMENTS_KEY);
      }

      const preferenceRaw = sessionStorage.getItem(
        INITIAL_IMAGE_GENERATION_PREFERENCE_KEY,
      );
      if (preferenceRaw) {
        storedImageGenerationPreference = JSON.parse(
          preferenceRaw,
        ) as ImageGenerationPreference;
        sessionStorage.removeItem(INITIAL_IMAGE_GENERATION_PREFERENCE_KEY);
      }

      const modelRaw = sessionStorage.getItem(INITIAL_AGENT_MODEL_KEY);
      if (modelRaw) {
        storedAgentModel = modelRaw;
        sessionStorage.removeItem(INITIAL_AGENT_MODEL_KEY);
      }
    } catch {
      // Malformed JSON or unavailable storage
    }

    if (storedAgentModel) {
      agentModelRef.current = storedAgentModel;
    }

    const timer = setTimeout(() => {
      if (!activeSessionIdRef.current) return;
      initialPromptSent.current = true;
      void handleSend(
        initialPrompt,
        storedAttachments,
        storedImageGenerationPreference,
      );
    }, 0);

    return () => clearTimeout(timer);
  }, [
    initialPrompt,
    sessionsLoading,
    ws.connected,
    handleSend,
    activeSessionIdRef,
  ]);

  // 鈹€鈹€ Reconnection: resume canvas binding + reload messages 鈹€鈹€
  // Uses the shared applyStreamEvent to handle live events without duplicated logic.
  useEffect(() => {
    if (!ws.connected || sessionsLoading) {
      if (!ws.connected) prevConnectedRef.current = false;
      return;
    }
    if (prevConnectedRef.current) return;
    prevConnectedRef.current = true;

    const sessionId = activeSessionIdRef.current;
    if (!sessionId) return;

    // Skip if initialPrompt effect will handle binding
    if (initialPrompt && !initialPromptSent.current) return;

    void (async () => {
      // Reload messages from DB (server may have persisted while disconnected)
      await reloadMessages(sessionId);

      // Resume canvas binding (after DB messages are set)
      ws.resumeCanvas(canvasId, (ack) => {
        const activeRunId = (ack.payload as Record<string, unknown>)
          .activeRunId;
        if (activeRunId && typeof activeRunId === "string") {
          setStreaming(true);

          const assistantId = `resumed_${activeRunId}`;
          // Must use updateSessionMessages (not setMessages) so the placeholder
          // lands in msgCacheRef as well as React state. applyStreamEvent reads
          // from the cache. If the placeholder only lives in React state, stream
          // events can't find it and the first updateSessionMessages call
          // overwrites state back to the stale cache (losing the placeholder).
          updateSessionMessages(sessionId, (prev) => {
            if (prev.some((m) => m.id === assistantId)) return prev;
            return [
              ...prev,
              {
                id: assistantId,
                role: "assistant" as const,
                contentBlocks: [],
              },
            ];
          });

          // Reuse the shared stream event handler and eliminate duplicated logic.
          const unsub = ws.onEvent((evt) => {
            if (!("runId" in evt) || evt.runId !== activeRunId) return;

            applyStreamEvent(evt, assistantId, sessionId);
            onStreamEvent?.(evt);

            // Fire canvas insertion callbacks for artifacts arriving after reconnect.
            // Skip if the backend already inserted the element (elementId in output).
            const wsBackendInserted = evt.type === "tool.completed"
              && evt.output
              && typeof (evt.output as Record<string, unknown>).elementId === "string";
            if (
              evt.type === "tool.completed" &&
              evt.artifacts &&
              evt.toolName !== "screenshot_canvas" &&
              !wsBackendInserted
            ) {
              for (const artifact of evt.artifacts) {
                if (artifact.type === "image" && onImageGenerated) {
                  onImageGenerated(artifact as ImageArtifact);
                }
                if (artifact.type === "video" && onVideoGenerated) {
                  onVideoGenerated(artifact as VideoArtifact);
                }
              }
            }

            if (evt.type === "canvas.sync" && onCanvasSync) {
              onCanvasSync();
            }

            if (
              evt.type === "run.completed" ||
              evt.type === "run.failed" ||
              evt.type === "run.canceled"
            ) {
              setStreaming(false);
              unsub();
            }
          });
        }
      });
    })();
  }, [
    ws.connected,
    ws,
    canvasId,
    sessionsLoading,
    applyStreamEvent,
    onStreamEvent,
    onImageGenerated,
    onVideoGenerated,
    onCanvasSync,
    activeSessionIdRef,
    reloadMessages,
    updateSessionMessages,
    setStreaming,
    initialPrompt,
  ]);

  // 鈹€鈹€ Collapsed state 鈹€鈹€
  const latestAgentPlanBlock = architectureImmersiveMode
    ? null
    : findLatestAgentPlanBlock(messages);
  const transcriptMessages = messages.filter((message, index) => {
    if (messageHasTranscriptContent(message)) {
      return true;
    }

    return (
      streaming &&
      message.role === "assistant" &&
      index === messages.length - 1
    );
  });

  const immersiveFloatingComposer =
    architectureImmersiveMode && !isOverlay ? (
      <div
        className="absolute bottom-4 left-1/2 z-30 w-[min(760px,calc(100vw-2rem))] max-w-[760px] -translate-x-1/2"
        data-layout="immersive-collapsed"
        data-composer-placement="centered-bottom"
        data-testid={!open ? "chat-sidebar-collapsed-composer" : undefined}
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
        onCopy={(e) => e.stopPropagation()}
        onCut={(e) => e.stopPropagation()}
        onPaste={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div
          className="overflow-hidden rounded-[10px] border border-border/80 bg-card/94 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl"
          data-testid="chat-sidebar-floating-composer"
        >
          <div className="relative px-2 pb-2 pt-2">
            {atQuery !== null && mentionPickerItems.length > 0 && (
              <MessageMentionPicker
                items={mentionPickerItems}
                query={atQuery}
                onSelect={(item) => {
                  handleMentionSelect(item);
                  chatInputRef.current?.clearAtQuery();
                  setAtQuery(null);
                }}
                onClose={() => setAtQuery(null)}
              />
            )}
            <ChatInput
              ref={chatInputRef}
              immersiveArchitecture
              onSend={handleSend}
              draftValue={composerDraft}
              onDraftChange={setComposerDraft}
              attachedReferenceCount={attachedReferenceCount}
              disabled={streaming || sessionsLoading}
              attachments={imageAttachments}
              onAddFiles={addFiles}
              onAttachSelectedCanvasImages={handleAttachSelectedCanvasImages}
              onMoveSelectedCanvasImage={handleMoveSelectedCanvasImage}
              onRemoveSelectedCanvasImage={handleRemoveSelectedCanvasImage}
              onRemoveAttachment={handleRemoveAttachment}
              onRetryAttachment={retryUpload}
              isUploading={isUploading}
              onAtQuery={setAtQuery}
              mentions={messageMentions}
              onRemoveMention={handleRemoveMention}
              onInputFocus={handleConfirmSelectedCanvasImagesOnFocus}
              {...(orderedSelectedCanvasElements
                ? { selectedCanvasElements: orderedSelectedCanvasElements }
                : {})}
              templateSuggestions={templateSuggestions}
              externalDraft={externalDraft}
            />
            {!ws.connected ? (
              <div className="px-2 pb-1 pt-2">
                <span className="inline-flex items-center gap-1 rounded-[10px] bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  连接中
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ) : null;

  if (!open) {
    if (architectureImmersiveMode && !isOverlay) {
      return immersiveFloatingComposer;
    }

    return (
      <div className={`absolute right-3 z-20 ${immersive ? "top-16" : "top-3"}`}>
        <button
          onClick={onToggle}
          type="button"
          className="group inline-flex items-center gap-1 rounded-[10px] bg-card/80 backdrop-blur-sm border border-border px-2.5 py-1.5 text-[0] text-foreground/60 shadow-sm hover:bg-card hover:text-foreground transition-colors cursor-pointer md:px-2.5 md:py-1.5 min-h-[36px] md:min-h-0"
        >
          <svg className="size-4 md:size-3.5" viewBox="0 0 24 24" fill="none">
            <path
              fill="currentColor"
              fillOpacity={0.9}
              d="M18.25 3c2.071 0 3.946 2.16 3.946 4.23L22 15.75a3.75 3.75 0 0 1-3.75 3.75h-2.874a.25.25 0 0 0-.16.058l-2.098 1.738a1.75 1.75 0 0 1-2.24-.007l-2.065-1.73a.25.25 0 0 0-.162-.059H5.75A3.75 3.75 0 0 1 2 15.75v-9A3.75 3.75 0 0 1 5.75 3zM7.5 10q-.053 0-.104.005a1.25 1.25 0 0 0-1.14 1.117l-.006.128.007.128a1.25 1.25 0 1 0 1.37-1.371l-.02-.002A1 1 0 0 0 7.5 10m4.5 0q-.053 0-.104.005a1.25 1.25 0 0 0-1.14 1.117l-.006.128.007.128a1.25 1.25 0 1 0 1.37-1.371l-.02-.002A1 1 0 0 0 12 10m4.5 0q-.053 0-.105.005a1.25 1.25 0 0 0-1.138 1.117l-.007.128.007.128a1.25 1.25 0 1 0 1.37-1.371l-.02-.002A1 1 0 0 0 16.5 10"
            />
          </svg>
          <span className="text-xs md:text-[11px]">{collapsedLabel}</span>
        </button>
      </div>
    );
  }

  // Shared event isolation prevents keyboard and clipboard events from bleeding through.
  // into Excalidraw canvas when the sidebar has focus.
  const eventIsolationProps = {
    onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
    onKeyUp: (e: React.KeyboardEvent) => e.stopPropagation(),
    onCopy: (e: React.ClipboardEvent) => e.stopPropagation(),
    onCut: (e: React.ClipboardEvent) => e.stopPropagation(),
    onPaste: (e: React.ClipboardEvent) => e.stopPropagation(),
    onWheel: (e: React.WheelEvent) => e.stopPropagation(),
  };

  const composerContent = (
    <div className="relative">
      {atQuery !== null && mentionPickerItems.length > 0 && (
        <MessageMentionPicker
          items={mentionPickerItems}
          query={atQuery}
          onSelect={(item) => {
            handleMentionSelect(item);
            chatInputRef.current?.clearAtQuery();
            setAtQuery(null);
          }}
          onClose={() => setAtQuery(null)}
        />
      )}
      <ChatInput
        ref={chatInputRef}
        immersiveArchitecture={architectureImmersiveMode}
        onSend={handleSend}
        draftValue={composerDraft}
        onDraftChange={setComposerDraft}
        attachedReferenceCount={attachedReferenceCount}
        disabled={streaming || sessionsLoading}
        attachments={imageAttachments}
        onAddFiles={addFiles}
        onAttachSelectedCanvasImages={handleAttachSelectedCanvasImages}
        onMoveSelectedCanvasImage={handleMoveSelectedCanvasImage}
        onRemoveSelectedCanvasImage={handleRemoveSelectedCanvasImage}
        onRemoveAttachment={handleRemoveAttachment}
        onRetryAttachment={retryUpload}
        isUploading={isUploading}
        onAtQuery={setAtQuery}
        mentions={messageMentions}
        onRemoveMention={handleRemoveMention}
        onInputFocus={handleConfirmSelectedCanvasImagesOnFocus}
        {...(orderedSelectedCanvasElements
          ? { selectedCanvasElements: orderedSelectedCanvasElements }
          : {})}
        templateSuggestions={templateSuggestions}
        externalDraft={externalDraft}
      />
    </div>
  );

  // The inner panel content is shared across all breakpoints.
  // Extracted as a variable to avoid duplicating the chat UI tree
  // between overlay (mobile/tablet) and inline (desktop) render paths.
  const panelContent = (
    <>
      {/* Header */}
      {architectureImmersiveMode ? (
        <div className="border-b border-border/70 px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2">
              <h2 className="shrink-0 text-sm font-semibold text-foreground">
                {panelTitle}
              </h2>
              <span className="inline-flex min-w-0 items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                个人创作记录只保留30天
              </span>
              <p className="hidden" />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <ImmersiveHeaderActionButton
                label="添加对话"
                onClick={handleCreateImmersiveDialog}
              >
                <AddDialogIcon />
              </ImmersiveHeaderActionButton>
              <div
                className="relative"
                onMouseEnter={openImmersiveHistoryPopover}
                onMouseLeave={closeImmersiveHistoryPopover}
                onFocusCapture={openImmersiveHistoryPopover}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    closeImmersiveHistoryPopover();
                  }
                }}
              >
                <ImmersiveHeaderActionButton label="历史对话">
                  <HistoryIcon />
                </ImmersiveHeaderActionButton>
                {immersiveHistoryPopoverOpen && sessions.length > 0 ? (
                  <div
                    role="tooltip"
                    className="absolute right-full top-[-10px] z-20 mr-6 w-[266px] rounded-[10px] border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                  >
                    <div className="px-2 py-1 text-[13px] font-semibold text-foreground">
                      历史对话
                    </div>
                    <div className="mt-1 flex flex-col gap-1">
                      {sessions.map((session) => {
                        const isActive = session.id === activeSessionId;
                        return (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() =>
                              handleSelectImmersiveHistorySession(session.id)
                            }
                            className={`rounded-[8px] px-2.5 py-2 text-left text-[13px] transition-colors ${
                              isActive
                                ? "bg-[#f5f5f3] font-medium text-foreground"
                                : "text-muted-foreground hover:bg-[#faf6ee] hover:text-foreground"
                            }`}
                          >
                            <span className="block truncate">
                              {session.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              <ImmersiveHeaderActionButton
                label="文件列表"
                onClick={handleOpenImmersiveFilePanel}
              >
                <FileListIcon />
              </ImmersiveHeaderActionButton>
              <ImmersiveHeaderActionButton label="收起" onClick={onToggle}>
                <ShrinkIcon />
              </ImmersiveHeaderActionButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[48px] items-center justify-between pl-4 pr-2">
          <div className="flex items-center gap-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground shrink-0">
              {panelTitle}
            </h2>
            {headerSlot}
            {!sessionsLoading && (
              <SessionSelector
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelect={handleSelectSession}
                onNewChat={handleNewChat}
                onDelete={handleDeleteSession}
              />
            )}
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            title={"\u6536\u8d77\u9762\u677f"}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 3.25a.75.75 0 0 1 .75.75v16a.75.75 0 0 1-1.5 0V4A.75.75 0 0 1 4 3.25m9.47 2.22a.75.75 0 0 1 1.06 0l6 6a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 1 1-1.06-1.06l4.72-4.72H8a.75.75 0 0 1 0-1.5h10.19l-4.72-4.72a.75.75 0 0 1 0-1.06"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Disconnected banner */}
      {!ws.connected && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b border-border">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-[pulse_1.2s_ease-in-out_infinite]" />
          <span className="text-[11px] text-muted-foreground">
            连接已断开，正在重连
          </span>
        </div>
      )}

      <>
        {/* Messages */}
        <ErrorBoundary
          onError={(err) =>
            console.error("[chat-sidebar] message area render crashed:", err)
          }
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-6 px-4 py-4" aria-live="polite" aria-relevant="additions">
          {architectureImmersiveMode && !immersiveNoticeDismissed ? (
            <div
              className="rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] leading-6 text-slate-600"
              data-testid="chat-sidebar-immersive-notice"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500">
                    <svg className="h-2.5 w-2.5" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 4.25a.75.75 0 1 1 0 1.5a.75.75 0 0 1 0-1.5M7.25 7a.75.75 0 0 1 1.5 0v4a.75.75 0 0 1-1.5 0z"
                        fill="currentColor"
                      />
                      <path
                        d="M8 1.75a6.25 6.25 0 1 0 0 12.5a6.25 6.25 0 0 0 0-12.5m-4.75 6.25a4.75 4.75 0 1 1 9.5 0a4.75 4.75 0 0 1-9.5 0"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <p className="min-w-0">
                    由于使用稳定的 Banana Pro 服务成本持续提升，近期平台会员与次数包价格将同步调整，如需大量使用请提前采购，感谢理解。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setImmersiveNoticeDismissed(true)}
                  className="shrink-0 rounded-[10px] border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  我知道了
                </button>
              </div>
            </div>
          ) : null}
          {architectureImmersiveMode && immersiveRecords.length > 0 ? (
            <div
              className="flex flex-col gap-3"
              data-testid="chat-sidebar-record-list"
            >
              {immersiveRecords.map((record) => {
                const primaryReference =
                  record.references[record.references.length - 1] ?? null;

                return (
                  <div
                    key={record.id}
                    className="rounded-[10px] border border-slate-200 bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
                    data-testid="chat-sidebar-record-item"
                  >
                    <div className="flex gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[10px] border border-slate-200 bg-slate-100">
                        {primaryReference?.url ? (
                          <img
                            alt={primaryReference.name ?? "画布参考图"}
                            className="h-full w-full object-cover"
                            src={primaryReference.url}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
                            参考图
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[13px] font-semibold text-foreground">
                            {primaryReference?.name ?? "画布参考图"}
                          </p>
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                            {record.status === "pending"
                              ? "待生成"
                              : `已生成 ${record.generatedFileCount} 个文件`}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-3 text-[12px] leading-6 text-foreground">
                          {record.prompt}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleApplyImmersiveRecordDraft(
                                "night",
                                record.references,
                              )
                            }
                            className="rounded-[10px] border border-slate-200 bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-200"
                          >
                            改为夜景
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleApplyImmersiveRecordDraft(
                                "redescribe",
                                record.references,
                              )
                            }
                            className="rounded-[10px] border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-foreground transition-colors hover:bg-slate-100"
                          >
                            重新描述
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-[12px] text-muted-foreground">
                          <span>图片生成：{record.modelLabel}</span>
                          <span>{record.createdAtLabel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-[12px] font-medium text-foreground">
                        生成文件列表
                      </p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {record.status === "pending"
                          ? "加载中..."
                          : `已生成 ${record.generatedFileCount} 个文件`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          {architectureImmersiveMode &&
          showImmersiveReferenceCard &&
          latestCanvasReferenceAttachment &&
          immersiveRecords.length === 0 ? (
            <div
              className="rounded-[10px] border border-slate-200 bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
              data-testid="chat-sidebar-record-card"
            >
              <div className="flex gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[10px] border border-slate-200 bg-slate-100">
                  {latestCanvasReferenceAttachment.url ? (
                    <img
                      alt={latestCanvasReferenceAttachment.name ?? "画布参考图"}
                      className="h-full w-full object-cover"
                      src={latestCanvasReferenceAttachment.url}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
                      参考图
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {latestCanvasReferenceAttachment.name ?? "画布参考图"}
                    </p>
                    {effectiveConversationRefs.length > 1 ? (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        共 {effectiveConversationRefs.length} 张
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyImmersiveRecordDraft("night")}
                      className="rounded-[10px] border border-slate-200 bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      改为夜景
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyImmersiveRecordDraft("redescribe")
                      }
                      className="rounded-[10px] border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-foreground transition-colors hover:bg-slate-100"
                    >
                      重新描述
                    </button>
                  </div>
                  <p className="mt-3 text-[12px] text-muted-foreground">
                    图片生成：Banana Pro
                  </p>
                </div>
              </div>

              {immersiveGeneratedFileCount === 0 ? (
                <div className="mt-3 rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[12px] font-medium text-foreground">
                    生成文件列表
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    加载中...
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          {latestAgentPlanBlock && (
            <AgentPlanPanel
              block={latestAgentPlanBlock}
              disabled={streaming}
              onInterrupt={handleInterruptPlan}
              onResume={handleResumePlan}
              onRetry={handleRetryPlan}
            />
          )}
          {sessionsLoading || messagesLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
            </div>
          ) : transcriptMessages.length === 0 &&
            !latestAgentPlanBlock &&
            !latestCanvasReferenceAttachment ? (
            architectureImmersiveMode ? (
              <ImmersiveWelcomeState />
            ) : (
              <ChatSkills onSend={handleSend} />
            )
          ) : (
            transcriptMessages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                contentBlocks={msg.contentBlocks}
                isStreaming={
                  streaming &&
                  msg.role === "assistant" &&
                  msg === transcriptMessages[transcriptMessages.length - 1]
                }
              />
            ))
          )}
              <div ref={messagesEndRef} />
            </div>
          </ErrorBoundary>
          {/* Input */}
        <div
          data-testid={immersive ? "chat-sidebar-docked-composer" : undefined}
          data-composer-placement={immersive ? "panel-bottom" : undefined}
        >
          {composerContent}
        </div>
        {showingImmersiveFilePanel && generatedFilesApi ? (
          <CanvasFilesPanel
            excalidrawApi={generatedFilesApi}
            open
            onClose={handleCloseImmersiveFilePanel}
            variant="docked"
          />
        ) : null}
      </>
    </>
  );

  const creditDialogEl = creditDialog && (
    <CreditInsufficientDialog
      open={creditDialog.open}
      onClose={() => setCreditDialog(null)}
      currentBalance={creditDialog.currentBalance}
      requiredAmount={creditDialog.requiredAmount}
      plan={creditDialog.plan}
      dailyClaimed={creditDialog.dailyClaimed}
      onClaimDaily={async () => {
        await claimDailyCredits(accessTokenRef.current);
      }}
    />
  );

  // 鈹€鈹€ Mobile / Tablet: full-screen overlay with backdrop 鈹€鈹€
  if (isOverlay) {
    return (
      <>
        {/* Semi-transparent backdrop, click to close */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- backdrop is a non-interactive dismissal layer, keyboard close is handled via Escape */}
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={onToggle}
        />
        {/* Chat panel: full screen on mobile, fixed-width drawer on tablet */}
        <div
          className={
            breakpoint === "mobile"
              ? "fixed inset-0 z-50 flex flex-col bg-card animate-in slide-in-from-right duration-250"
              : "fixed inset-y-0 right-0 z-50 flex w-[400px] flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-250"
          }
          data-layout="overlay"
          data-testid="chat-sidebar-panel"
          {...eventIsolationProps}
        >
          {panelContent}
        </div>
        {creditDialogEl}
      </>
    );
  }

  if (immersive) {
    return (
      <>
        <div
          className="absolute inset-y-4 right-4 z-30 flex w-[min(420px,calc(100vw-2rem))] max-w-[420px] flex-col overflow-hidden rounded-[10px] border border-border/80 bg-card/92 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl"
          data-layout="immersive"
          data-testid="chat-sidebar-panel"
          {...eventIsolationProps}
        >
          {panelContent}
        </div>
        {creditDialogEl}
      </>
    );
  }

  // 鈹€鈹€ Desktop: inline side-by-side with resize handle 鈹€鈹€
  return (
    <div
      className="flex h-full shrink-0"
      data-layout="inline"
      data-testid="chat-sidebar-panel"
      style={{ width: sidebarWidth }}
      {...eventIsolationProps}
    >
      {/* Resize handle -- supports mouse, touch, and keyboard (ArrowLeft/ArrowRight) */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="\u8c03\u6574\u5bf9\u8bdd\u9762\u677f"
        aria-valuenow={sidebarWidth}
        aria-valuemin={SIDEBAR_MIN}
        aria-valuemax={SIDEBAR_MAX}
        tabIndex={0}
        className="w-2 shrink-0 cursor-col-resize bg-gradient-to-r from-transparent via-border to-transparent shadow-[1px_0_10px_rgba(15,23,42,0.06)] transition-all hover:via-muted-foreground/40 hover:shadow-[1px_0_14px_rgba(15,23,42,0.1)] active:via-muted-foreground/60 active:shadow-[1px_0_16px_rgba(15,23,42,0.14)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onKeyDown={handleResizeKeyDown}
      />
      <div className="flex flex-1 flex-col bg-card min-w-0">
        {panelContent}
      </div>
      {creditDialogEl}
    </div>
  );
}
