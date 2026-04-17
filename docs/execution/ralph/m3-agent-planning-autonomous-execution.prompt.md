# Ralph Prompt: M3 Agent Planning + Autonomous Execution

## Goal
Expose the bounded M3 slice: visible plan blocks, step lifecycle state, artifact linkage, and interrupt/resume/retry hooks inside the existing studio shell.

## Allowed Write Scope
- `apps/server/src/agent/**`
- `apps/server/src/features/agent-runs/**`
- `apps/web/src/components/**`
- `apps/web/src/hooks/**`
- `apps/server/src/ws/**`
- `packages/shared/src/contracts.ts`
- `packages/shared/src/events.ts`
- `packages/shared/src/ws-protocol.ts`
- `apps/web/test/**`
- `apps/server/src/**/*.test.ts`
- `docs/execution/2026-04-12-architecture-agent-studio-m3-spec.md`
- `docs/execution/2026-04-12-architecture-agent-studio-m3-plan.md`
- `docs/verification/2026-04-12-architecture-agent-studio-validation.md`
- `progress.md`

## Forbidden Write Scope
- `supabase/migrations/**`
- `apps/web/src/app/auth/**`

## Must Update
- `progress.md`
- `docs/verification/2026-04-12-architecture-agent-studio-validation.md`
- `docs/execution/2026-04-12-architecture-agent-studio-m3-spec.md`

## Verification Commands
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/packages/shared && node ../../node_modules/vitest/vitest.mjs run src/contracts.test.ts -t \"agent\""
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/server && node ../../node_modules/vitest/vitest.mjs run src/agent/stream-adapter.test.ts src/ws/agent-plan-blocks.test.ts src/ws/connection-manager.test.ts"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/chat-sidebar.test.tsx test/use-chat-stream.test.tsx test/use-canvas-collaboration.test.tsx"
```

## Completion Promise
Output `<promise>M3_AGENT_PLAN_COMPLETE</promise>` only after planning lifecycle behavior is verified.
