# Ralph Prompt: M4 Architecture Domain Layer

## Goal
Land the bounded M4 slice that turns Architecture Studio boards into real canvas artifacts, derives `architectureContext` from the live scene, and injects that context into agent execution.

## Allowed Write Scope
- `packages/shared/src/architecture-contracts.ts`
- `packages/shared/src/contracts.ts`
- `packages/shared/src/contracts.test.ts`
- `packages/shared/src/index.ts`
- `apps/web/src/lib/architecture-canvas.ts`
- `apps/web/src/app/canvas/page.tsx`
- `apps/web/src/components/architecture/architecture-studio-rail.tsx`
- `apps/web/src/components/chat-sidebar.tsx`
- `apps/web/test/architecture-canvas.test.ts`
- `apps/web/test/architecture-studio-shell.test.tsx`
- `apps/web/test/chat-sidebar.test.tsx`
- `apps/server/src/agent/runtime.ts`
- `apps/server/src/agent/prompts/loomic-main.ts`
- `apps/server/src/agent/runtime.test.ts`
- `task_plan.md`
- `findings.md`
- `progress.md`
- `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

## Forbidden Write Scope
- Any Supabase migration or new architecture-only database table
- `apps/server/src/payments/**`
- `apps/web/src/app/login/**`
- unrelated M1-M3 files outside the bounded slice above

## Must Update
- `task_plan.md`
- `findings.md`
- `progress.md`
- `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

## Verification Commands
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/packages/shared && node ../../node_modules/vitest/vitest.mjs run src/contracts.test.ts -t \"architecture\""
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/architecture-studio-shell.test.tsx test/architecture-canvas.test.ts test/chat-sidebar.test.tsx"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/server && node ../../node_modules/vitest/vitest.mjs run src/agent/runtime.test.ts"
```

## Completion Promise
Output `<promise>M4_ARCH_DOMAIN_COMPLETE</promise>` only after:
- the shared architecture contracts are stable
- the architecture rail inserts real boards into the live canvas
- `architectureContext` reaches start / resume / retry payloads
- runtime prompt enrichment includes `<architecture_context>`
- the targeted shared, web, and server verification commands all pass
