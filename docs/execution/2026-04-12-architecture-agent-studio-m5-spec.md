# M5 Phase Spec: Share / Review / Export / Ops

## Goal

In the existing Loomic Architecture Studio, land a bounded M5 slice that lets a designer:

1. generate a shareable snapshot URL for the current canvas state,
2. export a structured review package from the active architecture workspace,
3. export a machine-readable manifest with traceability data,
4. verify the whole slice in the existing WSL Docker runtime without introducing new database tables.

This phase should make delivery and review practical without expanding into a full public publishing system.

## Why This Slice

The PRD freezes four M5 requirements:

- `M5.1` Share snapshot
- `M5.2` Review package
- `M5.3` Export manifest
- `M5.4` Traceability

The repo already has enough infrastructure to support a bounded version of these capabilities:

- a public `project-assets` storage bucket,
- a general upload service,
- project thumbnails already stored as public assets,
- chat/session persistence with `contentBlocks`,
- M3 agent-plan blocks,
- M4 architecture board/context derivation.

What is still missing is not raw storage, but a coherent export layer that packages these existing facts into review-ready outputs.

## Approaches Considered

### Option A: Full public share pages with persistent review records

- Add new share tables, persistent review packages, public viewer routes, and durable tokens.
- Benefit: closest to a production publishing system.
- Cost: too much database and auth surface for the current dirty worktree and milestone boundary.

### Option B: Authenticated on-demand exports plus public snapshot assets

- Generate share/export outputs from current project/canvas/chat state on demand.
- Persist only the share snapshot asset in the existing public bucket.
- Return review package and manifest directly as JSON/download responses.
- Benefit: reuses current storage/runtime boundaries, keeps M5 shippable, and avoids new tables.

### Option C: Background export jobs and async packaging

- Queue export jobs, wait for completion, and store package history.
- Benefit: strongest long-term ops story.
- Cost: too wide for the current milestone and unnecessary for the first bounded export loop.

## Chosen Design

Adopt Option B.

M5 is intentionally bounded to an authenticated, on-demand export layer:

- `share_snapshot`
  - generated from the live canvas as a rendered image blob,
  - uploaded into the existing `project-assets` public bucket,
  - returned as a public URL plus metadata,
  - no new public HTML viewer page in this phase.
- `review_package`
  - exported as structured JSON,
  - contains project summary, selected canvas scope, architecture context, latest agent plan summary, artifact references, and reviewer-facing summary fields,
  - downloaded from the web client after an authenticated API call.
- `export_manifest`
  - exported as structured JSON,
  - contains project/canvas/run/session/asset references plus a `traceabilityLedger`.
- `traceability_ledger`
  - represented as part of the review package and manifest,
  - derived from architecture strategy options, latest plan steps, current boards, and known assets,
  - not stored in a dedicated table yet.

## In Scope

- Shared contracts for:
  - share snapshot request/response,
  - review package,
  - export manifest,
  - traceability ledger entries.
- A server-side export service that gathers:
  - project metadata,
  - canvas content,
  - latest agent-plan block,
  - recent transcript summary,
  - project assets and architecture context.
- Authenticated HTTP routes for:
  - creating a share snapshot,
  - exporting a review package,
  - exporting a manifest.
- A web export surface in Architecture Studio so the user can trigger:
  - share snapshot,
  - review package download,
  - manifest download.
- Targeted tests, validation evidence, and container/runtime proof.

## Out Of Scope

- New Supabase tables for review packages, share links, or export history.
- Anonymous/public HTML review pages.
- Collaborative comments or threaded review annotations.
- ZIP packaging or PDF generation.
- Background export jobs.
- Full ops hardening for quota/rate limiting beyond current runtime checks.

## Frozen Contract For This Phase

### Shared Objects

#### `shareSnapshotRequest`

- `projectId`
- `canvasId`
- `snapshotDataUrl`
- `title?`
- `source`
  - `studio`
  - `activeBoardId?`

#### `shareSnapshotResponse`

- `snapshot`
  - `assetId`
  - `url`
  - `mimeType`
  - `createdAt`
  - `projectId`
  - `canvasId`

#### `traceabilityLedgerEntry`

- `entryId`
- `kind`
  - `strategy`
  - `plan_step`
  - `artifact`
  - `board`
- `label`
- `sourceId`
- `sourceType`
- `relatedIds`
- `recordedAt`

#### `reviewPackage`

- `project`
- `canvas`
- `selection`
  - `selectedElementIds`
  - `activeBoardId?`
