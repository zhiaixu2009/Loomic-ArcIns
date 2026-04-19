import type { ReadyAttachment } from "../hooks/use-image-attachments";
import type { ArchitectureBoardKind, ArchitectureContext } from "./architecture-canvas";
import type { CanvasSelectedElement } from "../components/canvas-editor";
import { TEMPLATE_RECOMMENDED_IMAGE_MODEL_ID } from "./image-model-utils";

export type ArchitecturePromptTemplate = {
  id: string;
  label: string;
  prompt: string;
  recommendedImageModelId?: string;
  coverImageUrl?: string;
  outputImageUrl?: string | null;
  previewImageUrls?: string[];
  referenceImageUrls?: string[];
  topCategoryKey?: string;
  topCategoryLabel?: string;
  leafCategoryKey?: string;
  leafCategoryLabel?: string;
};

export type ArchitecturePromptTemplateCategory = {
  id: string;
  label: string;
  templates: ArchitecturePromptTemplate[];
};

export type ArchitecturePromptTemplateSuggestion = ArchitecturePromptTemplate & {
  categoryId?: string;
  categoryLabel?: string;
};

export const ARCHITECTURE_PROMPT_TEMPLATE_CATEGORIES: ArchitecturePromptTemplateCategory[] = [
  {
    id: "render",
    label: "效果渲染",
    templates: [
      {
        id: "render-architecture-day",
        label: "建筑晴天渲染",
        prompt:
          "请基于当前建筑方案生成一张建筑晴天渲染图，强化立面层次、入口识别与真实材质表现。",
      },
      {
        id: "render-birdview-day",
        label: "鸟瞰晴天渲染",
        prompt:
          "请以鸟瞰视角生成当前建筑方案的晴天渲染图，突出总体布局、场地关系与交通组织。",
      },
    ],
  },
  {
    id: "site-color",
    label: "总平填色",
    templates: [
      {
        id: "site-color-fresh",
        label: "建筑平面清新填色",
        prompt:
          "请基于当前总平图进行建筑平面清新填色，明确道路、绿地、水体、建筑与铺装层次。",
      },
      {
        id: "site-color-realistic",
        label: "建筑平面写实填色",
        prompt:
          "请对当前建筑总平图进行写实填色，增强地面材质、绿化层次与场地氛围。",
      },
    ],
  },
  {
    id: "unit-color",
    label: "户型填色",
    templates: [
      {
        id: "unit-color-1",
        label: "室内平面填色1",
        prompt:
          "请对当前室内平面图进行清晰填色，区分功能分区、动线关系、家具布置与材质层次。",
      },
    ],
  },
  {
    id: "style-transfer",
    label: "风格迁移",
    templates: [
      {
        id: "style-transfer-building-1",
        label: "建筑效果迁移1",
        prompt:
          "请基于当前参考图进行建筑风格迁移，保留主体体量与视角关系，替换为新的立面语言与材料风格。",
      },
    ],
  },
  {
    id: "section-elevation",
    label: "剖立面",
    templates: [
      {
        id: "section-elevation-realistic",
        label: "立面真实风格",
        prompt:
          "请基于当前立面或剖面图输出一版真实风格表达，增强材质、阴影与细部层次。",
      },
    ],
  },
  {
    id: "analysis",
    label: "分析图",
    templates: [
      {
        id: "analysis-site-existing",
        label: "基地现状分析",
        prompt:
          "请基于当前场地现状资料，整理基地边界、周边关系、交通动线、视线资源与场地限制，输出一份可直接进入无限画布的现状分析提示。",
      },
    ],
  },
  {
    id: "board-generation",
    label: "展板生成",
    templates: [
      {
        id: "board-generation-landscape",
        label: "景观展板生成",
        prompt:
          "请基于当前景观方案与已有素材生成一版景观汇报展板，整理标题层级、主图次图与分析信息排布。",
      },
    ],
  },
  {
    id: "concept-idea",
    label: "灵感方案",
    templates: [
      {
        id: "concept-idea-building",
        label: "建筑设计灵感",
        prompt:
          "请围绕当前项目定位输出一组建筑设计灵感方向，分别说明形体语言、立面策略与场所气质。",
      },
    ],
  },
  {
    id: "mood-conversion",
    label: "氛围转换",
    templates: [
      {
        id: "mood-conversion-night",
        label: "夜晚时间转换",
        prompt:
          "请在保持当前建筑构图与主体关系的前提下，将画面转换为夜晚氛围并强化灯光与场景情绪。",
      },
    ],
  },
  {
    id: "painting-style",
    label: "画风转换",
    templates: [
      {
        id: "painting-style-fresh",
        label: "小清新插画转换",
        prompt:
          "请将当前建筑或景观画面转换为小清新插画风格，保留构图关系并增强色彩统一性。",
      },
    ],
  },
  {
    id: "view-conversion",
    label: "视角转换",
    templates: [
      {
        id: "view-conversion-plan-to-birdview",
        label: "平面图转鸟瞰图",
        prompt:
          "请基于当前平面图生成对应的鸟瞰视角效果图，保留总体布局逻辑并补全空间层次与环境细节。",
      },
    ],
  },
  {
    id: "scheme-design",
    label: "方案设计",
    templates: [
      {
        id: "scheme-design-empty-site",
        label: "空白地块生成景观方案",
        prompt:
          "请基于当前空白地块条件生成一版景观方案概念图，明确主题结构、功能分区、景观节点与游线逻辑。",
      },
    ],
  },
  {
    id: "renovation",
    label: "旧房改造",
    templates: [
      {
        id: "renovation-facade",
        label: "建筑立面改造",
        prompt:
          "请基于当前既有建筑立面生成改造方案，保留原有结构关系并更新材质、开窗节奏与整体气质。",
      },
    ],
  },
  {
    id: "interior-design",
    label: "室内装修",
    templates: [
      {
        id: "interior-design-cream",
        label: "现代奶油室内装修",
        prompt:
          "请把当前室内空间转为现代奶油风格装修方案，突出柔和材质、光影氛围与生活化陈设。",
      },
    ],
  },
  {
    id: "partial-edit",
    label: "局部修改",
    templates: [
      {
        id: "partial-edit-envelope",
        label: "建筑表皮修改",
        prompt:
          "请仅针对当前建筑表皮进行局部修改，保留体量与视角不变，优化材质、开窗节奏和细部层次。",
      },
    ],
  },
  {
    id: "storyboard",
    label: "分镜图",
    templates: [
      {
        id: "storyboard-interior",
        label: "室内分镜图生成",
        prompt:
          "请围绕当前室内空间生成一组分镜图提示，包含镜头顺序、机位关系、重点空间与叙事节奏说明。",
      },
    ],
  },
];

