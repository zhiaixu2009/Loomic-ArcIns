# Ralph Prompt: M5 Sharing / Export / Ops

## Goal
Implement the bounded M5 slice: authenticated share snapshot, review package export, manifest export, and traceability outputs for Architecture Studio without adding new database tables.

## Allowed Write Scope
- `packages/shared/src/export-contracts.ts`
- `packages/shared/src/export-contracts.test.ts`
- `packages/shared/src/http.ts`
- `packages/shared/src/index.ts`
- `apps/server/src/features/exports/export-service.ts`
- `apps/server/src/http/exports.ts`
- `apps/server/src/http/exports.test.ts`
- `apps/server/src/app.ts`
- `apps/web/src/components/architecture/architecture-studio-rail.tsx`
- `apps/web/src/components/architecture/architecture-export-card.tsx`
- `apps/web/src/app/canvas/page.tsx`
- `apps/web/src/lib/server-api.ts`
- `apps/web/src/lib/download-file.ts`
- `apps/web/test/architecture-share-export.test.tsx`
- `apps/web/test/server-api.test.ts`
- `task_plan.md`
- `findings.md`
- `progress.md`
- `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

## Forbidden Write Scope
- `supabase/migrations/**`
- new share/review/export database tables
- unrelated billing / auth flows
- broad non-export refactors in the canvas runtime

## Must Update
- `task_plan.md`
- `findings.md`
- `progress.md`
- `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

## Verification Commands
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/packages/shared && node ../../node_modules/vitest/vitest.mjs run src/export-contracts.test.ts"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/server && node ../../node_modules/vitest/vitest.mjs run src/http/exports.test.ts"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/architecture-share-export.test.tsx test/server-api.test.ts"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && docker compose -f docker-compose.local.yml --env-file /tmp/loomic.env up -d web server worker"
wsl.exe -e bash -lc "curl -sS http://127.0.0.1:3001/api/health"
```

## Completion Promise
Output `<promise>M5_EXPORT_OPS_COMPLETE</promise>` only after:
- share snapshot uploads to the existing `project-assets` bucket and returns a public URL
- review package and manifest export routes return structured JSON
- the Architecture Studio UI exposes the bounded share/export actions
- targeted shared, server, and web verification commands all pass
- runtime/container evidence is written back into the validation docs
