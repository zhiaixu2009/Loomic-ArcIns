# Phase 7 Batch 8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the next frozen `建筑学长` parity gap by turning the existing `图层` panel from a visual shell into a real scene-management entry point with working lock / visibility actions.

**Architecture:** Keep this batch entirely inside the current canvas shell. Reuse the existing `canvas-context-actions.ts` scene mutation helpers and the already-mounted `CanvasLayersPanel`, so the panel becomes another view over the same selection and mutation model instead of inventing separate layer state.

**Tech Stack:** Next.js App Router, React, Excalidraw, Vitest, WSL Docker

---

## Scope Freeze

- In scope:
  - `图层` 面板行点击选中
  - 行级 `锁定` 按钮真实切换元素锁定状态
  - 行级 `显示/隐藏` 按钮真实切换元素可见状态
  - 按钮文案、禁用态、选中态与当前场景同步
  - 面板行为的 focused tests
- Out of scope:
  - 图层树拖拽排序
  - 批量层级调整 UI
  - 任何 PRD 里仍然标记为 `待复核` 的建筑学长细节
  - 无关的首页、右侧记录面板、模板库扩写

## Files Expected In This Batch

- Modify: `apps/web/src/components/canvas-layers-panel.tsx`
- Create: `apps/web/test/canvas-layers-panel.test.tsx`
- Modify: `apps/web/test/canvas-page-shell.test.tsx`
- Modify: `docs/prd/2026-04-16-jianzhuxuezhang-ai-canvas-agent-prd.md`
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

## Task 1: Freeze The Layer-Panel Contract In Tests

- [ ] Add red tests proving the current panel gap:
  - clicking a layer row selects that element in Excalidraw
  - clicking `锁定图层` mutates the row's scene element instead of no-oping
  - clicking `切换图层可见性` mutates the row's scene element instead of no-oping
  - row action clicks do not accidentally trigger row selection
- [ ] Verify the new tests fail before implementation.

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/canvas-layers-panel.test.tsx --reporter=dot --pool forks"
```

Expected:
- the new assertions fail against the current shell-only layer action buttons

## Task 2: Wire Layer Rows To Real Scene Mutations

- [ ] Reuse `toggleLockSelectedCanvasElements` and `toggleVisibilitySelectedCanvasElements` from `canvas-context-actions.ts`
- [ ] Keep row action behavior selection-safe:
  - the clicked row becomes the active selection before mutation
  - the icon button itself does not bubble into an extra unintended click path
- [ ] Refresh the panel state from Excalidraw after each mutation
- [ ] Keep icon labels Chinese-only and aligned with current panel semantics

## Task 3: Focused Regression Recheck

- [ ] Re-run the layer-panel suite until green
- [ ] Re-run the existing shell test that proves the `图层` entry opens the panel

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/canvas-layers-panel.test.tsx test/canvas-page-shell.test.tsx --reporter=dot --pool forks"
```

Expected:
- all layer-panel and touched shell assertions pass

## Task 4: Runtime Verification

- [ ] Reuse the fast dev-container path when possible; do not trigger a production image rebuild for this small UI slice
- [ ] If the dev web container is not up, start only the minimal services needed
- [ ] Verify `/canvas` still serves after the panel change

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && ./scripts/wsl/write-local-docker-env.sh .tmp/loomic-local.env && docker compose -f docker-compose.local.yml -f docker-compose.dev.yml --env-file .tmp/loomic-local.env up -d server worker && pnpm docker:dev:web:detach && curl -I --max-time 20 http://127.0.0.1:3000/canvas?id=canvas-1&studio=architecture"
```

Expected:
- the local runtime stays reachable after the layer-panel changes

## Task 5: Documentation Writeback

- [ ] Mark the corresponding PRD implementation note as completed for this batch
- [ ] Append the batch result to `task_plan.md`, `findings.md`, `progress.md`
- [ ] Append fresh evidence to `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

## Exit Criteria

- `图层` 面板入口 remains available
- layer-row lock and visibility buttons perform real scene mutations
- focused tests are green
- local runtime remains reachable without triggering another slow production rebuild
