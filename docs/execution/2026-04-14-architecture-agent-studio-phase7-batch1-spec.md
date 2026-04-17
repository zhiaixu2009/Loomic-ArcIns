# Phase 7 Batch 1 Spec: Lovart Home + Immersive Canvas Shell

## Goal

在现有 Loomic Architecture Studio 上落地第一批高置信度改造，使产品从“已有建筑工作台功能集合”过渡到“更接近 Lovart 的沉浸式入口 + 更接近建筑学长的右侧创作路径”：

1. 登录后首页改造成 Lovart 风格的创作优先入口。
2. Canvas 改造成无常驻左侧导航的沉浸式工作台壳层。
3. 右侧智能体输入保留并强化建筑学长式的参考图上下文、模板注入与中文提示链路。
4. 本批所有触达界面优先去英文化。

## Why This Slice

用户当前反馈集中在两个最直接影响产品感知的问题：

- 首页仍然像传统工作区，而不是一个高集中度的 AI 创作入口。
- Canvas 虽然已经接近三栏工作台，但整体沉浸感、文案和操作重心仍未对齐 Lovart / 建筑学长。

与其一次性把右键系统、多图成组、全量素材弹窗、完整历史文件系统全部打穿，不如先交付最能改变体验基调的第一批壳层重构：

- 首页入口
- Canvas 外壳
- 右侧输入的核心状态联动
- 中文文案一致性

这样可以在保持当前脏工作区可控的前提下，尽快把产品主观感受拉到正确方向。

## Reference Mapping

### Lovart 负责的部分

- 登录后首页的信息层级和视觉节奏：
  - 薄而轻的顶部导航
  - 全屏感英雄区
  - 创作入口优先于复杂导航
  - 项目延续与灵感内容作为次级层
- Canvas 的沉浸式气质：
  - 无传统产品左侧导航
  - 画布是唯一主舞台
  - 工具以浮层或悬浮条方式存在

### 建筑学长负责的部分

- 右侧智能体输入路径：
  - prompt 输入为工作流中心
  - 模型/模板/分辨率等配置围绕输入区组织
  - 选中参考图后，输入区语义发生变化
- 建筑领域模板建议：
  - 场地分析
  - 体量推演
  - 立面气质
  - 镜头脚本
  - 评审清单

## In Scope

### 1. 首页壳层重构

- 登录后 `/home` 不再使用现有工作区左侧导航栏。
- 首页第一屏采用深色、集中式、创作优先的布局。
- 保留并重排现有能力：
  - `HomePrompt`
  - 最近项目
  - 示例库 / 灵感内容
- 新首页必须能直接进入：
  - 建筑工作台
  - 空白项目
  - 最近项目继续创作

### 2. Canvas 沉浸式壳层

- `/canvas` 不再依赖工作区左侧导航栏。
- 保留现有画布、底部工具条、右侧智能体面板。
- 建筑上下文不再通过常驻左侧 architecture rail 表达，而是改为：
  - 顶部悬浮信息条
  - 右侧智能体快捷动作
  - 按需打开的图层/文件抽屉

### 3. 右侧输入框基础对齐

- 已选参考图必须可见为持久上下文，不是瞬时状态提示。
- 模板按钮需要与建筑板块/参考图数量联动。
- 选区为空、单图、多图、已发送到对话后的 placeholder 与提示文案必须清晰区分。

### 4. 去英文化 Batch 1

- 本批所有新增或重构区域默认中文优先。
- 首页、Canvas 顶栏、右侧输入、会话入口中出现的默认英文值需要继续清理。

## Out Of Scope

- 画布右键菜单系统的完整复刻。
- 多图成组 / 合并 / 拆组的完整行为树。
- 建筑学长“添加素材”大弹窗的全量来源与全量分页逻辑。
- 右侧“创作记录 / 生成文件列表”的完整业务重建。
- Lovart 登录态内部项目页面的深度逆向。

这些能力继续保留在后续批次，避免本批写入集合过大。

## Frozen UX Contract

### Home

- `/home` 使用自定义页面内顶部导航，而不是 `AppSidebar`。
- 第一屏必须同时包含：
  - 品牌
  - 创作定位文案
  - 主创作输入区
  - 进入建筑工作台 CTA
  - 新建空白项目 CTA
- 最近项目紧跟第一屏之后，保证“继续创作”是近距离操作。
- 示例库与灵感内容降为首页后半段内容，不抢第一屏主线。

### Canvas

- `/canvas` 不显示 `AppSidebar`。
- 画布左侧不显示常驻 architecture rail。
- 顶部仅保留轻量悬浮信息群：
  - Logo / 菜单
  - 项目名
  - 品牌套件
  - 建筑工作台快捷控制
  - 右上角积分入口
- 图层 / 文件面板只允许按需打开，不作为默认持续占位区。

### Right Agent Input

- 选中图片时显示“已关联参考图”上下文块。
- 多图时提供整组发送与多图模板动作。
- 已发送到对话后的输入框仍保持参考图语义，而不是退回默认 placeholder。
- 所有新文案统一中文。

## Verification

### Static

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/home-page-shell.test.tsx test/chat-input.test.tsx test/chat-sidebar.test.tsx test/architecture-studio-shell.test.tsx --reporter=dot"
```

### Runtime

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && docker compose -f docker-compose.local.yml --env-file /mnt/d/97-CodingProject/Loomic-ArcIns/.tmp/loomic-local.env up -d --no-deps web"
curl -I http://127.0.0.1:3000/home
curl -I "http://127.0.0.1:3000/canvas?id=85f737fe-388b-4a42-97df-4ed0e798f609&studio=architecture"
```

### Browser Acceptance

至少确认以下结果：

1. `/home` 不再出现工作区左侧导航栏。
2. `/home` 第一屏为深色创作优先结构。
3. `/canvas` 不再出现常驻左侧导航栏或旧 architecture rail。
4. 右侧输入区在单图 / 多图 / 已发送参考图三种状态下的文案与模板动作正确。