- `architectureContext?`
- `latestPlan?`
- `artifacts`
- `traceabilityLedger`
- `generatedAt`

#### `exportManifest`

- `manifestVersion`
- `project`
- `canvas`
- `sessions`
- `artifacts`
- `shareSnapshots`
- `traceabilityLedger`
- `generatedAt`

## Web Design

### 1. Export Entry Surface

Keep the bounded export UI inside Architecture Studio rather than creating a global new page.

Preferred landing zone:

- extend `ArchitectureStudioRail` with a compact "Share / Export" card,
- keep actions architecture-aware by passing:
  - `projectId`
  - `canvasId`
  - `selectedCanvasElements`
  - `architectureContext`
  - `excalidrawApi`-derived snapshot export callback.

### 2. User Actions

Provide three primary actions:

- `Share snapshot`
  - render the current scene to an image blob on the client,
  - upload via authenticated API,
  - show/copy returned public URL.
- `Export review package`
  - request server-built JSON payload,
  - download it locally as a `.json` file.
- `Export manifest`
  - request server-built JSON payload,
  - download it locally as a `.json` file.

### 3. UI Feedback

The bounded slice must show:

- pending state,
- success state,
- failure state,
- last exported artifact URL or filename when relevant.

## Server Design

### 1. Export Service

Create a dedicated feature service that:

- resolves the authenticated viewer/workspace,
- loads the project and its primary canvas,
- fetches asset rows for the project,
- gathers recent chat messages for the canvas,
- extracts the latest `agent-plan` block when present,
- derives traceability entries from:
  - architecture strategy options,
  - architecture boards,
  - plan steps,
  - artifacts.

### 2. Share Snapshot Route

Add an authenticated route that:

- accepts a rendered snapshot payload from the client,
- uploads it through the existing upload service into `project-assets`,
- returns a structured `shareSnapshotResponse`.

### 3. Review Package / Manifest Routes

Add authenticated GET or POST routes that:

- return JSON payloads directly,
- avoid new persistence state for this phase,
- remain stable enough for download and future M6 extension.

## Acceptance Criteria

1. A user in Architecture Studio can create a share snapshot and receive a public asset URL.
2. A user can export a review package JSON from the active architecture workspace.
3. A user can export a manifest JSON containing traceability data.
4. The manifest/review package includes board-aware and plan-aware context when available.
5. The bounded export flows work without adding Supabase migrations.
6. Targeted shared/web/server tests pass.
7. WSL Docker runtime validation remains green after the new routes/UI land.

## File Map

- Shared
  - `packages/shared/src/export-contracts.ts` (new)
  - `packages/shared/src/http.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/export-contracts.test.ts` (new)

- Server
  - `apps/server/src/features/exports/export-service.ts` (new)
  - `apps/server/src/http/exports.ts` (new)
  - `apps/server/src/app.ts`
  - `apps/server/src/http/exports.test.ts` (new)

- Web
  - `apps/web/src/components/architecture/architecture-studio-rail.tsx`
  - `apps/web/src/components/architecture/architecture-export-card.tsx` (new)
  - `apps/web/src/app/canvas/page.tsx`
  - `apps/web/src/lib/server-api.ts`
  - `apps/web/src/lib/download-file.ts` (new)
  - `apps/web/test/architecture-share-export.test.tsx` (new)
  - `apps/web/test/server-api.test.ts` (modify or extend)

- Docs
  - `task_plan.md`
  - `findings.md`
  - `progress.md`
  - `docs/verification/2026-04-12-architecture-agent-studio-validation.md`
  - `docs/execution/ralph/m5-sharing-export-ops.prompt.md`

## Verification Commands

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/packages/shared && node ../../node_modules/vitest/vitest.mjs run src/export-contracts.test.ts"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/server && node ../../node_modules/vitest/vitest.mjs run src/http/exports.test.ts"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && node ../../node_modules/vitest/vitest.mjs run test/architecture-share-export.test.tsx test/server-api.test.ts"
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns && docker compose -f docker-compose.local.yml --env-file /tmp/loomic.env up -d web server worker"
wsl.exe -e bash -lc "curl -sS http://127.0.0.1:3001/api/health"
```

## Completion Rule

This phase is complete only when all of the following are true:

- the bounded share/export contracts exist,
- share snapshot, review package, and manifest routes are implemented,
- Architecture Studio exposes the export actions in real UI,
- targeted shared/server/web verification is green,
- runtime/container evidence is updated in the validation docs.
