export type HomePromptTemplate = {
  id: string;
  label: string;
  prompt: string;
  recommendedImageModelId?: string;
};

export type HomePromptTemplateCategory = {
  id: string;
  label: string;
  templates: HomePromptTemplate[];
};

export const HOME_PROMPT_TEMPLATE_CATEGORIES: HomePromptTemplateCategory[] = [
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
