# Phase 7 Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付 Lovart 风格首页和沉浸式 Canvas 壳层的第一批改造，并保持建筑学长式右侧智能体输入的上下文链路。

**Architecture:** 复用现有 Home、Canvas、ChatSidebar、ChatInput 业务能力，只重构页面外壳与信息层级。工作区左侧导航通过路由感知进行隐藏；首页与 Canvas 分别在页面内部构建新的悬浮导航与创作入口；右侧输入沿用现有状态模型并继续强化中文化和参考图上下文。

**Tech Stack:** Next.js App Router、React、Tailwind、Framer Motion、Vitest、Playwright、WSL Docker。

---

### Task 1: Freeze Route-Aware Workspace Chrome

**Files:**
- Modify: `apps/web/src/app/(workspace)/layout.tsx`
- Create: `apps/web/test/workspace-layout-shell.test.tsx`
- Modify: `task_plan.md`
- Modify: `progress.md`

- [ ] **Step 1: 写失败测试，约束 `/home` 与 `/canvas` 隐藏工作区左侧导航**
- [ ] **Step 2: 运行测试，确认当前实现仍会渲染 `AppSidebar`，出现红灯**
- [ ] **Step 3: 最小实现路由感知 workspace chrome，只在需要的页面渲染 `AppSidebar` 和全局头部积分按钮**
- [ ] **Step 4: 重新运行测试，确认绿灯**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/workspace-layout-shell.test.tsx --reporter=dot"
```

Expected: `/home` 和 `/canvas` 为沉浸式 shell，其他工作区路由仍保留原导航能力。

### Task 2: Rebuild Home Into A Lovart-Style Creation Surface

**Files:**
- Modify: `apps/web/src/app/(workspace)/home/page.tsx`
- Modify: `apps/web/src/components/home-prompt.tsx`
- Modify: `apps/web/test/home-page-shell.test.tsx`
- Modify: `findings.md`
- Modify: `progress.md`

- [ ] **Step 1: 扩充首页失败测试，锁定深色第一屏、页面内顶部导航、主 CTA、最近项目近距离呈现**
- [ ] **Step 2: 运行测试并确认当前首页壳层未满足新断言**
- [ ] **Step 3: 最小重构首页布局，不改业务数据源，只改信息架构与视觉层次**
- [ ] **Step 4: 调整 `HomePrompt` 以适配首页新壳层**
- [ ] **Step 5: 重跑首页测试，确认绿灯**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/home-page-shell.test.tsx --reporter=dot"
```

Expected: 首页成为无左栏、创作优先、中文化的登录后入口。

### Task 3: Land The Immersive Canvas Shell

**Files:**
- Modify: `apps/web/src/app/canvas/page.tsx`
- Modify: `apps/web/src/components/chat-sidebar.tsx`
- Modify: `apps/web/src/components/chat-input.tsx`
- Modify: `apps/web/test/architecture-studio-shell.test.tsx`
- Modify: `apps/web/test/chat-sidebar.test.tsx`
- Modify: `apps/web/test/chat-input.test.tsx`

- [ ] **Step 1: 写失败测试，约束 Canvas 不再显示旧 architecture rail，并保留右侧沉浸式智能体面板**
- [ ] **Step 2: 写失败测试，约束输入区参考图 chips、模板按钮、中文 placeholder 行为**
- [ ] **Step 3: 运行测试并确认红灯来自壳层与输入区旧行为**
- [ ] **Step 4: 最小重构 Canvas 顶部悬浮 chrome、按需抽屉与右侧面板布局**
- [ ] **Step 5: 最小补强 ChatSidebar / ChatInput 的文案与上下文展示**
- [ ] **Step 6: 重新运行测试，确认绿灯**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/architecture-studio-shell.test.tsx test/chat-sidebar.test.tsx test/chat-input.test.tsx --reporter=dot"
```

Expected: Canvas 成为无左栏沉浸式工作台，右侧输入保持建筑语义与参考图状态。

### Task 4: Runtime Validation And Documentation Writeback

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

- [ ] **Step 1: 运行 Phase 7 Batch 1 的定向测试集合**
- [ ] **Step 2: 重新加载本地 `/home` 与 `/canvas`，做浏览器级验收**
- [ ] **Step 3: 记录浏览器截图、未完成项与剩余风险**
- [ ] **Step 4: 回写 planning-with-files 与验证文档**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/workspace-layout-shell.test.tsx test/home-page-shell.test.tsx test/architecture-studio-shell.test.tsx test/chat-sidebar.test.tsx test/chat-input.test.tsx --reporter=dot"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && docker compose -f docker-compose.local.yml --env-file /mnt/d/97-CodingProject/Loomic-ArcIns/.tmp/loomic-local.env up -d --no-deps web"
curl -I http://127.0.0.1:3000/home
curl -I "http://127.0.0.1:3000/canvas?id=85f737fe-388b-4a42-97df-4ed0e798f609&studio=architecture"
```

Expected: Phase 7 Batch 1 具有测试证据、运行证据和浏览器证据，且文档状态同步。
