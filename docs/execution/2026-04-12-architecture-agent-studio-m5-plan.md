# M5 Share / Review / Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a bounded M5 slice that adds share snapshot, review package export, manifest export, and traceability outputs to Architecture Studio without new database tables.

**Architecture:** Reuse the existing `project-assets` bucket, project/canvas/chat persistence, and M3/M4 architecture context. Keep snapshot image creation on the client, keep review/manifest generation on the server, and keep all outputs authenticated except for the final public snapshot asset URL.

**Tech Stack:** Next.js/React workspace shell, Fastify HTTP routes, shared Zod contracts, Supabase storage via existing upload service, WSL Docker runtime, Vitest.

---

### Task 1: Shared Export Contracts

**Files:**
- Create: `packages/shared/src/export-contracts.ts`
- Create: `packages/shared/src/export-contracts.test.ts`
- Modify: `packages/shared/src/http.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] Add Zod schemas and types for:
  - `shareSnapshotRequest`
  - `shareSnapshotResponse`
  - `traceabilityLedgerEntry`
  - `reviewPackage`
  - `exportManifest`
- [ ] Re-export the new contracts through the shared barrel.
- [ ] Add targeted tests that accept valid payloads and reject malformed ledger/share objects.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/packages/shared && node ../../node_modules/vitest/vitest.mjs run src/export-contracts.test.ts"
```

Expected: shared export-contract coverage passes cleanly.

### Task 2: Server Export Service And Routes

**Files:**
- Create: `apps/server/src/features/exports/export-service.ts`
- Create: `apps/server/src/http/exports.ts`
- Create: `apps/server/src/http/exports.test.ts`
- Modify: `apps/server/src/app.ts`

- [ ] Write the failing server tests first for:
  - share snapshot upload route
  - review package export route
  - manifest export route
- [ ] Implement a bounded export service that gathers:
  - project summary
  - canvas content reference
  - latest `agent-plan` block when present
  - asset rows
  - derived traceability entries
- [ ] Reuse the existing upload service for snapshot storage in `project-assets`.
- [ ] Register authenticated HTTP routes under a single exports surface.
- [ ] Add useful logs around export generation and upload failures.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/server && node ../../node_modules/vitest/vitest.mjs run src/http/exports.test.ts"
```

Expected: export routes are covered by targeted tests without requiring new DB tables.

### Task 3: Web Share / Export Actions

**Files:**
- Create: `apps/web/src/components/architecture/architecture-export-card.tsx`
- Create: `apps/web/src/lib/download-file.ts`
- Create: `apps/web/test/architecture-share-export.test.tsx`
- Modify: `apps/web/src/components/architecture/architecture-studio-rail.tsx`
- Modify: `apps/web/src/app/canvas/page.tsx`
- Modify: `apps/web/src/lib/server-api.ts`
- Modify: `apps/web/test/server-api.test.ts`

- [ ] Write the failing web tests first for:
  - showing the new export actions
  - calling the correct API helpers
  - handling share snapshot success/failure
- [ ] Add a bounded export card to the Architecture Studio rail.
- [ ] Reuse the current canvas runtime to render a share snapshot blob from the live scene before upload.
- [ ] Download review package and manifest JSON with a small shared download helper.
- [ ] Surface last snapshot URL and action status in the UI.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/architecture-share-export.test.tsx test/server-api.test.ts"
```

Expected: Architecture Studio exposes working share/export affordances without regressing the rail shell.

### Task 4: Runtime Verification And Documentation

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `docs/verification/2026-04-12-architecture-agent-studio-validation.md`
- Modify: `docs/execution/ralph/m5-sharing-export-ops.prompt.md`

- [ ] Re-run the targeted shared/server/web export suites.
- [ ] Re-run the WSL Docker app stack and health checks.
- [ ] Capture at least one browser-level share/export scenario artifact.
- [ ] Sync bounded-slice evidence and residual risk into the planning and validation docs.
- [ ] Update the M5 Ralph prompt so its write scope and verification commands match the implemented slice.

Run:
```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/packages/shared && node ../../node_modules/vitest/vitest.mjs run src/export-contracts.test.ts"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/server && node ../../node_modules/vitest/vitest.mjs run src/http/exports.test.ts"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/architecture-share-export.test.tsx test/server-api.test.ts"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && docker compose -f docker-compose.local.yml --env-file /tmp/loomic.env up -d web server worker"
wsl.exe -e bash -lc "curl -sS http://127.0.0.1:3001/api/health"
```

Expected: the bounded M5 slice is validated across tests, runtime, and docs.
