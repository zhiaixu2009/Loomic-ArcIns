# Phase 7 Batch 2 Spec: Canvas Context Actions + Selection-Driven Agent Flow

## Goal

在已经完成的 Batch 1 沉浸式画布壳层之上，落地建筑学长式画布原子交互的第一批可用版本：

1. 支持画布空白处与选区状态下的右键动作层。
2. 支持多图选区的批量动作与成组。
3. 支持“选中已有图片后，根据模板生成”的右侧输入框联动。
4. 所有新增交互继续保持中文优先。

## Why This Slice

用户已经明确指出，下一步最关键的不是继续改首页，而是把画布里的原子操作与右侧智能体逻辑真正连起来，尤其是：

- 空白处右键
- 图片右键
- 多图框选后的动作差异
- 这些动作如何改写右侧输入框

当前项目其实已经具备了一半基础：

- `selectedCanvasElements` 已经能区分单图、多图与其他对象
- `ChatSidebar` 已经有“发送到对话”与模板建议机制
- `ChatInput` 已经能展示参考图 chips、模板和占位文案

缺少的是中间的动作层与页面级联动。

## Reference Mapping

### 建筑学长提供的行为方向

- 画布操作不是孤立的绘图动作，而是会直接改写右侧智能体的输入语义。
- 选中单图、多图、空白画布时，下一步动作不同。
- 多图选区需要支持“整组处理”的概念，而不是仅仅单张发送。

### Loomic 当前可复用的能力

- 右侧 `ChatSidebar` 已可根据 `selectedCanvasElements` 自动推导模板建议。
- `handleAttachSelectedCanvasImages()` 已可把选中的画布图片转成对话参考图。
- Excalidraw 元素已带 `groupIds`，可以支撑第一版“成组”。

## In Scope

### 1. 画布右键动作层

- 在 `/canvas` 增加统一的右键菜单层。
- 根据当前上下文切换菜单模式：
  - 空白画布
  - 单张图片选区
  - 多张图片选区

### 2. 空白处右键

- 提供至少以下动作：
  - 上传参考图
  - 插入参考板
  - 铺开建筑板块
  - 打开智能体

### 3. 图片 / 多图右键

- 单图右键至少提供：
  - 发送至对话
  - 套用模板到右侧输入框
- 多图右键至少提供：
  - 整组发送至对话
  - 套用多图模板到右侧输入框
  - 成组选中图片

### 4. 右侧输入框联动

- 右键菜单触发的模板动作，必须自动：
  - 打开右侧智能体面板
  - 保留当前选图作为参考图上下文
  - 把对应模板 prompt 写入输入框
- 这条链路必须与现有 `ChatSidebar` / `ChatInput` 兼容。

## Out Of Scope

- 位图层面的图片物理合并。
- 右键菜单的全量图层管理、下载、查看大图复刻。
- 复杂群组嵌套、跨组编辑与历史回滚。
- 建筑学长右侧“创作记录 / 生成文件列表”的全量状态机。

## Frozen Interaction Contract

### Blank Canvas Context

- 用户在空白画布右键时，不进入绘图默认浏览器菜单，而是进入 Loomic 自定义动作层。
- 空白处动作以“插入 / 打开 / 上传”为主，不改写右侧输入框文案。

### Single Image Context

- 用户在已选中单图时右键，可直接把这张图作为参考图发送至对话。
- 用户也可以直接把一个模板 prompt 写入右侧输入框，形成“图生图 / 图引导生成”的起点。

### Multi-Image Context

- 多图时所有动作都应以“整组”表达，而不是逐张表达。
- “成组”是画布层面的组织动作。
- “整组发送至对话”和“套用多图模板”是智能体层面的动作。

### Composer Command Contract

- 页面层允许向 `ChatSidebar` 发送一次性 composer command：
  - `attach-selection`
  - `apply-template`
- `apply-template` 可以同时要求附带当前选图区图片。
- `ChatInput` 需要支持外部一次性注入 draft prompt。

## Verification

### Static

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/canvas-context-menu.test.tsx test/chat-input.test.tsx test/chat-sidebar.test.tsx test/architecture-studio-shell.test.tsx --reporter=dot"
```

### Runtime

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && docker compose -f docker-compose.local.yml --env-file /mnt/d/97-CodingProject/Loomic-ArcIns/.tmp/loomic-local.env up -d --no-deps web"
curl -I "http://127.0.0.1:3000/canvas?id=85f737fe-388b-4a42-97df-4ed0e798f609&studio=architecture"
```

### Browser Acceptance

至少确认以下结果：

1. 空白处右键出现 Loomic 自定义菜单。
2. 选中单图右键可直接把模板写入右侧输入框。
3. 多图右键可触发整组发送与成组动作。
4. 右侧输入框在右键动作后出现正确的参考图 chips 与模板文案。
