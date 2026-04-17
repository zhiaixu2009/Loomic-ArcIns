# Ralph Prompt: M2 Real-Time Team Collaboration

## Goal
Implement project/canvas collaboration primitives for presence, cursor, selection, and shared canvas mutations.

## Allowed Write Scope
- `task_plan.md`
- `findings.md`
- `progress.md`
- `apps/server/src/ws/**`
- `apps/server/src/http/canvases.ts`
- `apps/server/src/app.ts`
- `packages/shared/src/contracts.ts`
- `apps/web/src/hooks/**`
- `apps/web/src/components/**`
- `apps/web/src/app/canvas/page.tsx`
- `packages/shared/src/contracts.test.ts`
- `packages/shared/src/events.ts`
- `packages/shared/src/ws-protocol.ts`
- `apps/web/test/**`
- `apps/server/src/**/*.test.ts`
- `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

## Forbidden Write Scope
- `supabase/**`
- `apps/server/src/generation/**`

## Must Update
- `task_plan.md`
- `findings.md`
- `progress.md`
- `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

## Verification Commands
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/packages/shared && node ../../node_modules/vitest/vitest.mjs run src/contracts.test.ts -t collaboration"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && pnpm --filter @loomic/server exec vitest run src/ws/connection-manager.test.ts src/http/canvases.test.ts"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/architecture-studio-shell.test.tsx test/use-canvas-collaboration.test.tsx test/chat-sidebar.test.tsx"
```

## Baseline Audit Command
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit --pretty false"
```

Treat unchanged failures in `pricing-card.tsx`, `agent-section.tsx`, `chat-sidebar.tsx`, `chat/tool-block-view.tsx`, `chat-workbench.test.tsx`, and `env.test.ts` as historical debt. Only treat new or expanded output as an M2 regression.

## Runtime Notes

When running this prompt with `--agent codex` on the current machine, append:

```bash
-- \
--ephemeral \
-c 'model_reasoning_effort="high"'
```

The local Windows Codex config defaults to `model_reasoning_effort = "xhigh"`, which is incompatible with `gpt-5-codex`.

## Completion Promise
Output `<promise>M2_COLLAB_COMPLETE</promise>` only after collaboration contracts are coherent, the targeted verification commands pass, the baseline audit is reviewed, and all required docs are updated.
