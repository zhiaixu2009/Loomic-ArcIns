# M4 Architecture Domain Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the bounded M4 slice that turns architecture boards into real canvas templates, derives architecture context from the live scene, and passes that context into agent execution.

**Architecture:** Keep the existing `/canvas` runtime and chat/session model intact. Add shared architecture contracts, a web-side architecture canvas helper, and a server-side prompt enrichment path so the same architecture scene can drive strategy, render, storyboard, and video work.

**Tech Stack:** Excalidraw scene mutation, React/Next.js workspace shell, shared Zod contracts, LangChain runtime prompt enrichment, Vitest.

---

### Task 1: Shared Architecture Contracts

**Files:**
- Create: `packages/shared/src/architecture-contracts.ts`
- Modify: `packages/shared/src/contracts.ts`
- Modify: `packages/shared/src/contracts.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] Add architecture domain enums and schemas:
  - `architectureBoardKind`
  - `architectureObjectType`
  - `architectureBoardStatus`
  - `architectureStrategyDisposition`
  - `architectureBoard`
  - `architectureStrategyOption`
  - `architectureContext`
- [ ] Extend `runCreateRequestSchema` with optional `architectureContext`.
- [ ] Add targeted contract tests that validate accepted architecture payloads and reject malformed kinds/dispositions.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/packages/shared && node ../../node_modules/vitest/vitest.mjs run src/contracts.test.ts -t \"architecture\""
```

Expected: the shared contract suite passes with new architecture-specific coverage.

### Task 2: Web Architecture Canvas Helper

**Files:**
- Create: `apps/web/src/lib/architecture-canvas.ts`
- Test: `apps/web/test/architecture-canvas.test.ts`

- [ ] Add board template definitions for:
  - `reference_board`
  - `site_analysis`
  - `massing_options`
  - `render_variations`
  - `storyboard_shots`
  - `video_output`
- [ ] Add helper(s) to create Excalidraw elements for a single board and a full board stack.
- [ ] Add helper(s) to derive `architectureContext` from scene elements plus selected element ids.
- [ ] Ensure inserted elements carry `customData.architecture` metadata so the scene remains self-describing after save/reload.
- [ ] Add targeted tests for template generation and scene-to-context derivation.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/architecture-canvas.test.ts"
```

Expected: helper-level tests prove boards are generated with architecture metadata and can be recovered from scene content.

### Task 3: Architecture Studio Shell Wiring

**Files:**
- Modify: `apps/web/src/app/canvas/page.tsx`
- Modify: `apps/web/src/components/architecture/architecture-studio-rail.tsx`
- Modify: `apps/web/src/components/canvas-editor.tsx`
- Test: `apps/web/test/architecture-studio-shell.test.tsx`

- [ ] Keep `CanvasEditor` mounted and use live `excalidrawApi` to insert board templates.
- [ ] Extend the page layer so architecture mode can:
  - insert one board
  - insert the full board stack
  - derive current board state from the live scene
- [ ] Upgrade the desktop rail from static cards to actionable board launchers with current status.
- [ ] Keep the mobile compact bar lightweight while still exposing a board entry affordance.
- [ ] If needed, extend `CanvasSelectedElement` so selection can carry architecture metadata into context derivation.
- [ ] Add shell tests for board launcher rendering and click behavior.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/architecture-studio-shell.test.tsx test/architecture-canvas.test.ts"
```

Expected: the architecture shell tests pass and board actions stay scoped to architecture mode.

### Task 4: Agent Context Injection

**Files:**
- Modify: `apps/web/src/components/chat-sidebar.tsx`
- Modify: `apps/server/src/agent/runtime.ts`
- Modify: `apps/server/src/agent/prompts/loomic-main.ts`
- Test: `apps/web/test/chat-sidebar.test.tsx`
- Test: `apps/server/src/agent/runtime.test.ts`

- [ ] Teach `ChatSidebar` to include derived `architectureContext` in start/resume/retry payloads when the canvas is in architecture mode.
- [ ] Extend runtime message enrichment to append `<architecture_context>` XML.
- [ ] Update the main prompt so architecture runs:
  - reason in terms of boards and domain objects
  - propose multiple strategy options before selection
  - connect render context into storyboard/video flows
- [ ] Add a web test proving the run payload includes architecture context.
- [ ] Add a server test proving `buildUserMessage()` includes the architecture XML block.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/chat-sidebar.test.tsx"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/server && node ../../node_modules/vitest/vitest.mjs run src/agent/runtime.test.ts"
```

Expected: run payloads and prompt enrichment both carry the architecture domain layer.

### Task 5: Verification And Documentation

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `docs/verification/2026-04-12-architecture-agent-studio-validation.md`
- Modify: `docs/execution/ralph/m4-architecture-domain-layer.prompt.md`

- [ ] Record the chosen bounded M4 slice and targeted verification commands.
- [ ] Update the M4 Ralph prompt so its write scope and verification commands match the implemented slice.
- [ ] Record any residual risk, especially around non-persisted DB domain tables and future multi-user domain editing semantics.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && git diff -- docs/execution task_plan.md findings.md progress.md docs/verification/2026-04-12-architecture-agent-studio-validation.md"
```

Expected: documentation diff only reflects M4 scope, evidence, and follow-up notes.
