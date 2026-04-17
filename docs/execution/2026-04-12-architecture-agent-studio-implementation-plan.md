# Architecture Agent Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a document-backed, WSL-first, architecture-focused collaboration studio on top of Loomic and implement the product milestones incrementally without regressing existing flows.

**Architecture:** Extend the existing project creation, canvas workspace, chat sidebar, websocket runtime, and shared contracts instead of creating a second application. Freeze contracts in docs first, then deliver milestone slices from shell to collaboration to agent planning, and finally domain/export capabilities with containerized verification.

**Tech Stack:** Next.js 15, React 19, Fastify 5, LangChain / LangGraph, Excalidraw, Supabase, WSL Docker Compose.

---

### Task 1: Phase 0/1 Documentation Baseline

**Files:**
- Create: `docs/prd/2026-04-12-architecture-agent-studio-prd.md`
- Create: `task_plan.md`
- Create: `findings.md`
- Create: `progress.md`
- Create: `docs/execution/2026-04-12-architecture-agent-studio-runbook.md`
- Create: `docs/verification/2026-04-12-architecture-agent-studio-validation.md`
- Create: `docs/execution/ralph/*.prompt.md`

- [x] Write the PRD and freeze public contracts before any business implementation.
- [x] Record current repo facts, environment gaps, competitor synthesis, and dirty-worktree constraints.
- [x] Create milestone-specific Ralph prompts with allowed / forbidden write scopes and verification commands.
- [x] Update `task_plan.md`, `findings.md`, and `progress.md` immediately after file creation.

Run:
```bash
git diff -- docs/prd docs/execution docs/verification task_plan.md findings.md progress.md
```

Expected: only new documentation files and no business-code modifications.

### Task 2: WSL Toolchain And Container Runtime

**Files:**
- Modify: `.env.example`
- Create: `docker-compose.local.yml`
- Create: `docs/execution/2026-04-12-architecture-agent-studio-wsl-runtime.md`
- Modify: `docs/verification/2026-04-12-architecture-agent-studio-validation.md`
- Modify: `progress.md`

- [x] Install or confirm `pnpm`, `bun`, `ralph`, and `supabase` in WSL.
- [x] Decide and document whether Ralph runs natively in WSL or via Windows `codex.ps1` fallback.
- [x] Add a repo-level compose file for `web`, `server`, and `worker`.
- [x] Document required env vars and host-network assumptions.

Note:
Current machine still has an external Docker registry pull blocker (`EOF` against both `public.ecr.aws` and `registry-1.docker.io`). This blocks image build/start verification but does not invalidate the runtime skeleton or WSL toolchain baseline.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && node -v && pnpm -v && docker compose version"
```

Expected: all commands succeed with version output.

### Task 3: M1 Studio Entry + Workspace Shell

**Files:**
- Modify: `apps/web/src/app/(workspace)/home/page.tsx`
- Modify: `apps/web/src/app/(workspace)/projects/page.tsx`
- Modify: `apps/web/src/app/canvas/page.tsx`
- Modify: `apps/web/src/components/app-sidebar.tsx`
- Create or modify: `apps/web/src/components/architecture/*`
- Modify: `apps/web/src/app/globals.css`
- Test: `apps/web/test/projects.test.tsx`
- Test: `apps/web/test/chat-sidebar.test.tsx`
- Create test: `apps/web/test/architecture-studio-shell.test.tsx`

- [ ] Add an architecture-specific entry path from Home and Projects.
- [ ] Wrap the canvas route in a studio shell that introduces left-side architecture boards and a right-side agent inspector.
- [ ] Preserve existing prompt / attachment / session handoff when entering the studio.
- [ ] Keep mobile and desktop layouts usable.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && corepack enable && pnpm --filter @loomic/web test"
```

Expected: web tests pass, including the new architecture shell coverage.

### Task 4: M2 Real-Time Team Collaboration

**Files:**
- Modify: `packages/shared/src/events.ts`
- Modify: `packages/shared/src/ws-protocol.ts`
- Modify: `apps/server/src/ws/connection-manager.ts`
- Modify: `apps/server/src/ws/handler.ts`
- Modify: `apps/web/src/hooks/use-websocket.ts`
- Modify: `apps/web/src/components/canvas-editor.tsx`
- Create or modify: `apps/web/src/hooks/use-canvas-collaboration.ts`
- Create tests under: `apps/web/test/` and `apps/server/src/**/__tests__/`

- [ ] Add presence, cursor, selection, and canvas mutation event types.
- [ ] Broadcast project / canvas collaboration state through the websocket layer.
- [ ] Surface collaborator presence and key shared actions in the studio UI.
- [ ] Ensure reconnect and replay logic still works with the new event types.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && pnpm test && pnpm typecheck"
```

Expected: shared, web, and server contract checks remain green.

### Task 5: M3 Agent Planning + Autonomous Execution

**Files:**
- Modify: `packages/shared/src/contracts.ts`
- Modify: `packages/shared/src/events.ts`
- Modify: `apps/server/src/agent/runtime.ts`
- Modify: `apps/server/src/features/agent-runs/agent-run-service.ts`
- Modify: `apps/web/src/components/chat-sidebar.tsx`
- Create or modify: `apps/web/src/components/agent-plan-panel.tsx`
- Create tests for plan and step rendering / transitions

- [ ] Introduce a plan / step / artifact lifecycle contract.
- [ ] Make the server stream plan and step state, not only plain text/tool blocks.
- [ ] Render the plan lifecycle in the right-side agent panel and tie artifacts back to canvas regions or boards.
- [ ] Support interrupt / retry / resume actions in the UI contract, even if the first slice is minimal.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && pnpm --filter @loomic/server test && pnpm --filter @loomic/web test"
```

Expected: server and web tests cover the new planning lifecycle.

### Task 6: M4/M5 Architecture Domain + Share / Export / Ops

**Files:**
- Modify: `packages/shared/src/contracts.ts`
- Modify: `apps/server/src/agent/prompts/loomic-main.ts`
- Modify: `apps/server/src/agent/tools/*`
- Modify: `apps/web/src/components/canvas-*`
- Create or modify: `apps/web/src/components/architecture-board-*`
- Create or modify: `apps/server/src/features/projects/*` and export-related endpoints
- Modify: `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

- [ ] Add architecture board semantics, domain objects, and agent context injection.
- [ ] Support architecture-specific workflows for render variations, storyboard shots, and presentation video boards.
- [ ] Add share snapshot, review package, export manifest, and traceability ledger outputs.
- [ ] Verify everything through WSL containers and document evidence.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && docker compose -f docker-compose.local.yml up --build -d"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && pnpm test && pnpm typecheck"
```

Expected: compose stack starts and full verification passes.
