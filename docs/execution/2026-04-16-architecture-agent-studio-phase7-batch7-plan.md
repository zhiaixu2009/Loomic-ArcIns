# Phase 7 Batch 7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strictly align the local `/canvas` detail workspace with the frozen `建筑学长` PRD for the next bounded slice: real canvas actions, real selection bars, and reliable composer / record-panel linkage.

**Architecture:** Keep this batch inside the current `/canvas?id=...&studio=architecture` route and do not widen into `/home` or unresolved header-icon semantics. Reuse the existing Excalidraw scene helpers and chat-sidebar command channel instead of inventing new state machines, but tighten their behavior until single-image, multi-image, blank-canvas, and right-panel flows match the frozen PRD.

**Tech Stack:** Next.js App Router, React, Excalidraw, Vitest, Playwright CLI, WSL Docker

---

## Scope Freeze

- In scope:
  - `/canvas/detail` equivalent core workspace behavior
  - blank-canvas / single-image / multi-image right-click real actions
  - top floating selection bar real actions
  - bottom composer + right-panel record-shell linkage
  - multi-select grouping / ungroup / merge / send-to-chat chain
- Out of scope:
  - `/home` further redesign beyond the already closed audit facts
  - top-right unresolved icon cluster semantics
  - new backend contracts or model-runtime changes
  - redesigning history persistence away from the current chat/session model

## Files Expected In This Batch

- Modify: `apps/web/src/app/canvas/page.tsx`
- Modify: `apps/web/src/components/canvas/canvas-context-menu.tsx`
- Modify: `apps/web/src/components/canvas/canvas-selection-action-bar.tsx`
- Modify: `apps/web/src/components/chat-sidebar.tsx`
- Modify: `apps/web/src/components/chat-input.tsx`
- Modify: `apps/web/src/lib/canvas-context-actions.ts`
- Modify: `apps/web/test/canvas-page-context-menu.test.tsx`
- Modify: `apps/web/test/canvas-page-selection-action-bar.test.tsx`
- Modify: `apps/web/test/chat-sidebar.test.tsx`
- Modify: `apps/web/test/chat-input.test.tsx`
- Modify: `progress.md`
- Modify: `findings.md`
- Modify: `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

## Task 1: Freeze Missing Canvas Interaction Contracts In Tests

- [ ] Add red tests for the still-missing real-action behaviors:
  - blank-canvas right click keeps only `粘贴 / 显示画布所有元素 / 导出画布 / 导入画布`
  - single-image right click triggers real scene helpers for reorder / lock / hide / delete / export
  - multi-image top bar exposes real `创建编组 / 合并图层 / 发送至对话`
  - single-image top bar keeps `编辑 / 涂鸦 / 文字 / 查看大图 / 下载` wired to actual page actions
- [ ] Verify the new tests fail before implementation.

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/canvas-page-context-menu.test.tsx test/canvas-page-selection-action-bar.test.tsx test/chat-sidebar.test.tsx test/chat-input.test.tsx --reporter=dot --pool forks"
```

Expected:
- at least the newly added assertions fail for the missing or partial real-action paths

## Task 2: Make Right-Click Menus Drive Real Scene Mutations

- [ ] Reuse `canvas-context-actions.ts` as the single scene-action authority instead of creating new page-local mutation code.
- [ ] Wire single-image and multi-image menu items in `page.tsx` to:
  - duplicate / paste
  - reorder forward / backward / front / back
  - group / ungroup
  - merge layers
  - hide / show
  - lock / unlock
  - delete
  - export
- [ ] Keep menu inventories aligned with the PRD and do not add speculative actions.
- [ ] Re-run the focused menu tests until green.

## Task 3: Tighten Top Selection Bars And Composer Linkage

- [ ] Ensure single-image top bar actions are not decorative:
  - `编辑` should continue to push the current selection into a composer-template flow
  - `涂鸦` / `文字` should route through existing page tool switching
  - `查看大图` / `下载` should hit the existing bounded page actions instead of placeholder no-ops
- [ ] Ensure multi-image bar actions remain selection-bound and do not create detached stale composer state.
- [ ] Keep the bottom composer and right-panel dock behavior exactly as frozen in the audit:
  - collapsed state uses bottom composer
  - expanded state uses right-panel docked composer
  - selection-bound reference state clears after deselection

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/canvas-page-selection-action-bar.test.tsx test/chat-sidebar.test.tsx test/chat-input.test.tsx --reporter=dot --pool forks"
```

Expected:
- all touched selection-bar and composer-linkage tests pass

## Task 4: Bounded Integration Recheck

- [ ] Re-run the bounded `/canvas` interaction suite after implementation.
- [ ] Do not widen into unrelated workspace type debt.

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/canvas-context-actions.test.ts test/canvas-context-menu.test.tsx test/canvas-page-context-menu.test.tsx test/canvas-page-selection-action-bar.test.tsx test/canvas-page-shell.test.tsx test/canvas-editor-context-menu.test.tsx test/canvas-tool-menu.test.tsx test/chat-input.test.tsx test/chat-sidebar.test.tsx test/canvas-files-panel.test.tsx --reporter=dot --pool forks"
```

Expected:
- the bounded canvas/chat suite is green

## Task 5: Container And Browser Proof

- [ ] Rebuild and restart the local `web` runtime in WSL Docker.
- [ ] Add or update a deterministic Playwright proof for this batch.
- [ ] Prove the live runtime, not just jsdom tests:
  - single-image right click exposes only the frozen menu family
  - single-image scene actions mutate the scene instead of no-oping
  - multi-image `创建编组 / 合并图层 / 发送至对话` remain available and usable
  - selection-bound composer state still clears after true deselection

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && docker compose -f docker-compose.local.yml --env-file .tmp/loomic-local.env build web && docker compose -f docker-compose.local.yml --env-file .tmp/loomic-local.env up -d --no-deps web"
```

Expected:
- `@loomic/web` build succeeds
- container restarts cleanly

## Task 6: Documentation Writeback

- [ ] Append execution details to `progress.md`
- [ ] Append product / verification findings to `findings.md`
- [ ] Append final evidence rows to `docs/verification/2026-04-12-architecture-agent-studio-validation.md`
- [ ] Keep the unresolved header-icon semantics explicitly untouched

## Exit Criteria

- Local bounded tests for the canvas/chat slice are green
- Local WSL Docker web runtime matches the touched source
- Playwright proof for this batch is green
- No speculative semantics were added for unresolved real-site controls
