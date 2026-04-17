# Phase 7 Batch 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把本地 `/canvas` 的工作台外壳继续收束到建筑学长真实产品的关键交互，优先补齐 `添加` 素材弹窗、紧凑右键菜单，以及选图后 composer 缩略图自动联动。

**Architecture:** 继续沿用 `CanvasPage -> ChatSidebar -> ChatInput` 的状态边界：`CanvasPage` 负责选区、右键模式与对话开合；`ChatSidebar` 负责展开态/折叠态 composer 布局和选区到对话上下文的桥接；`ChatInput` 只负责渲染输入框、缩略图 chip 和底部控制条；`CanvasToolMenu` 收口左侧 `添加` modal；`CanvasContextMenu` 退化成纯展示层，菜单条目与顺序由页面层严格按建筑学长真实菜单清单注入。

**Tech Stack:** Next.js App Router、React、Tailwind、Excalidraw、Vitest、Playwright、WSL Docker

---

### Task 1: Freeze The Strict Canvas Shell Contract

**Files:**
- Create: `docs/execution/2026-04-15-architecture-agent-studio-phase7-batch5-plan.md`
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

- [ ] **Step 1: 把建筑学长真实站点审计结果收束成 Batch 5 的唯一实现范围**
- [ ] **Step 2: 在 `task_plan.md` 和 `progress.md` 中写入本轮目标、边界和下一步**

Run:

```bash
Get-Content docs/execution/2026-04-15-architecture-agent-studio-phase7-batch5-plan.md
```

Expected: 文档明确限定本轮只处理 `添加` modal、紧凑右键菜单、immersive composer 联动三条主线，不再扩写需求。

### Task 2: Rebuild The Add Entry Into A Real Modal

**Files:**
- Modify: `apps/web/src/components/canvas-tool-menu.tsx`
- Modify: `apps/web/test/canvas-tool-menu.test.tsx`

- [ ] **Step 1: 先写失败测试，约束 `添加` 不再是小 flyout，而是带 `本地上传 / 官方图库 / 企业图库 / 我的创作` 四个标签的 modal**
- [ ] **Step 2: 跑定向测试，确认当前实现仍停留在 flyout 形态**
- [ ] **Step 3: 以最小改动把 `CanvasToolMenu` 的 `添加` 切到 modal shell，并保留本地上传入口和现有架构板块动作**
- [ ] **Step 4: 重新跑测试，确认 modal 打开/关闭、标签切换与上传入口都稳定**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/canvas-tool-menu.test.tsx --reporter=dot"
```

Expected: 左侧 `添加` 展开后是 modal，不再出现旧的悬浮 flyout。

### Task 3: Tighten Context Menu Inventory And Presentation

**Files:**
- Modify: `apps/web/src/components/canvas/canvas-context-menu.tsx`
- Modify: `apps/web/src/app/canvas/page.tsx`
- Modify: `apps/web/src/lib/canvas-context-actions.ts`
- Modify: `apps/web/test/canvas-context-menu.test.tsx`
- Modify: `apps/web/test/canvas-page-context-menu.test.tsx`

- [ ] **Step 1: 先写失败测试，约束空白处右键菜单只保留 `粘贴 / 显示画布所有元素 / 导出画布 / 导入画布`**
- [ ] **Step 2: 先写失败测试，约束单图/多图右键菜单顺序贴近建筑学长真实菜单，不再渲染标题说明卡片和模板型伪动作**
- [ ] **Step 3: 以页面层 action 注入方式重排菜单，去掉 `CanvasContextMenu` 内部 title/description 壳层**
- [ ] **Step 4: 对现有 helper 做最小补齐，让 copy / group / ungroup / merge / lock / export 等动作至少在本地路径可执行或可占位调度**
- [ ] **Step 5: 重新跑菜单相关测试，确认 blank / single-image / multi-image 三类菜单都已收敛**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/canvas-context-menu.test.tsx test/canvas-page-context-menu.test.tsx --reporter=dot --pool forks"
```

Expected: 右键菜单变成建筑学长式紧凑菜单，动作清单来自页面层真实模式判断，不再夹带模板说明文案。

### Task 4: Restore Selection-To-Composer Thumbnail Sync

**Files:**
- Modify: `apps/web/src/components/chat-input.tsx`
- Modify: `apps/web/src/components/chat-sidebar.tsx`
- Modify: `apps/web/test/chat-input.test.tsx`
- Modify: `apps/web/test/chat-sidebar.test.tsx`

- [ ] **Step 1: 先写失败测试，约束 immersive 模式下选中单图/多图时会立即显示缩略图 chip，而不是仅改 placeholder**
- [ ] **Step 2: 先写失败测试，约束折叠态 composer 为底部居中，展开态 composer 为右侧 panel 内 docked 底栏**
- [ ] **Step 3: 以最小实现补齐 `ChatSidebar` 的布局状态机，并让 `ChatInput` 在 immersive 模式渲染只读缩略图 chip strip**
- [ ] **Step 4: 重新跑测试，确认选区变化、折叠/展开切换和 attached state 保持一致**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/chat-input.test.tsx test/chat-sidebar.test.tsx --reporter=dot --pool forks"
```

Expected: 建筑学长式的选图即入 composer 缩略图链路在 open / collapsed 两种 shell 下都稳定可见。

### Task 5: Verification And Writeback

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

- [ ] **Step 1: 跑完本轮定向 Vitest 套件**
- [ ] **Step 2: 如静态验证通过，重建并重启 `web` 容器**
- [ ] **Step 3: 用 Playwright 补一轮本地浏览器证据，至少覆盖 add modal、blank menu、single/multi menu、composer 缩略图联动**
- [ ] **Step 4: 把命令、结果、证据路径回写到 `progress.md` 和验证文档**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/canvas-tool-menu.test.tsx test/canvas-context-menu.test.tsx test/canvas-page-context-menu.test.tsx test/chat-input.test.tsx test/chat-sidebar.test.tsx --reporter=dot --pool forks"
```

Expected: 本轮 shell parity 变更具备静态验证证据，并准备好进入浏览器级复核。
