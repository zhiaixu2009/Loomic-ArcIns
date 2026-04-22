export type OfficialGalleryItem = {
  id: string;
  label: string;
  url: string;
  width: number;
  height: number;
};

export type OfficialGallerySubtype = {
  id: string;
  label: string;
  items: OfficialGalleryItem[];
};

export type OfficialGalleryCategory = {
  id: string;
  label: string;
  subtypes: OfficialGallerySubtype[];
};

const localGalleryFiles = {
  architectureDefault1: "/official-gallery/architecture-default-1.png",
  architectureDefault2: "/official-gallery/architecture-default-2.png",
  architectureDefault3: "/official-gallery/architecture-default-3.png",
  architectureDefault4: "/official-gallery/architecture-default-4.png",
  architectureVilla1: "/official-gallery/architecture-villa-1.png",
  architectureVilla2: "/official-gallery/architecture-villa-2.png",
} as const;

const defaultDimensions = {
  width: 1600,
  height: 900,
} as const;

function buildItem(
  id: string,
  label: string,
  url: string,
): OfficialGalleryItem {
  return {
    id,
    label,
    url,
    ...defaultDimensions,
  };
}

export const officialGallerySeedLibrary: OfficialGalleryCategory[] = [
  {
    id: "architecture-render",
    label: "建筑效果图",
    subtypes: [
      {
        id: "default",
        label: "默认",
        items: [
          buildItem(
            "architecture-default-1",
            "建筑效果图 默认 1",
            localGalleryFiles.architectureDefault1,
          ),
          buildItem(
            "architecture-default-2",
            "建筑效果图 默认 2",
            localGalleryFiles.architectureDefault2,
          ),
          buildItem(
            "architecture-default-3",
            "建筑效果图 默认 3",
            localGalleryFiles.architectureDefault3,
          ),
          buildItem(
            "architecture-default-4",
            "建筑效果图 默认 4",
            localGalleryFiles.architectureDefault4,
          ),
        ],
      },
      {
        id: "villa",
        label: "别墅",
        items: [
          buildItem(
            "architecture-villa-1",
            "建筑效果图 别墅 1",
            localGalleryFiles.architectureVilla1,
          ),
          buildItem(
            "architecture-villa-2",
            "建筑效果图 别墅 2",
            localGalleryFiles.architectureVilla2,
          ),
        ],
      },
      {
        id: "office-building",
        label: "办公楼",
        items: [
          buildItem(
            "architecture-office-building-1",
            "建筑效果图 办公楼 1",
            localGalleryFiles.architectureDefault2,
          ),
          buildItem(
            "architecture-office-building-2",
            "建筑效果图 办公楼 2",
            localGalleryFiles.architectureDefault4,
          ),
        ],
      },
      {
        id: "school",
        label: "学校",
        items: [
          buildItem(
            "architecture-school-1",
            "建筑效果图 学校 1",
            localGalleryFiles.architectureDefault1,
          ),
          buildItem(
            "architecture-school-2",
            "建筑效果图 学校 2",
            localGalleryFiles.architectureVilla1,
          ),
        ],
      },
      {
        id: "hospital",
        label: "医院",
        items: [
          buildItem(
            "architecture-hospital-1",
            "建筑效果图 医院 1",
            localGalleryFiles.architectureDefault3,
          ),
          buildItem(
            "architecture-hospital-2",
            "建筑效果图 医院 2",
            localGalleryFiles.architectureVilla2,
          ),
        ],
      },
    ],
  },
  {
    id: "interior-render",
    label: "室内效果图",
    subtypes: [
      {
        id: "default",
        label: "默认",
        items: [
          buildItem(
            "interior-default-1",
            "室内效果图 默认 1",
            localGalleryFiles.architectureDefault1,
          ),
          buildItem(
            "interior-default-2",
            "室内效果图 默认 2",
            localGalleryFiles.architectureDefault2,
          ),
        ],
      },
    ],
  },
  {
    id: "landscape-render",
    label: "景观效果图",
    subtypes: [
      {
        id: "default",
        label: "默认",
        items: [
          buildItem(
            "landscape-default-1",
            "景观效果图 默认 1",
            localGalleryFiles.architectureDefault3,
          ),
          buildItem(
            "landscape-default-2",
            "景观效果图 默认 2",
            localGalleryFiles.architectureVilla1,
          ),
        ],
      },
    ],
  },
  {
    id: "urban-render",
    label: "城市效果图",
    subtypes: [
      {
        id: "default",
        label: "默认",
        items: [
          buildItem(
            "urban-default-1",
            "城市效果图 默认 1",
            localGalleryFiles.architectureDefault4,
          ),
          buildItem(
            "urban-default-2",
            "城市效果图 默认 2",
            localGalleryFiles.architectureVilla2,
          ),
        ],
      },
    ],
  },
  {
    id: "color-plan",
    label: "彩平参考图",
    subtypes: [
      {
        id: "default",
        label: "默认",
        items: [
          buildItem(
            "color-plan-default-1",
            "彩平参考图 默认 1",
            localGalleryFiles.architectureDefault1,
          ),
          buildItem(
            "color-plan-default-2",
            "彩平参考图 默认 2",
            localGalleryFiles.architectureDefault3,
          ),
        ],
      },
    ],
  },
  {
    id: "collage-render",
    label: "拼贴效果图",
    subtypes: [
      {
        id: "default",
        label: "默认",
        items: [
          buildItem(
            "collage-default-1",
            "拼贴效果图 默认 1",
            localGalleryFiles.architectureDefault2,
          ),
          buildItem(
            "collage-default-2",
            "拼贴效果图 默认 2",
            localGalleryFiles.architectureVilla1,
          ),
        ],
      },
    ],
  },
  {
    id: "illustration-render",
    label: "插画效果图",
    subtypes: [
      {
        id: "default",
        label: "默认",
        items: [
          buildItem(
            "illustration-default-1",
            "插画效果图 默认 1",
            localGalleryFiles.architectureDefault4,
          ),
          buildItem(
            "illustration-default-2",
            "插画效果图 默认 2",
            localGalleryFiles.architectureVilla2,
          ),
        ],
      },
    ],
  },
  {
    id: "competition-render",
    label: "竞赛效果图",
    subtypes: [
      {
        id: "default",
        label: "默认",
        items: [
          buildItem(
            "competition-default-1",
            "竞赛效果图 默认 1",
            localGalleryFiles.architectureDefault1,
          ),
          buildItem(
            "competition-default-2",
            "竞赛效果图 默认 2",
            localGalleryFiles.architectureVilla1,
          ),
        ],
      },
    ],
  },
  {
    id: "night-render",
    label: "夜景效果图",
    subtypes: [
      {
        id: "default",
        label: "默认",
        items: [
          buildItem(
            "night-default-1",
            "夜景效果图 默认 1",
            localGalleryFiles.architectureDefault2,
          ),
          buildItem(
            "night-default-2",
            "夜景效果图 默认 2",
            localGalleryFiles.architectureVilla2,
          ),
        ],
      },
    ],
  },
  {
    id: "plan-section-reference",
    label: "平立剖参考",
    subtypes: [
      {
        id: "default",
        label: "默认",
        items: [
          buildItem(
            "plan-section-default-1",
            "平立剖参考 默认 1",
            localGalleryFiles.architectureDefault3,
          ),
          buildItem(
            "plan-section-default-2",
            "平立剖参考 默认 2",
            localGalleryFiles.architectureDefault4,
          ),
        ],
      },
    ],
  },
  {
    id: "interior-plan",
    label: "室内平面图",
    subtypes: [
      {
        id: "default",
        label: "默认",
        items: [
          buildItem(
            "interior-plan-default-1",
            "室内平面图 默认 1",
            localGalleryFiles.architectureDefault1,
          ),
          buildItem(
            "interior-plan-default-2",
            "室内平面图 默认 2",
            localGalleryFiles.architectureDefault2,
          ),
        ],
      },
    ],
  },
];
