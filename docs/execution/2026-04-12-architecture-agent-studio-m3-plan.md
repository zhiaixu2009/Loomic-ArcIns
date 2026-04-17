# M3 Agent Planning + Autonomous Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the bounded M3 slice that makes agent plans and step progress visible, links tool outputs back to steps, and adds interrupt / resume / retry controls to the Architecture Studio.

**Architecture:** Reuse the existing WS stream, runtime, and chat message persistence model. Add a new `agent-plan` content block plus explicit plan/step events and planning tools, instead of introducing a separate orchestration service or new persistence tables in this phase.

**Tech Stack:** Fastify websocket runtime, shared Zod contracts, React chat sidebar/message blocks, Vitest, WSL Docker runtime.

---

### Task 1: Shared Plan / Step / Interrupt Contracts

**Files:**
- Modify: `packages/shared/src/contracts.ts`
- Modify: `packages/shared/src/events.ts`
- Modify: `packages/shared/src/ws-protocol.ts`
- Test: `packages/shared/src/contracts.test.ts`

- [ ] Add `agentPlanSchema`, `agentPlanStepSchema`, `runInterruptSchema`, and `agentPlanBlockSchema`.
- [ ] Extend `contentBlockSchema` to include `type: "agent-plan"`.
- [ ] Add `agent.plan.updated`, `agent.step.updated`, `run.interrupted`, `run.resumed`, and `run.retried` stream events.
- [ ] Add `agent.interrupt`, `agent.resume`, and `agent.retry` websocket commands.
- [ ] Extend `packages/shared/src/contracts.test.ts` to validate the new block and event payloads.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/packages/shared && node ../../node_modules/vitest/vitest.mjs run src/contracts.test.ts"
```

Expected: shared contract tests pass with the new `agent-plan` block and event shapes accepted.

### Task 2: Agent Planning Tools And Prompt Discipline

**Files:**
- Create: `apps/server/src/agent/tools/agent-plan.ts`
- Modify: `apps/server/src/agent/tools/index.ts`
- Modify: `apps/server/src/agent/prompts/loomic-main.ts`

- [ ] Create a `publish_plan` tool that accepts a goal plus linear steps and emits a normalized plan snapshot.
- [ ] Create an `update_plan_step` tool that transitions a single step and can attach `toolCallIds`, `artifactCount`, and `errorMessage`.
- [ ] Register both tools in `createMainAgentTools()`.
- [ ] Update the main Loomic system prompt so the agent publishes a plan before effectful work and updates steps as execution progresses.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && pnpm --filter @loomic/server exec vitest run src/ws/connection-manager.test.ts"
```

Expected: server tests continue to pass after the new tool registrations and prompt changes.

### Task 3: Runtime State Machine For Interrupt / Resume / Retry

**Files:**
- Modify: `apps/server/src/agent/runtime.ts`
- Modify: `apps/server/src/ws/handler.ts`

- [ ] Extend runtime run records to keep the latest plan snapshot and original request payload.
- [ ] Add interrupt handling that marks the current run as interrupted and emits `run.interrupted`.
- [ ] Add resume handling that creates a follow-up run on the same session/thread and emits `run.resumed` with `sourceRunId`.
- [ ] Add retry handling that creates a fresh follow-up run and emits `run.retried` with `sourceRunId`.
- [ ] Keep `tool.completed.artifacts` backward-compatible while updating the active plan step with `toolCallIds` and `artifactCount`.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && pnpm --filter @loomic/server exec vitest run src/ws/connection-manager.test.ts src/http/canvases.test.ts"
```

Expected: server runtime tests remain green and no M2 collaboration behavior regresses.

### Task 4: Agent Plan Block Rendering And Controls

**Files:**
- Create: `apps/web/src/components/agent-plan-panel.tsx`
- Modify: `apps/web/src/hooks/use-chat-stream.ts`
- Modify: `apps/web/src/hooks/use-websocket.ts`
- Modify: `apps/web/src/components/chat-sidebar.tsx`
- Modify: `apps/web/src/components/chat-message.tsx`

- [ ] Teach `useChatStream()` how to upsert an `agent-plan` block on `agent.plan.updated` and mutate steps on `agent.step.updated`.
- [ ] Add websocket helpers for `agent.interrupt`, `agent.resume`, and `agent.retry`.
- [ ] Render a dedicated `AgentPlanPanel` above the transcript, deriving its state from the persisted `agent-plan` block instead of duplicating the plan inside assistant message bodies.
- [ ] Wire `Interrupt` to the active streaming run and `Resume` / `Retry` to the latest persisted plan block for the session.
- [ ] Keep existing text / thinking / tool block rendering intact and make `ChatMessage` safely ignore `agent-plan` blocks in the transcript.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/chat-sidebar.test.tsx test/use-chat-stream.test.ts test/chat-message.test.tsx"
```

Expected: web tests prove the plan block renders, updates, and exposes the right action buttons.

### Task 5: Verification And Documentation Closeout

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `docs/verification/2026-04-12-architecture-agent-studio-validation.md`
- Modify: `docs/execution/ralph/m3-agent-planning-autonomous-execution.prompt.md`

- [ ] Record the chosen M3 slice, test commands, and evidence in planning docs.
- [ ] Update the M3 Ralph prompt so its allowed scope and verification commands match the implemented slice.
- [ ] Record any residual risk, especially around long-lived resume semantics and non-persisted run metadata.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && git diff -- docs/execution task_plan.md findings.md progress.md docs/verification/2026-04-12-architecture-agent-studio-validation.md"
```

Expected: diffs show the M3 spec, M3 plan, and evidence updates with no unrelated rollback.