export function flattenArchitecturePromptTemplates(
  categories: ArchitecturePromptTemplateCategory[] = ARCHITECTURE_PROMPT_TEMPLATE_CATEGORIES,
): ArchitecturePromptTemplateSuggestion[] {
  return categories.flatMap((category) =>
    category.templates.map((template) => ({
      ...template,
      categoryId: category.id,
      categoryLabel: category.label,
      recommendedImageModelId:
        template.recommendedImageModelId ?? TEMPLATE_RECOMMENDED_IMAGE_MODEL_ID,
    })),
  );
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
  suggestions: ArchitecturePromptTemplateSuggestion[],
): ArchitecturePromptTemplateSuggestion[] {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    categoryId: category.id,
    categoryLabel: category.label,
    recommendedImageModelId:
      suggestion.recommendedImageModelId ?? TEMPLATE_RECOMMENDED_IMAGE_MODEL_ID,
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

function templateSuggestionsByBoard(
  boardKind: ArchitectureBoardKind,
  referenceImageCount: number,
): ArchitecturePromptTemplateSuggestion[] {
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

export function buildArchitectureTemplateSuggestions(args: {
  architectureContext?: ArchitectureContext | null;
  attachments?: ReadyAttachment[];
  selectedCanvasElements?: CanvasSelectedElement[];
}): ArchitecturePromptTemplateSuggestion[] {
  const { architectureContext, attachments, selectedCanvasElements } = args;
  if (!architectureContext) {
    return [];
  }

  const referenceImageKeys = new Set<string>();
  for (const element of selectedCanvasElements ?? []) {
    if (isCanvasImageSelection(element)) {
      referenceImageKeys.add(`canvas:${element.id}`);
    }
  }

  for (const attachment of attachments ?? []) {
    if (!attachment.mimeType.startsWith("image/")) {
      continue;
    }

    referenceImageKeys.add(
      attachment.source === "canvas-ref"
        ? `canvas:${attachment.assetId || attachment.url}`
        : attachment.assetId
          ? `attachment:${attachment.assetId}`
          : `attachment:${attachment.url}`,
    );
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
