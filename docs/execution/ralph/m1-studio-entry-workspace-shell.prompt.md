# Ralph Prompt: M1 Studio Entry + Workspace Shell

## Goal
Implement the architecture-focused studio entry and workspace shell on top of the existing Loomic app.

## Allowed Write Scope
- `apps/web/src/app/(workspace)/**`
- `apps/web/src/app/canvas/page.tsx`
- `apps/web/src/components/**`
- `apps/web/test/**`
- `docs/verification/2026-04-12-architecture-agent-studio-validation.md`
- `progress.md`

## Forbidden Write Scope
- `apps/server/**`
- `packages/shared/**`
- `supabase/**`

## Must Update
- `progress.md`
- `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

## Verification Commands
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && pnpm --filter @loomic/web test"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && pnpm --filter @loomic/web typecheck"
```

## Completion Promise
Output `<promise>M1_STUDIO_COMPLETE</promise>` only after the tests and typecheck pass.
