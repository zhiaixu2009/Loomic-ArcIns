# Phase 7 Batch 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把本地 `/home` 与 `/canvas` 收束到 2026-04-16 最终实站复核后的建筑学长基线，优先修正 4 个已经被真实网页证伪或确认的关键点：`新建项目` 先开 `添加项目` 弹窗、`图层` 按钮可打开左侧面板、`形状` flyout 带顶部样式条和 5 个按钮、`发送至对话` 不应在取消选中后保留持久附件态。

**Architecture:** 继续保持页面层分工清晰：`HomePage` 负责首页入口与新建项目弹窗；`useCreateProject` 负责项目创建和新项目初始化数据 handoff；`CanvasPage` 负责 `/canvas` 的壳层状态、图层面板、右键/工具菜单与导入桥接；`CanvasToolMenu` 只负责左侧工具轨与 `添加/形状/图层` 交互壳层；`ChatSidebar` 与 `ChatInput` 共同负责“选区 -> composer -> 本次发送”的临时上下文，而不是把 `发送至对话` 写成持久 `readyAttachments`。

**Tech Stack:** Next.js App Router、React、Tailwind、Excalidraw、Vitest、Playwright、WSL Docker

---

### Task 1: Freeze The Corrected Test Contract First

**Files:**
- Modify: `apps/web/test/chat-sidebar.test.tsx`
- Modify: `apps/web/test/canvas-page-shell.test.tsx`
- Modify: `apps/web/test/home-page-shell.test.tsx`
- Modify: `apps/web/test/use-create-project.test.tsx`

- [ ] **Step 1: 先把 `chat-sidebar` 里与实站冲突的旧断言改成红灯护栏**
  - `keeps canvas-reference mode after selected images are sent into the conversation`
  - `consumes an external attach-selection command and preserves the reference context`
  - 新预期：取消选中后，`已接入对话参考图...` placeholder 消失，`提炼多图共同语言` 也不再显示。
- [ ] **Step 2: 把 `canvas-page-shell` 从“图层不存在”改成“图层默认收起，但入口存在且能打开左侧面板”**
- [ ] **Step 3: 为 `/home` 新增红灯护栏，约束点击第一张 `新建项目` 卡片先打开 `添加项目` 弹窗，而不是直接调用创建逻辑**
- [ ] **Step 4: 为 `useCreateProject` 新增红灯护栏，约束它支持自定义项目名，并为后续新项目初始化数据 handoff 预留入口**
- [ ] **Step 5: 运行定向测试，确认这些用例先红后绿，而不是继续被旧行为误导**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/chat-sidebar.test.tsx test/canvas-page-shell.test.tsx test/home-page-shell.test.tsx test/use-create-project.test.tsx --reporter=dot --pool forks"
```

Expected: 旧的“持久附件”假设和“图层不存在”假设被替换成与实站一致的新断言。

### Task 2: Implement The Home `添加项目` Modal And Creation Handoff

**Files:**
- Create: `apps/web/src/components/new-project-dialog.tsx`
- Modify: `apps/web/src/app/(workspace)/home/page.tsx`
- Modify: `apps/web/src/hooks/use-create-project.ts`
- Modify: `apps/web/src/app/canvas/page.tsx`
- Modify: `apps/web/test/home-page-shell.test.tsx`
- Modify: `apps/web/test/use-create-project.test.tsx`
- Modify: `apps/web/test/canvas-page-shell.test.tsx`

- [ ] **Step 1: 新建 `NewProjectDialog`，严格对齐已复核出来的弹窗骨架**
  - 标题：`添加项目`
  - 字段：`项目名称`
  - 分区：`导入画布项目`
  - 按钮：`上传项目文件 / 取消 / 确定`
- [ ] **Step 2: 改造 `/home` 第一张 `新建项目` 卡片**
  - 点击先打开弹窗
  - 默认项目名仍使用 `未命名`
  - 点击 `确定` 后才真正调用 `createNewProject`
- [ ] **Step 3: 让 `useCreateProject` 支持 `name` 入参，并把它传给 `createProject`**
- [ ] **Step 4: 利用现有画布导入逻辑补一条最小 handoff**
  - 若用户在弹窗里选择了画布项目文件，则把原始内容写入 `sessionStorage`
  - 新项目 `/canvas` 打开后，消费这份初始化内容并走现有 scene import 路径
- [ ] **Step 5: 跑定向测试，确认新建项目不再越过弹窗，且命名/导入 handoff 不破坏现有创建链路**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/home-page-shell.test.tsx test/use-create-project.test.tsx test/canvas-page-shell.test.tsx --reporter=dot --pool forks"
```

