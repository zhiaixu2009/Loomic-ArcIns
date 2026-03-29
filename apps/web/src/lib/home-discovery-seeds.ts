export type HomeDiscoveryCase = {
  id: string;
  title: string;
  coverImageUrl: string;
  authorName: string;
  authorAvatarUrl: string;
  viewCount: number;
  likeCount: number;
  prompt: string;
  sourceUrl?: string;
};

export type HomeDiscoveryCategory = {
  key: string;
  label: string;
  cases: HomeDiscoveryCase[];
};

export type HomeDiscoverySelection = HomeDiscoveryCase & {
  categoryKey: string;
  categoryLabel: string;
};

function createCase(
  id: string,
  title: string,
  coverImageUrl: string,
  authorName: string,
  authorAvatarUrl: string,
  viewCount: number,
  likeCount: number,
  prompt: string,
  sourceUrl?: string,
): HomeDiscoveryCase {
  return {
    id,
    title,
    coverImageUrl,
    authorName,
    authorAvatarUrl,
    viewCount,
    likeCount,
    prompt,
    ...(sourceUrl ? { sourceUrl } : {}),
  };
}

function createCategory(
  key: string,
  label: string,
  cases: HomeDiscoveryCase[],
): HomeDiscoveryCategory {
  return { key, label, cases };
}

/**
 * Discovery seeds mirrored from Lovart's lower "灵感发现" section.
 * Each category intentionally starts with one case so the team can replace
 * content later from Supabase without touching the UI layer.
 */
