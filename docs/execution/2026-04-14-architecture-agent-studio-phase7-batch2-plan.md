# Phase 7 Batch 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付画布右键动作层、多图成组与“按模板驱动右侧输入框”的第一版建筑学长式交互。

**Architecture:** 页面层新增一个轻量上下文动作系统，负责识别当前选区状态、弹出菜单并向 `ChatSidebar` 发送一次性 composer command。`ChatSidebar` 负责把选图附加到对话、把模板 prompt 注入 `ChatInput`，而 `CanvasEditor` 与 Excalidraw API 只负责画布选择与成组动作本身。

**Tech Stack:** Next.js/React、Excalidraw、Tailwind、Vitest、Playwright、WSL Docker。

---

### Task 1: Freeze Context-Menu Domain Helpers

**Files:**
- Create: `apps/web/src/lib/canvas-context-actions.ts`
- Create: `apps/web/test/canvas-context-actions.test.ts`

- [ ] **Step 1: 写失败测试，约束单图、多图、空白画布的上下文模式判定**
- [ ] **Step 2: 写失败测试，约束多图成组 helper 的基本行为**
- [ ] **Step 3: 实现最小 helper，包含菜单模式判定与选区成组**
- [ ] **Step 4: 运行测试，确认绿灯**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/canvas-context-actions.test.ts --reporter=dot"
```

Expected: 页面层拥有稳定的右键模式判定与第一版成组能力。

### Task 2: Build A Testable Canvas Context Menu Layer

**Files:**
- Create: `apps/web/src/components/canvas/canvas-context-menu.tsx`
- Create: `apps/web/test/canvas-context-menu.test.tsx`
- Modify: `apps/web/src/app/canvas/page.tsx`

- [ ] **Step 1: 写失败测试，约束空白、单图、多图三类菜单项**
- [ ] **Step 2: 写失败测试，约束菜单动作会触发对应回调**
- [ ] **Step 3: 实现独立的右键菜单组件**
- [ ] **Step 4: 将菜单接入 `canvas/page.tsx`，用当前选区状态控制展示**
- [ ] **Step 5: 运行测试，确认绿灯**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/canvas-context-menu.test.tsx --reporter=dot"
```

Expected: 右键动作层是独立可测的，不直接耦合大块 Excalidraw 组件实现。

### Task 3: Wire Composer Commands Into Chat Sidebar

**Files:**
- Modify: `apps/web/src/components/chat-sidebar.tsx`
- Modify: `apps/web/src/components/chat-input.tsx`
- Modify: `apps/web/test/chat-sidebar.test.tsx`
- Modify: `apps/web/test/chat-input.test.tsx`
- Modify: `apps/web/src/app/canvas/page.tsx`

- [ ] **Step 1: 写失败测试，约束外部模板指令会写入输入框**
- [ ] **Step 2: 写失败测试，约束外部 attach-selection 指令会保留参考图 chips**
- [ ] **Step 3: 为 `ChatSidebar` 增加 composer command 入口**
- [ ] **Step 4: 为 `ChatInput` 增加外部 draft 注入能力**
- [ ] **Step 5: 将右键菜单动作接到 `ChatSidebar` 命令链路**
- [ ] **Step 6: 运行测试，确认绿灯**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/chat-input.test.tsx test/chat-sidebar.test.tsx --reporter=dot"
```

Expected: 右键动作能够真正改变右侧输入状态，而不是只显示一个菜单。

### Task 4: Runtime Validation And Writeback

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

- [ ] **Step 1: 跑完 Batch 2 的静态测试集合**
- [ ] **Step 2: 重建并重启 `web` 容器**
- [ ] **Step 3: 浏览器里验证空白处右键、单图右键、多图右键和右侧输入联动**
- [ ] **Step 4: 把证据与剩余风险回写文档**

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/canvas-context-actions.test.ts test/canvas-context-menu.test.tsx test/chat-input.test.tsx test/chat-sidebar.test.tsx --reporter=dot"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && docker compose -f docker-compose.local.yml --env-file /mnt/d/97-CodingProject/Loomic-ArcIns/.tmp/loomic-local.env build web && docker compose -f docker-compose.local.yml --env-file /mnt/d/97-CodingProject/Loomic-ArcIns/.tmp/loomic-local.env up -d --no-deps web"
curl -I "http://127.0.0.1:3000/canvas?id=85f737fe-388b-4a42-97df-4ed0e798f609&studio=architecture"
```

Expected: Batch 2 具备测试证据、运行证据与浏览器级交互证据。