Expected: `/home` 第一张卡片先开 `添加项目` 弹窗；确认后再创建项目；自定义项目名与可选的画布导入 handoff 都被测试锁住。

### Task 3: Expose The Layer Entry And Upgrade The Shape Flyout Shell

**Files:**
- Modify: `apps/web/src/app/canvas/page.tsx`
- Modify: `apps/web/src/components/canvas-editor.tsx`
- Modify: `apps/web/src/components/canvas-tool-menu.tsx`
- Modify: `apps/web/src/components/canvas-layers-panel.tsx`
- Modify: `apps/web/test/canvas-page-shell.test.tsx`
- Modify: `apps/web/test/canvas-tool-menu.test.tsx`

- [ ] **Step 1: 为 `/canvas` 增加 `layersOpen` 状态，并把它与现有 `CanvasLayersPanel` 接起来**
- [ ] **Step 2: 在建筑学长模式工具轨中补出左下 `图层` 按钮**
  - 默认收起
  - 点击后打开左侧 `图层` 面板
- [ ] **Step 3: 把 `shape` flyout 壳层升级到实站更接近的结构**
  - 顶部样式条
  - 至少 5 个图形按钮
  - 不改变 `添加` modal 的既有路径
- [ ] **Step 4: 让 `CanvasLayersPanel` 在本批次至少达到“可打开、可关闭、可见当前层级入口”的完成度**
  - 不在这一批扩大到完整锁定/显隐逻辑实现
- [ ] **Step 5: 跑定向测试，确认页面壳层与左侧工具轨都锁定到新的真实结构**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/canvas-page-shell.test.tsx test/canvas-tool-menu.test.tsx --reporter=dot --pool forks"
```

Expected: 本地 `/canvas` 默认不展开图层面板，但左下 `图层` 按钮存在且可用；`形状` flyout 结构不再是 4 个纯文本按钮。

### Task 4: Replace Persistent `发送至对话` With Transient Selection Context

**Files:**
- Modify: `apps/web/src/components/chat-sidebar.tsx`
- Modify: `apps/web/src/components/chat-input.tsx`
- Modify: `apps/web/test/chat-sidebar.test.tsx`
- Modify: `apps/web/test/chat-input.test.tsx`

- [ ] **Step 1: 拆分“持久附件”和“临时选区上下文”两条语义**
  - 手动上传、初始化附件、明确持久附件仍走 `readyAttachments`
  - `发送至对话` 与当前选图只影响本次 composer / 本次发送
- [ ] **Step 2: 移除 immersive 模式下 `attach-selection -> addCanvasRef()` 的持久写入**
- [ ] **Step 3: 让 `ChatInput` 优先渲染当前选中的临时 chip**
  - 选中存在时显示
  - 取消选中后消失
  - 不再被旧的 `attachedReferenceCount` 持久态压住
- [ ] **Step 4: 修正 `handleSend()`**
  - immersive 模式下也要把当前临时选区纳入这次发送 payload
  - 但发送完成后，不制造新的持久 `canvas-ref` 残留
- [ ] **Step 5: 跑定向测试，确认 `发送至对话` 的 UI 与 payload 行为都回到“selection-bound”语义**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/chat-sidebar.test.tsx test/chat-input.test.tsx --reporter=dot --pool forks"
```

Expected: 取消选中后，参考图 placeholder 和相关动作消失；但本次发送仍能带上当前选中图作为上下文。

### Task 5: Verification, Browser Proof, And Writeback

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

- [ ] **Step 1: 运行本批次全部定向静态验证**
- [ ] **Step 2: 重建并重启 `web` 容器**
- [ ] **Step 3: 用本地 Playwright 复核 4 条关键链路**
  - `/home` 点击第一张 `新建项目` -> 出现 `添加项目`
  - `/canvas` 左下 `图层` -> 左侧面板打开
  - `/canvas` `形状` -> 出现顶部样式条 + 5 按钮 flyout
  - `/canvas` 发送至对话后取消选中 -> chip 消失
- [ ] **Step 4: 把命令、结果、截图和 JSON 证据写回执行日志与验证文档**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/chat-sidebar.test.tsx test/chat-input.test.tsx test/canvas-page-shell.test.tsx test/canvas-tool-menu.test.tsx test/home-page-shell.test.tsx test/use-create-project.test.tsx --reporter=dot --pool forks"
```

Expected: 本批次的 4 个关键事实均有静态验证、容器可运行证据和浏览器级复核证据，不再停留在“看起来像”。