export const homeDiscoverySeedCategories: HomeDiscoveryCategory[] = [
  createCategory("branding-design", "品牌设计", [
    createCase(
      "ji5ey5l",
      "The ART & Cultural Arts Center",
      "https://assets-persist.lovart.ai/agent_images/55fcd1f7-b572-48c9-812c-5be80a2d2f8f.png?x-oss-process=image/resize,w_600,m_lfit/format,webp",
      "Ken Allman",
      "https://lh3.googleusercontent.com/a/ACg8ocJ0nBUJkE5T9tLTwRlVXScB576EqOEeRS-6__BLxjYxrO5Jtxjjig=s96-c",
      549,
      7,
      "请基于 ART & Cultural Arts Center 这个灵感方向，为我做一套文化艺术中心品牌探索。输出品牌关键词、主视觉方向、海报延展和社交媒体视觉提案，整体气质要现代、文化感强、适合艺术活动传播。",
      "https://www.lovart.ai/case/ji5ey5l",
    ),
  ]),
  createCategory("poster-and-ads", "海报与广告", [
    createCase(
      "n9d21de",
      "Vintage Car Poster",
      "https://models-online-persist.shakker.cloud/agent_images/15df2e11-acaa-4c6b-8911-b86c21559be6.png?x-oss-process=image/resize,w_600,m_lfit/format,webp",
      "DynamicWang",
      "https://models-online-persist.shakker.cloud/img/bb2b0c0b2fe44e8f9d5202df0d95bd5d/b54986892aec2756b1f5b43a99c897d58b6bee3413217b303a7a5c6e00584137.jpg?x-oss-process=image/resize,w_128,m_lfit/format,webp",
      359919,
      286,
      "围绕 Vintage Car Poster 这个方向，帮我设计一组复古汽车主题海报。需要包含主海报、社交媒体方图版本和标题排版建议，整体风格偏复古、胶片感、适合活动宣传。",
      "https://www.lovart.ai/case/n9d21de",
    ),
  ]),
  createCategory("illustration", "插画", [
    createCase(
      "bjde0nh",
      "Cat Tarot Cards",
      "https://assets-persist.lovart.ai/web/model/a8b5877adfd242b3b0d6b4203125e50c/050db5819beb029f77ca7380a00f49dafcfc368e848e4052adecccf9ab8737f9.png?x-oss-process=image/resize,w_600,m_lfit/format,webp",
      "yongning zhang",
      "https://lh3.googleusercontent.com/a/ACg8ocJmrFqgeeWLGoLgbcmBdRRlSB56aqHJ_2i3-HJ34RGhbC3zyA=s96-c",
      2054,
      116,
      "参考 Cat Tarot Cards 这个主题，帮我扩展一套猫咪塔罗风格插画系列。请给出角色设定、牌面视觉语言、配色建议和可延展的周边方向。",
      "https://www.lovart.ai/case/bjde0nh",
    ),
  ]),
  createCategory("ui-design", "UI设计", [
    createCase(
      "tl8zzk0",
      "Fallout-themed cake shop website.",
      "https://assets-persist.lovart.ai/agent_images/43d0317c-18a3-4d90-bcd3-099c7dc05eae.png?x-oss-process=image/resize,w_600,m_lfit/format,webp",
      "PepeThunter",
      "https://models-online-persist.shakker.cloud/img/9a4fde49d83f43c8a0f93045600e5db0/52bfad25929a7e44f869d318b39a0e7f4c0ff6e897d8fbafc8bd6e68899a8c63.png?x-oss-process=image/resize,w_128,m_lfit/format,webp",
      4338,
      192,
      "以 Fallout-themed cake shop website 为灵感，帮我设计一个末日废土风蛋糕店官网。输出首页信息架构、首屏视觉、商品卡片样式和核心配色建议。",
      "https://www.lovart.ai/case/tl8zzk0",
    ),
  ]),
  createCategory("character-design", "角色设计", [
    createCase(
      "fbn3mss",
      "My Creepy Clown Avatar in Abandoned Circus Park",
      "https://assets-persist.lovart.ai/agent_images/4dd9198b-475a-4ecf-9ade-d42c0edee086.png?x-oss-process=image/resize,w_600,m_lfit/format,webp",
      "kanako",
      "https://assets-persist.lovart.ai/img/2287b2a1c87242e3ada08b11a389df7f/9380511dee374b4da4f7405c0c8332a758c81312.jpg?x-oss-process=image/resize,w_128,m_lfit/format,webp",
      749,
      12,
      "请围绕 My Creepy Clown Avatar in Abandoned Circus Park 这个概念，帮我做一套诡异马戏团角色设计。包含角色设定、表情变化、服装元素和场景氛围建议。",
      "https://www.lovart.ai/case/fbn3mss",
    ),
  ]),
  createCategory("storyboard-video", "影片与分镜", [
    createCase(
      "ikqo02k",
      "Mixtapes Emotions !",
      "https://assets-persist.lovart.ai/sd-images/de28e4fed419f0e733f8335c4957552da1602913e46f909dcd35406396e1f0e2.png?x-oss-process=image/resize,w_600,m_lfit/format,webp",
      "Sheetal Shinde",
      "https://lh3.googleusercontent.com/a/ACg8ocKvZHFCRHCxEHwy355WY5QXLgLjr9sA9PXArwZ9oKZrPQSf_wl9dA=s96-c",
      3057,
      49,
      "基于 Mixtapes Emotions 这个方向，帮我做一组音乐情绪短片分镜。需要拆出镜头节奏、情绪转场、标题卡和视觉风格建议，适合做 15 到 30 秒的短视频。",
      "https://www.lovart.ai/case/ikqo02k",
    ),
  ]),
  createCategory("product-design", "产品设计", [
    createCase(
      "a4ncmvb",
      "Product Visualization - Robot Hand ",
      "https://assets-persist.lovart.ai/agent_images/f3f3696e-a112-4765-b2bd-bd32c511e36c.png?x-oss-process=image/resize,w_600,m_lfit/format,webp",
      "Product Visualization - Robot Hand",
      "https://assets-temp.lovart.ai/img/0e561df934f54a708780650b7659dc58/da0f1f755ba349c9330095072d41091bb81eff30accd1c73ea75109057641f54.png?x-oss-process=image/resize,w_128,m_lfit/format,webp",
      769,
      27,
      "围绕 Product Visualization - Robot Hand 这个概念，帮我设计一组未来感机械手产品视觉。请给出产品卖点表达、主视觉构图、材质方向和电商展示图思路。",
      "https://www.lovart.ai/case/a4ncmvb",
    ),
  ]),
  createCategory("architecture-design", "建筑设计", [
    createCase(
      "ng716s0",
      "Building a new website and learning how to AI",
      "https://assets-persist.lovart.ai/agent_images/d04e7b1a-ff77-498b-8193-2cdf76b0c25d.png?x-oss-process=image/resize,w_600,m_lfit/format,webp",
      "Paul Barnett",
      "https://lh3.googleusercontent.com/a/ACg8ocLwTYoxBL0fMU5W0MF90Yqvf1WS6BguLyiEwLfntALYFu9napkz=s96-c",
      1453,
      24,
      "请以 Building a new website and learning how to AI 为起点，帮我设计一个面向建筑工作室的网站概念。输出网站结构、首页视觉、项目展示模块和整体建筑感风格建议。",
      "https://www.lovart.ai/case/ng716s0",
    ),
  ]),
];
