# Bug Fix Log

## 2026-04-25 - Docker Local Runtime 3000/3001 Access Stabilized

### Problem

- After rebuilding the local container runtime, the browser-facing `http://127.0.0.1:3000/home` entry and API `http://127.0.0.1:3001/api/health` were unstable.
- The observed sequence included `about:blank` / empty waiting periods, `curl` connection resets, `curl` timeouts, `server` health flipping between `healthy` and `unhealthy`, and Docker occasionally returning to `inactive` between validation commands.
- Compose sometimes reported `0.0.0.0:3000->3000` and `0.0.0.0:3001->3001`, but requests still failed, which made the runtime look rebuilt while the real browser entry was unusable.

### Root Cause

- The WSL runtime keepalive process was not reliably detached from the transient WSL command session, so the user session could shut down after startup commands exited. That shutdown propagated to `docker.service`, producing `Processing signal 'terminated'` / `Stopping docker.service` in the journal.
- `docker-compose.dev.yml` forced the Loomic app containers onto Docker `bridge` networking with published `3000/3001` ports. After Docker daemon restore cycles, the bridge/proxy layer could report published ports while requests were reset or dropped.
- Some app containers were auto-restored while Docker was still `activating`, leaving processes in a bad state: containers were `Up`, but the host listener was missing or the server process was stuck.
- The WSL startup script returned immediately after `docker compose up -d`, so callers could hit the cold-start window before Docker, Supabase, server, and Next dev were actually ready.

### Code Fix

- Updated `docker-compose.dev.yml` so `server`, `worker`, and `web` inherit `LOOMIC_DOCKER_NETWORK_MODE` with a default of `host`, matching the local env writer and avoiding the fragile bridge/proxy publish path for `3000/3001`.
- Hardened `scripts/wsl/start-keepalive.sh` by launching the keepalive loop with `setsid nohup` when available, so it survives the short WSL command session and prevents idle session teardown from stopping Docker.
- Hardened `scripts/wsl/start-local-runtime.sh` to:
  - start Docker via `systemctl start docker --no-block` when systemd is available
  - wait until `docker version` succeeds before continuing
  - keep the existing Supabase/env/Compose startup path
  - wait for `http://127.0.0.1:3001/api/health`
  - wait for `http://127.0.0.1:3000/home`
  - dump Compose status and server/web logs if readiness times out

### Verification Evidence

- Syntax checks passed in WSL:
  - `bash -n /mnt/d/97-CodingProject/Loomic-ArcIns/scripts/wsl/start-local-runtime.sh`
  - `bash -n /mnt/d/97-CodingProject/Loomic-ArcIns/scripts/wsl/start-keepalive.sh`
- Full runtime startup script passed in WSL/container environment:
  - `./scripts/wsl/start-local-runtime.sh /mnt/d/97-CodingProject/Loomic-ArcIns`
  - output included `Local runtime ready: http://127.0.0.1:3000/home`
  - output included `API health ready: http://127.0.0.1:3001/api/health`
- Container/runtime status after the fix:
  - `docker.service` was `active`
  - `loomic-arcins-server-1` was `healthy`
  - `loomic-arcins-web-1` and `loomic-arcins-worker-1` were running
  - Supabase local containers were healthy, including `supabase_auth_loomic`, `supabase_realtime_loomic`, `supabase_storage_loomic`, `supabase_analytics_loomic`, and `supabase_db_loomic`
- HTTP verification from WSL:
  - `GET http://127.0.0.1:3001/api/health` returned `200 OK`
  - `GET http://127.0.0.1:3001/api/add-gallery` returned `401 Unauthorized`, proving the route exists and auth is enforced
  - `GET http://127.0.0.1:3000/home` returned `200 OK` with the Next.js HTML payload
- Real browser verification:
  - Playwright opened `http://127.0.0.1:3000/home`
  - page title was `Loomic`
  - browser console reported `0` errors and `0` warnings

### Follow-Up

- The host-network local runtime is now the verified default for this WSL environment. If bridge networking is required again later, it should be introduced as a separate explicit compose override with its own readiness checks rather than mixed into the default local startup path.
- The Supabase CLI reported a newer version is available (`v2.90.0`, installed `v2.89.1`); this was not changed during the fix because the task was runtime stabilization, not dependency upgrade.

## 2026-04-24 - Add Gallery Sync Stabilized For Interior / Landscape / City Categories

### Scope

- Worker 1 owned the add-gallery sync for:
  - `室内效果图`
  - `景观效果图`
  - `城市效果图`
- The goal was to finish these categories without touching unrelated gallery groups and without broad cleanup against categories owned by other workers.

### Symptoms

- Category-filtered add-gallery sync runs repeatedly stopped before completion.
- Earlier runs showed two unstable behaviors:
  - WSL / Playwright wrapper sessions exiting unexpectedly mid-run
  - page fetches timing out during long subtype scans such as `室内效果图 / 客厅`
- Before this repair, the local DB only contained a partial `室内效果图` import and had no active rows for `景观效果图` or `城市效果图`.

### Root Cause

1. The browser-assisted upstream fetch path was the real bottleneck, not the DB upsert logic.
2. The previous execution path depended on a fragile browser session chain, which made large filtered sync runs fail before all owned subtypes finished.
3. The sync script had already evolved toward a Chrome CDP session model, but the stabilization work still needed:
   - a regression check around the browser command construction path
   - an execution strategy that kept each sync scope small and isolated
4. The reliable operational pattern was to run each owned subtype in its own fresh process / fresh browser session with `--skip-cleanup`, instead of one very large multi-category run.

### Fix Summary

- In `scripts/sync-jzxz-add-gallery.ts`:
  - added a regression-safe export for Playwright CLI command construction
  - added an import-safe entrypoint guard so the script can be tested without executing a sync on import
- In `scripts/sync-jzxz-add-gallery.test.mjs`:
  - added a regression test that locks the non-WSL browser command construction path used by the sync script
- Operationally:
  - switched from broad category runs to subtype-scoped runs
  - used a fresh session for each subtype
  - kept `--skip-cleanup` enabled so this worker did not deactivate rows outside the owned scope

### Verification

- Regression test:
  - `node --import tsx --test scripts/sync-jzxz-add-gallery.test.mjs`
- Smoke verification:
  - `node --env-file=.tmp/loomic-local.env --import tsx scripts/sync-jzxz-add-gallery.ts --session add-gallery-worker1-smoke2 --category-label "室内效果图" --subtype-label "默认" --download-concurrency 2 --skip-cleanup`
  - result: completed successfully with `403` assets for the scoped subtype
- Full owned-scope execution:
  - ran subtype-scoped syncs for all `24 + 7 + 5 = 36` owned subtypes with:
    - `node --env-file=.tmp/loomic-local.env --import tsx scripts/sync-jzxz-add-gallery.ts --session <fresh-session> --category-label <owned-category> --subtype-label <owned-subtype> --download-concurrency 2 --skip-cleanup`
  - shell loop exited `0`
- Final local DB evidence:
  - `室内效果图`: `subtype_count = 24`, `asset_count = 50385`
  - `景观效果图`: `subtype_count = 7`, `asset_count = 875`
  - `城市效果图`: `subtype_count = 5`, `asset_count = 769`

### Notes

- This worker intentionally did not run broad cleanup because the syncs were scoped and the repo was under concurrent multi-worker activity.
- The finished data state now matches the expected owned subtype counts for all three assigned categories.

## 2026-04-22 - Project Thumbnail Refresh Regressions

### Scope

- Existing project cards could remain blank or show stale thumbnails even after canvas content changed.
- Newly created projects could finish thumbnail generation in a new tab, but the original home tab never refreshed the card cover.

### Symptoms

- Some recent-project cards displayed a blank or tiny cover even though the canvas already contained real image content.
- Opening an existing project could still leave the home card stale until a manual refresh.
- Creating a new project from home opened the canvas in a new tab, but the original home tab could stay on the placeholder state because it never learned that the thumbnail upload had finished.

### Root Cause

1. `CanvasEditor` only guaranteed canvas saves for interactive changes, but thumbnail refreshes were not consistently queued for:
   - programmatic scene updates
   - initial normalization / hydration of existing canvases
   - storage-backed files that had not finished hydrating into Excalidraw yet
2. The homepage thumbnail refresh transport only used same-tab mechanisms:
   - `sessionStorage`
   - `CustomEvent`
   This worked for same-tab navigation, but it did not reach the original home tab when project creation happened in a newly opened tab.

### Fix Summary

- In `apps/web/src/components/canvas-editor.tsx`:
  - added explicit thumbnail queueing for `initial-load`, `change`, and `programmatic` reasons
  - deferred thumbnail export until storage-backed files finished hydrating
  - resumed deferred thumbnail uploads after storage hydration completed
  - forced an initial-load thumbnail upload so existing stale covers can self-heal on open
- In `apps/web/src/lib/project-thumbnail-refresh.ts`:
  - kept the existing same-tab `CustomEvent` + `sessionStorage` path
  - added a cross-tab `localStorage` broadcast channel so the original home tab can receive thumbnail completion signals from a different tab
- In `apps/web/test/canvas-editor-flush.test.tsx`:
  - locked regression coverage for initial-load self-heal and programmatic updates
- In `apps/web/test/home-page-shell.test.tsx`:
  - added a regression test proving the home page refreshes after a cross-tab thumbnail refresh storage event

### Verification

- Automated regression checks:
  - `node ../../node_modules/vitest/vitest.mjs run test/home-page-shell.test.tsx test/canvas-editor-flush.test.tsx test/canvas-editor-context-menu.test.tsx --reporter=dot --pool forks`
  - `node D:/97-CodingProject/Loomic-ArcIns/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/tsc.js -p D:/97-CodingProject/Loomic-ArcIns/apps/web/tsconfig.json --noEmit`
- Real browser verification:
  - authenticated into the running local site at `http://127.0.0.1:3000/home`
  - opened two same-origin home tabs in the same real browser session
  - emitted a thumbnail refresh payload from tab 2 through `localStorage`
  - confirmed tab 1 received the cross-tab signal and immediately re-fetched projects
  - browser evidence:
    - console log: `[home] refreshing projects after thumbnail refresh signal`
    - network log included a fresh `GET http://127.0.0.1:3001/api/projects => 200 OK`

### Notes

- While trying to reproduce the entire "new project -> popup tab -> create -> return home" flow in Playwright CLI, the local session hit an unrelated `POST /api/projects => 401 Unauthorized` and redirected back to login. That auth issue was outside the thumbnail refresh fix itself.
- The cross-tab transport that caused the missing new-project cover was still verified directly in a real browser session and is now covered by automated tests.

## 2026-04-23 - Immediate Return Home Still Showed Missing Or Tiny Covers

### Scope

- Returning to the home page immediately after adding an image could still show no project card at first.
- A few seconds later the card could appear but continue using an earlier `20x20` placeholder cover.
- Only after a later background refresh did the card recover to the real cover size.

### Symptoms

- Path 1:
  - `首页新建项目 -> 画板内添加图片 -> 浏览器标签切回首页`
  - new card was previously missing on the first return, then recovered later
- Path 2:
  - `首页新建项目 -> 画板内添加图片 -> 画板左上角菜单 -> 点击【主页】`
  - new card was previously missing or could still lag on the old tiny cover
- Observed timing before the fix:
  - immediate return: card missing
  - around 5 seconds: card appeared but still showed a stale tiny thumbnail
  - around 15 seconds: card finally recovered to the full cover

### Root Cause

1. The home page optimistic-thumbnail recovery path was not actually protecting the first return flow because `apps/web/src/app/(workspace)/home/page.tsx` had become partially corrupted during earlier edits and failed to fully carry the intended logic.
2. Home still depended on the async `fetchProjects` result to populate cards, so on immediate return there could be a brief empty state before the refreshed project list arrived.
3. When the first fetched payload still pointed at an older blank/tiny thumbnail, home had no stable merge layer to keep a newer in-memory preview visible, so the stale `20x20` cover temporarily won.
4. The real fix needed both sides of the chain together:
   - canvas had to emit an immediate optimistic preview when recent image focus changed
   - home had to consume and render that preview synchronously before the server round-trip completed

### Fix Summary

- In `apps/web/src/app/(workspace)/home/page.tsx`:
  - rebuilt the file from a clean baseline to remove the broken JSX / mojibake state
  - added `OptimisticProjectThumbnail` and `RecentProjectCard` merging helpers
  - synchronously seeded home state from `consumePendingProjectThumbnailRefresh()` during initial render
  - rendered optimistic-only recent-project cards while the initial home fetch was still in flight
  - preferred a newer optimistic `thumbnailDataUrl` over an older fetched `thumbnailUrl`
  - preserved visible cards during background refreshes so focus / return-home updates do not blank the grid
  - cleared optimistic overrides only after home received an equal-or-newer real thumbnail from the server
- In the already prepared thumbnail pipeline:
  - `apps/web/src/components/canvas-editor.tsx` now emits immediate optimistic preview payloads when recent image focus changes
  - `apps/web/src/lib/project-thumbnail.ts` preserves `data:` preview URLs without appending cache-busting params

### Verification

- Automated regression checks:
  - `node ../../node_modules/vitest/vitest.mjs run test/project-thumbnail.test.ts test/canvas-editor-flush.test.tsx test/home-page-shell.test.tsx --reporter=dot --pool forks`
  - `node D:/97-CodingProject/Loomic-ArcIns/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/tsc.js -p D:/97-CodingProject/Loomic-ArcIns/apps/web/tsconfig.json --noEmit`
- Real browser verification on `http://127.0.0.1:3000` with account `free@test.loomic.com`:
  - path 1 project: `cover-real-tab-return-20260423`
    - created from home in a new tab
    - inserted a real local image into the canvas
    - immediately switched back to the original home tab
    - result: the new card appeared immediately and the first visible cover was already the real full-size image
    - evidence:
      - home snapshot: `.playwright-cli/page-2026-04-23T01-56-05-733Z` showed the card on first return
      - screenshot: `.playwright-cli/page-2026-04-23T02-00-05-678Z.png`
      - home console showed the optimistic refresh arriving before the stale server state could win:
        - `[home] refreshing projects after thumbnail refresh signal { projectName: cover-real-tab-return-20260423, thumbnailDataUrl: data:image/webp... }`
  - path 2 project: `cover-real-menu-return-20260423`
    - created from home in a new canvas tab
    - inserted a real local image into the canvas
    - used the canvas left-top menu `主页` action to return home in the same tab
    - result: the returned home view immediately showed the new project card with the full cover instead of a blank or `20x20` thumbnail
    - evidence:
      - home snapshot: `.playwright-cli/page-2026-04-23T02-07-57-004Z.yml`
      - screenshot: `.playwright-cli/page-2026-04-23T02-08-29-612Z.png`
      - the home console sequence showed an optimistic card was present before the full project list finished loading:
        - initial home render logged `selectedCount: 0`
        - then `prefetched homepage project canvases {count: 1}`
        - then the completed list logged `selectedCount: 9`
        This confirmed the optimistic return-home card filled the gap instead of leaving the grid blank

### Notes

- The key regression was no longer just “thumbnail upload too slow”; it was the combination of:
  - stale blank/tiny thumbnail already stored on the server
  - home not rendering the fresher in-memory preview soon enough
  - first return relying on async fetch timing
- This fix keeps the newest thumbnail preview visible from the moment the user returns home, then transparently hands off to the persisted server thumbnail once it catches up.

## 2026-04-23 - Same-Tab Browser Back Could Return Before The Latest Cover Preview Was Broadcast

### Scope

- `新建项目 -> 画板中添加多张图片 -> 点击浏览器左上角后退键 -> 返回首页`
- This only reproduces on the same-tab create fallback path:
  - the normal create flow opens the canvas in a new tab
  - when the browser blocks `window.open`, project creation falls back to in-page navigation
  - that same-tab fallback is the path behind the user-reported browser-back regression

### Symptoms

- After returning home with the browser back button, the newest project card could still show a blank or stale cover even though the canvas had already received multiple images.
- The regression was easiest to trigger when the user returned immediately, before the slower canvas save finished.

### Root Cause

1. The browser-back path depends on `CanvasPage -> popstate -> handleFlushCanvasBeforeNavigate -> CanvasEditor.flushPendingPersistence()`.
2. `flushPendingPersistence()` previously awaited `flushPendingSave()` first.
3. `flushPendingSave()` waits for the canvas `PUT` request, so the optimistic thumbnail preview broadcast was delayed behind the slower save round-trip.
4. On the same-tab fallback path, home could mount before `sessionStorage` / custom-event received the latest `thumbnailDataUrl`, so the return-home card had no fresh preview to render immediately.

### Fix Summary

- In `apps/web/src/components/canvas-editor.tsx`:
  - navigation flush now starts the save flush and thumbnail flush together instead of serializing them behind the save request
  - the optimistic thumbnail preview can be emitted while the save is still in flight
  - save errors are still surfaced after both branches settle, so the navigation flush does not silently swallow persistence failures
- In `apps/web/test/canvas-editor-flush.test.tsx`:
  - added a regression test that pins the exact failure mode
  - the new test holds `saveCanvas()` open, triggers the navigation flush, and proves `loomic:project-thumbnail-refresh:pending` already contains a `thumbnailDataUrl` before the save resolves

### Verification

- Automated regression checks:
  - `node ../../node_modules/vitest/vitest.mjs run test/project-thumbnail.test.ts test/canvas-editor-flush.test.tsx test/home-page-shell.test.tsx --reporter=dot --pool forks`
  - `node D:/97-CodingProject/Loomic-ArcIns/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/tsc.js -p D:/97-CodingProject/Loomic-ArcIns/apps/web/tsconfig.json --noEmit`
- Real browser verification on `http://127.0.0.1:3000` with account `free@test.loomic.com`:
  - forced the popup-blocked same-tab fallback in a headed Chrome session by overriding `window.open` to return `null`
  - created project `cover-back-immediate-20260423`
  - inserted four local images through the canvas page hidden multi-file image input
  - waited `100ms`, then triggered the browser back button
  - result: home returned with the `cover-back-immediate-20260423` card already showing the updated cover instead of a blank tile
  - evidence:
    - home screenshot: `output/playwright/.playwright-cli/page-2026-04-23T15-42-05-600Z.png`
    - canvas screenshot before back: `output/playwright/.playwright-cli/page-2026-04-23T15-32-38-433Z.png`
    - console log: `output/playwright/.playwright-cli/console-2026-04-23T15-08-42-534Z.log`
      - home received the optimistic refresh immediately after back:
      - `[home] refreshing projects after thumbnail refresh signal { projectName: cover-back-immediate-20260423, thumbnailDataUrl: data:image/webp... }`
      - the selected-project summary also showed the home grid already rebuilt with thumbnails:
        - `[home] selected homepage projects { selectedCount: 7, selectedWithThumbnails: 7 }`

## 2026-04-24 - Official Gallery Switched From Demo Seeds To Real DB-Backed Library Sync

### Scope

- The canvas `添加 -> 官方图库` flow needed to stop depending on hardcoded demo data and use the real public Jianzhuxuezhang gallery.
- Official gallery images had to be downloaded from the public upstream source, stored locally, and served from the local database / local storage URL instead of frontend constants.
- The local mirror also needed enough operational tooling to finish large sync jobs safely.

### Symptoms

- The previously wired official gallery API / modal chain was functional, but the local dataset only contained a smoke seed:
  - `1` category
  - `1` subtype
  - `28` assets
- Trying to expand the sync naively exposed two deeper problems:
  - the sync script originally accumulated the whole run in memory and only wrote to the database at the very end, so long-running jobs could time out without preserving meaningful progress
  - stale asset cleanup only deactivated rows by `category_id` / `subtype_id`, so shrinking a subtype sync scope could leave old assets in that same subtype active

### Root Cause

1. The official gallery data source was no longer the blocker; the real blocker was the ingestion architecture.
2. The sync pipeline used a monolithic “prepare everything -> apply once” flow, which is fragile for thousands of remote images and long browser-assisted fetches.
3. The stale-row cleanup logic compared asset rows too coarsely, so it could not remove outdated asset ids within an already-active subtype.
4. Re-running broader syncs without local-asset reuse would repeatedly re-download already mirrored assets, wasting time and making completion less likely.

### Fix Summary

- In `apps/server/src/features/official-gallery/official-gallery-sync.ts`:
  - added tested helpers for:
    - per-subtype asset limiting
    - reusing previously mirrored local asset metadata
    - stale-id diffing by concrete row id
    - targeted category / subtype filtering for focused sync runs
- In `scripts/sync-jzxz-official-gallery.ts`:
  - added `--max-assets-per-subtype` so broad initial seeding can mirror the official taxonomy without unbounded pulls
  - added local asset reuse so repeated sync runs do not re-download already mirrored files
  - changed the sync architecture to persist category / subtype / asset rows incrementally during the run instead of waiting for a single final bulk write
  - fixed cleanup to deactivate stale asset rows by `id` instead of only by parent subtype/category
  - added targeted sync controls:
    - `--category-label`
    - `--subtype-label`
    - `--skip-cleanup`
  - used the targeted mode to fill the last missing `总平素材` subtypes without re-scanning the entire library
- Data result after the completed sync work:
  - `12` categories
  - `99` subtypes
  - `5313` locally stored official gallery assets
- The locally mirrored asset URLs now resolve to the local public storage bucket:
  - `http://127.0.0.1:54321/storage/v1/object/public/official-gallery-assets/...`

### Verification

- Automated regression checks:
  - `node ../../node_modules/vitest/vitest.mjs run src/http/official-gallery.test.ts src/features/official-gallery/official-gallery-sync.test.ts --reporter=dot --pool forks`
  - `node ../../node_modules/vitest/vitest.mjs run test/server-api.test.ts test/official-gallery-library.test.ts test/canvas-tool-menu.test.tsx --reporter=dot --pool forks`
  - `node D:/97-CodingProject/Loomic-ArcIns/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/tsc.js -p D:/97-CodingProject/Loomic-ArcIns/apps/server/tsconfig.json --noEmit`
  - `node D:/97-CodingProject/Loomic-ArcIns/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/tsc.js -p D:/97-CodingProject/Loomic-ArcIns/apps/web/tsconfig.json --noEmit`
- Local DB / storage spot checks:
  - active rows after the sync:
    - `12` categories
    - `99` subtypes
    - `5313` assets
  - final targeted `总平素材` subtype counts:
    - `插画植物`: `60`
    - `铺装素材`: `60`
    - `交通车辆`: `60`
    - `运动场地`: `35`
  - sample mirrored asset row:
    - `asset_url = http://127.0.0.1:54321/storage/v1/object/public/official-gallery-assets/...`
    - `storage_bucket = official-gallery-assets`
- Real browser verification on `http://127.0.0.1:3000` with account `free@test.loomic.com`:
  - opened an existing project
  - opened the canvas `添加` dialog
  - switched to `官方图库`
  - confirmed the modal rendered the full category strip from the DB-backed API
  - confirmed the previously missing `总平素材` subtype buttons were present in the real UI:
    - `插画植物`
    - `铺装素材`
    - `交通车辆`
    - `运动场地`
  - browser console evidence showed the frontend loading the server-backed library instead of bundled constants:
    - `[official-gallery] received database-backed official gallery structure from server {categoryCount: 12}`
    - `[official-gallery] received subtype items page from server {itemCount: 35, nextOffset: null, subtypeId: og-sub-db5e8b73f7, totalCount: 35}`
  - screenshot artifact:
    - `.playwright-cli/page-2026-04-24T03-20-22-309Z.png`

### Notes

- Full unlimited upstream coverage is much larger than a single quick smoke sync, so the script now supports resumable / targeted operational workflows rather than assuming a single uninterrupted run will always finish.
- The current local mirror is intentionally persisted in the database and local storage so the canvas UI does not need to fallback to frontend hardcoded official-gallery seeds.

## 2026-04-24 - Add Gallery Now Mirrors Jianzhuxuezhang Add Content While Editor Gallery Stays Bound To The Local Editor Library

### Scope

- The canvas `添加 -> 官方图库` flow needed to mirror Jianzhuxuezhang canvas-side `添加 -> 官方图库`, not the separate image-editor sticker gallery.
- The existing locally mirrored image-editor `官方图库` data had to stay mapped to the local image editor instead of being re-downloaded or mixed into the add-material modal.
- The final delivery also needed a real-browser proof that:
  - canvas add-material requests hit `add_gallery_*`
  - image-editor sticker requests hit `official_gallery_*`

### Symptoms

- The local `添加 -> 官方图库` implementation had previously drifted toward the image-editor sticker gallery data model, so the two different upstream gallery concepts were being treated too similarly.
- The add-gallery sync tooling could not reliably finish a full public taxonomy mirror in this environment because the old browser transport path depended on `npx` / Playwright CLI availability.
- Real-browser verification on the default local Docker runtime was misleading because the running server build on `http://127.0.0.1:3001` still returned `404` for `/api/add-gallery`.
- The image editor still kept a seeded sticker-library fallback, so even after the API split it could silently show non-database sticker data when the persisted library failed to load.

### Root Cause

1. The product mapping problem was conceptual before it was technical: Jianzhuxuezhang exposes one public gallery in the canvas add flow and another in the image-editor flow, but the local implementation initially reused too much of the same gallery language and structure across both surfaces.
2. The real blocker for completing the add-gallery mirror was not database upsert logic; it was the unstable browser-transport path in `scripts/sync-jzxz-add-gallery.ts`.
3. Verification on `3000/3001` was blocked by a stale runtime, so code and data work had to be verified against a host-side runtime built from the current workspace on `3002/3003`.
4. The image editor still had a bundled fallback sticker library path, which meant the source contract was not yet strict even though the network route had already been separated.

### Fix Summary

- In `scripts/sync-jzxz-add-gallery.ts`:
  - replaced the old `npx` / Playwright CLI transport with a direct local Chrome CDP flow
  - added session reuse, runtime evaluation retries, browser reset handling, and `finally` cleanup
  - exported the image-reference evaluation expression builder so Unicode-sensitive request construction can be regression-tested
- In `tests/sync-jzxz-add-gallery.test.mjs`:
  - added a regression test that locks the generated upstream evaluation expression and preserves Chinese labels / tags
- Operationally:
  - completed the add-gallery sync into local `add_gallery_*` storage
  - confirmed the mirrored add-gallery taxonomy now matches the public upstream shape:
    - `11` categories
    - `63` subtypes
- In `apps/web/src/components/canvas/canvas-image-editor-modal.tsx`:
  - removed the seeded sticker-library fallback from the image editor
  - kept the editor sticker panel bound to the persisted `official-gallery` response only
  - changed editor sticker selection defaults to wait for the real persisted library instead of preselecting fallback ids
- In `apps/web/test/canvas-page-selection-action-bar.test.tsx`:
  - added a regression test proving the image editor now shows the persisted-gallery load error instead of silently falling back to seeded sticker data

### Verification

- Automated regression checks:
  - `node .\node_modules\vitest\vitest.mjs run tests/sync-jzxz-add-gallery.test.mjs --reporter=dot --pool forks`
  - `node ..\..\node_modules\vitest\vitest.mjs run test\canvas-page-selection-action-bar.test.tsx --reporter=dot --pool forks`
  - `node D:/97-CodingProject/Loomic-ArcIns/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/tsc.js -p D:/97-CodingProject/Loomic-ArcIns/apps/web/tsconfig.json --noEmit`
- Sync smoke verification:
  - `node --env-file=.tmp/loomic-local.env --import tsx scripts/sync-jzxz-add-gallery.ts --category-label 建筑效果图 --subtype-label 默认 --max-assets-per-subtype 1 --skip-cleanup`
- Local DB evidence:
  - add-gallery categories / subtype totals now match the upstream public config shape: `11` categories / `63` subtypes
  - final category counts included:
    - `建筑效果图`: `20` subtypes / `4292` assets
    - `室内效果图`: `24` subtypes / `50385` assets
    - `景观效果图`: `7` subtypes / `874` assets
    - `城市效果图`: `5` subtypes / `769` assets
- Real browser verification on the host runtime:
  - opened `http://127.0.0.1:3002`
  - authenticated with `free@test.loomic.com`
  - opened project `图库验证`
  - in canvas `添加 -> 官方图库`, confirmed the modal rendered DB-backed add-gallery categories including:
    - `室内效果图`
    - `彩平参考图`
    - `平立剖参考`
    - `城市效果图`
    - `竞赛效果图`
    - `建筑效果图`
    - `景观效果图`
    - `拼贴效果图`
    - `夜景效果图`
    - `室内平面图`
    - `插画效果图`
  - browser network evidence for the add-material modal:
    - `GET http://127.0.0.1:3003/api/add-gallery => 200 OK`
    - `GET http://127.0.0.1:3003/api/add-gallery/subtypes/.../items => 200 OK`
  - inserted an add-gallery image onto the canvas, opened the image editor, and confirmed the editor sticker panel still used the persisted editor gallery route:
    - `GET http://127.0.0.1:3003/api/official-gallery => 200 OK`
    - `GET http://127.0.0.1:3003/api/official-gallery/subtypes/.../items => 200 OK`

### Notes

- The default Docker dev runtime on `3000/3001` still needs a rebuild / restart if that environment must expose the new `/api/add-gallery` route; the real-browser verification for this repair was completed against the current-code host runtime on `3002/3003`.
- `add-gallery` and `official-gallery` are functionally split, but some shared response types still remain in the codebase. That is acceptable for runtime behavior today, but stronger add-gallery-specific type names would further reduce future maintenance risk.

## 2026-04-25 - Image Editor Official Gallery No Longer Stays Empty After Its Page Request Self-Cancels

### Symptoms

- In the canvas image editor, the right-side `贴图 -> 官方图库` panel could stay on `正在加载官方图库...` and show no sticker images.
- The issue was misleading because the official editor gallery data had already been downloaded locally, so it looked like the local database or Storage bucket was empty.

### Root Cause

- The downloaded data was present in the current Docker/Supabase runtime:
  - `public.official_gallery_categories`: `23` total rows / `12` active rows
  - `public.official_gallery_subtypes`: `114` total rows / `99` active rows
  - `public.official_gallery_assets`: `5373` total rows / `5313` active rows
  - `storage.objects` bucket `official-gallery-assets`: `5531` objects
- Authenticated API checks also proved the data path was live:
  - `GET /api/official-gallery` returned `12` categories / `99` subtypes
  - `GET /api/official-gallery/subtypes/og-sub-1455918d58/items?limit=15&offset=0` returned `15` items / `60` total
- The real root cause was frontend state management in `CanvasImageEditorModal`:
  - the subtype page loading effect depended on `officialStickerItemsBySubtype`
  - the same effect immediately updated `officialStickerItemsBySubtype` by adding the current page to `loadingPageIndexes`
  - that state write caused React to clean up and rerun the effect, marking the in-flight request as `cancelled`
  - when the request later resolved, the success branch skipped writing returned images because `cancelled === true`
  - the page index remained in `loadingPageIndexes`, so the guard treated the page as still loading and never retried it
- Closing/reopening the editor made the symptom more visible because the stale loading cache survived while the modal component remained mounted in the canvas page.

### Fix Summary

- In `apps/web/src/components/canvas/canvas-image-editor-modal.tsx`:
  - added `officialStickerItemsBySubtypeRef` so the page-loading effect can read the latest cache without subscribing to the state it mutates
  - removed `officialStickerItemsBySubtype` from the page-loading effect dependency list to stop the self-cancelling request loop
  - added `clearStickerItemsPageLoading(...)` and call it from effect cleanup so closing the modal or switching page/subtype does not leave stale `loadingPageIndexes`
- In `apps/web/test/canvas-page-selection-action-bar.test.tsx`:
  - added a regression test that opens the image editor, starts an official-gallery page request, closes the modal before the request resolves, reopens the editor, and verifies the page request is retried and the recovered sticker item renders

### Verification

- Container runtime health:
  - `systemctl is-active docker` returned `active`
  - `loomic-arcins-web-1`, `loomic-arcins-server-1`, and local Supabase containers were running
  - `GET http://127.0.0.1:3001/api/health` returned `{"ok":true,"service":"loomic-server","version":"0.0.0"}`
- Database/API evidence:
  - local official editor gallery tables and Storage bucket contained the counts listed above
  - authenticated API checks returned categories and subtype items from `/api/official-gallery`
- Automated regression checks in Docker:
  - before the fix, the new regression failed because `loadOfficialGallerySubtypeItemsPage` was called only once after reopening the editor
  - after the fix, `pnpm exec vitest run --dir . test/canvas-page-selection-action-bar.test.tsx` passed: `19` tests passed / `4` skipped
  - `pnpm --filter @loomic/web test` passed: `60` test files / `301` tests passed / `5` skipped
  - `pnpm --filter @loomic/web typecheck` passed: `next typegen && tsc -p tsconfig.json --noEmit`
- Real browser verification against the Docker runtime:
  - opened `http://127.0.0.1:3000/home`
  - opened existing project `图库验证`
  - selected an image on the canvas and clicked `编辑`
  - confirmed `图片编辑 -> 贴图 -> 官方图库` rendered real DB-backed sticker items such as `未标题-2_07`, `郁金香 (1)`, `小蔓长春花_03`
  - browser network evidence:
    - `GET http://127.0.0.1:3001/api/official-gallery => 200 OK`
    - `GET http://127.0.0.1:3001/api/official-gallery/subtypes/og-sub-1455918d58/items?limit=15&offset=0 => 200 OK`
  - closed the image editor and reopened it; the official gallery still displayed the same real sticker items instead of getting stuck on `正在加载官方图库...`

### Follow-Up

- The gallery is no longer empty, but the `/api/official-gallery` category-structure response currently derives subtype `assetCount` by selecting active asset subtype IDs through Supabase/PostgREST. Because the local Supabase API has a `max_rows = 1000` cap, those counts can be truncated even though the subtype page endpoint returns the correct `totalCount`. This does not block image rendering after this fix, but it should be cleaned up with a paginated count query or a database-side aggregate if count accuracy becomes visible in the UI.

## 2026-04-25 - Add Gallery Uses Persisted Thumbnail URLs Instead Of Loading Original Images In The Grid

### Symptoms

- The canvas `添加 -> 官方图库` panel loaded image cards very slowly.
- While the gallery was loading, the UI above the image grid could feel stuck because the browser was downloading and decoding many original-size images at once.
- The local add-gallery database already contained a large public mirror, so the slow path was not caused by missing data:
  - `public.add_gallery_assets`: `67866` rows
  - rows with `source_thumb_url`: `67866`

### Root Cause

- Real browser inspection of Jianzhuxuezhang showed that its add-gallery panel requests `pageSize=30` and renders each card from `thumbUrl`, not `largeUrl`.
- The upstream thumbnail URL has a resize transform such as `?x-tos-process=image/resize,w_480`, and rendered images report `naturalWidth = 480`.
- The local database had the same upstream thumbnail URL persisted as `source_thumb_url`, but the add-gallery service did not select or expose that column.
- The shared HTTP schema did not allow a `thumbnailUrl` field for gallery items, so even if the service returned it the response contract would not preserve it reliably.
- The frontend grid rendered `<img src={item.url}>`, where `item.url` points to the locally stored original image in Supabase Storage. One sampled original response was about `2.9 MB`, and table dimensions ranged up to `12600 x 17222`, so opening 30 cards could trigger large downloads and expensive image decode work.
- Runtime verification initially still showed no `thumbnailUrl` because `loomic-arcins-server-1` is an image-based production container without a source bind mount. The server and worker images had to be rebuilt from the latest workspace before 3001 reflected the fix.

### Fix Summary

- In `packages/shared/src/http.ts`, extended `officialGalleryItemSchema` with optional `thumbnailUrl`.
- In `apps/server/src/features/add-gallery/add-gallery-service.ts`, selected `source_thumb_url` from `public.add_gallery_assets` and mapped it to `thumbnailUrl`, falling back to `asset_url` only when no thumbnail exists.
- In `apps/web/src/components/canvas-tool-menu.tsx`, changed the add-gallery page size from `60` to `30` to match Jianzhuxuezhang's real add-gallery API behavior.
- In the same grid, changed image rendering to `src={item.thumbnailUrl ?? item.url}` and added `loading="lazy"`, `decoding="async"`, and `sizes` so small thumbnails are used for browsing.
- Kept canvas insertion bound to the original `item.url`, so browsing uses lightweight thumbnails while inserted canvas images still use the locally stored original asset.
- Added server and web regression coverage proving:
  - `source_thumb_url` is selected and returned as `thumbnailUrl`
  - the route response preserves `thumbnailUrl`
  - the add-gallery grid renders thumbnail URLs
  - insertion still passes the original image URL to the canvas

### Verification

- Rebuilt the Docker runtime server image after discovering the running 3001 container was stale:
  - `docker compose -f docker-compose.local.yml -f docker-compose.dev.yml up -d --build server worker`
  - `loomic-arcins-server-1` restarted and became healthy
- Database evidence in Docker:
  - `select count(*) filter (where source_thumb_url is not null), count(*) from public.add_gallery_assets;`
  - result: `67866|67866`
- Authenticated API evidence against Docker runtime:
  - `GET http://127.0.0.1:3001/api/add-gallery => 200`
  - `GET http://127.0.0.1:3001/api/add-gallery/subtypes/ag-sub-e78e51d892/items?limit=30&offset=0 => 200`
  - first returned item keys included `thumbnailUrl`
  - first `thumbnailUrl` was `http://image-assets.soutushenqi.com/...png?x-tos-process=image/resize,w_480`
  - first `url` still pointed to local Supabase Storage under `/storage/v1/object/public/add-gallery-assets/...`
- Real browser verification against Docker runtime:
  - opened `http://127.0.0.1:3000/canvas?id=c2d39249-5f0f-42eb-b462-23c2f56e8886&studio=architecture`
  - opened `添加 -> 官方图库`
  - confirmed the dialog rendered `30` image cards for the first page
  - DOM inspection showed the first 8 rendered `<img>` nodes all used `resize,w_480` thumbnail URLs
  - DOM inspection showed none of the first 8 rendered `<img>` nodes used `/storage/v1/object/public/add-gallery-assets/` original URLs
  - first rendered thumbnail reported `naturalWidth: 480`
  - Network panel showed add-gallery page requests using `limit=30` and image requests using `image-assets.soutushenqi.com/...resize,w_480`
- UI responsiveness smoke check in the real browser:
  - switched the gallery subtype to `酒店`
  - after `2201 ms`, `30 / 30` image cards were loaded
  - `setInterval(50ms)` sampling recorded `43` samples, max drift `66 ms`, p95 drift `65 ms`
  - Long Task sampling recorded `1` long task, max `77 ms`
- Automated checks in Docker:
  - `pnpm exec vitest run src/features/add-gallery/add-gallery-service.test.ts src/http/add-gallery.test.ts --reporter=dot --pool forks` passed: `2` files / `4` tests
  - `pnpm exec vitest run --dir . test/canvas-tool-menu.test.tsx --reporter=dot` passed: `1` file / `15` tests
  - `pnpm --filter @loomic/shared typecheck` passed
  - `pnpm --filter @loomic/server typecheck` passed
  - `pnpm --filter @loomic/web typecheck` passed

### Follow-Up

- The add-gallery card grid now follows Jianzhuxuezhang's thumbnail browsing path, but the thumbnails themselves are upstream `source_thumb_url` values persisted in the local database. The original images remain locally stored under Supabase Storage for canvas insertion.
- Local Supabase image transform URLs under `/storage/v1/render/image/public/...` returned `404` in this runtime, so a future fully local thumbnail strategy should either pre-generate local thumbnail objects during sync or fix the local Storage transform path before switching away from persisted upstream thumbnail URLs.

## 2026-04-25 - Add Gallery Infinite Scroll And Image Editor Tool Interaction Repair

### Symptoms

- The canvas left-toolbar `添加 -> 官方图库` panel still used a bottom `加载更多` button, while the target Jianzhuxuezhang interaction loads the next waterfall batch as the user scrolls downward.
- The add-gallery modal's internal scrollbar was visually heavy and could draw attention even when the user was not interacting with the scroll region.
- The image editor right-side `贴图` gallery still showed an extra official-gallery status row, exposed native horizontal scrollbars in the first-level and second-level category strips, and did not use the black-filled selected style for the first-level category.
- The image editor preview stage did not respond to mouse-wheel zoom.
- The image editor left tools had focused interaction bugs:
  - dragging an `箭头` from bottom-right to top-left reversed the intended arrow direction because the shape rect was normalized like a rectangle
  - typed `文字` could contain line breaks, but SVG render/export handled it as a single text node
  - `裁剪` had no visible resize handles, so its hit zones felt broken
  - `涂鸦` finalized the stroke on `pointerleave`, so pointer capture could not preserve drawing continuity when the pointer briefly left the SVG stage

### Root Cause

- `apps/web/src/components/canvas-tool-menu.tsx` already had append pagination and cache state, but the only append trigger was the explicit `加载更多官方图库图片` button.
- The add-gallery body used a plain `overflow-y-auto` scrollbar without a stable/hidden-scrollbar utility, so the scrollbar was always visually present on classic scrollbar platforms.
- `apps/web/src/components/canvas/canvas-image-editor-modal.tsx` rendered editor gallery category strips as native `overflow-x-auto` rows and retained the old local-official status block.
- The image editor stage derived its SVG `viewBox` only from `cropRect` / full-image crop mode and had no wheel-driven zoom state.
- The draw-shape branch always called `normalizeRect(...)`; this is correct for rectangle/ellipse but incorrect for line/arrow overlays because the sign of `width/height` encodes the drag direction.
- The SVG stage used `onPointerLeave={handleStagePointerUp}`, which ended draw interactions even when pointer capture should keep the stroke alive.

### Code Fix

- Added shared CSS utilities in `apps/web/src/app/globals.css`:
  - `scrollbar-hover-gutter` reserves `scrollbar-gutter: stable`, keeps the scrollbar thin, hides the thumb by default, and shows it on hover/focus/active scrolling
  - `scrollbar-hidden` hides native horizontal scrollbars for tab/category strips
- Updated `apps/web/src/components/canvas-tool-menu.tsx`:
  - added a scroll handler on `architecture-add-dialog-body`
  - triggers `loadOfficialGallerySubtypeData(..., { append: true })` when the user scrolls within `280px` of the bottom
  - removed the `加载更多` button and replaced it with passive status text such as `向下滚动继续加载`
  - added a `data-scrolling` state so the scrollbar thumb can appear during active scroll
  - changed the pagination status to prefer the subtype page endpoint's `totalCount` over stale/zero category `assetCount`
- Updated `apps/web/src/components/canvas/canvas-image-editor-modal.tsx`:
  - removed the editor gallery's extra `官方图库 / 已切换为本地受控图库` status block, leaving only `本地上传` in the right header
  - wrapped first-level and second-level sticker categories with left/right arrow buttons and hidden native scrollbar strips
  - changed first-level selected category styling to black fill with white text
  - added preview wheel zoom state by adjusting the SVG `viewBox` around the cursor position
  - preserved signed `width/height` for line and arrow drawing while keeping rectangle/ellipse normalization
  - normalized text input to single-line content and treats Enter as commit instead of inserting a newline
  - rendered eight visible crop resize handles
  - replaced pointer-leave finalization with pointer-cancel handling so doodle strokes continue while pointer capture remains active
  - wrapped pointer capture/release in best-effort helpers so cancelled or synthetic pointer sequences do not surface `NotFoundError`
  - moved preview wheel handling to a native SVG `wheel` listener with `{ passive: false }` so zoom can prevent default scrolling without passive-listener console noise
- Added `apps/web/test/canvas-image-editor-modal.test.tsx` and expanded `apps/web/test/canvas-tool-menu.test.tsx` with regression coverage for the behaviors above.

### Verification

- Red/green evidence in the Docker web container:
  - initial targeted run failed on the new assertions for missing infinite-scroll class/handler, missing editor gallery arrow controls, unchanged wheel `viewBox`, missing crop handles, and incomplete pointer interactions
  - after the implementation, `pnpm exec vitest run --dir . test/canvas-tool-menu.test.tsx test/canvas-image-editor-modal.test.tsx --reporter=dot` passed: `2` files / `21` tests
- Type verification in Docker:
  - `pnpm --filter @loomic/web typecheck` passed with `next typegen && tsc -p tsconfig.json --noEmit`
- Bounded page-level regression in Docker:
  - `pnpm exec vitest run --dir . test/canvas-page-selection-action-bar.test.tsx test/canvas-tool-menu.test.tsx test/canvas-image-editor-modal.test.tsx --reporter=dot` passed: `3` files / `40` tests passed / `4` skipped
  - this bounded run still emits existing intentional stderr logs from tests that simulate official-gallery failure and download-export failure; the new targeted files are clean
- Real browser verification against Docker runtime `http://127.0.0.1:3000`:
  - opened existing canvas project `c2d39249-5f0f-42eb-b462-23c2f56e8886`
  - opened `添加 -> 官方图库`
  - DOM/runtime proof:
    - before scroll: `30` image buttons
    - after scrolling the modal body to bottom: `60` image buttons
    - no `加载更多` button or `加载更多官方图库图片` aria label existed
    - pagination status changed from `已展示 30 / 311 张本地图库图片` to `已展示 60 / 311 张本地图库图片`
    - modal scroll body reported `scrollbarGutter: stable`, `scrollbarWidth: thin`, and class `scrollbar-hover-gutter`
  - inserted an official add-gallery image, selected it, and opened `图片编辑`
  - editor gallery DOM/runtime proof:
    - exactly one `本地上传` button in the editor gallery header
    - `已切换为本地受控图库` was absent
    - first-level and second-level category arrow controls existed
    - both category strips had `scrollbar-hidden`
    - selected first-level category had black fill (`oklch(0.208 0.042 265.755)`) and white text
  - editor interaction proof:
    - wheel event changed preview SVG `viewBox` from `0 0 4132 2232` to `315.1525... 165.5293... 3501.6949... 1891.5254...`
    - arrow draw from bottom-right to top-left produced a line whose `x2 < x1` and `y2 < y1`
    - text tool opened the textarea and normalized `Line one\nLine two` to `Line one Line two`
    - crop tool rendered `8` visible crop handles
    - doodle stroke retained `3` points after a synthetic `pointerleave`, proving it continued after leaving the SVG stage
  - screenshot evidence:
    - `D:/97-CodingProject/Loomic-ArcIns/.tmp/browser-add-gallery-verified.png`
    - `D:/97-CodingProject/Loomic-ArcIns/.tmp/browser-image-editor-verified.png`

### Follow-Up

- The add-gallery infinite-scroll trigger is intentionally scroll-threshold based rather than an `IntersectionObserver` sentinel because the modal's existing body scroll container is already the authoritative scroll region. If the grid later switches to virtualization, the same regression should be kept while moving the trigger to the virtualizer's range/end callback.
- The editor gallery now uses arrow buttons and hidden native scrollbars, but the data source still comes from the existing persisted editor official gallery. This task did not change gallery sync/import behavior.

## 2026-04-26 - Add Gallery Image Loading Performance And Sticker Header Cleanup

### Symptoms

- The left-toolbar `添加 -> 官方图库` felt slow while loading image batches.
- The gallery area could make the upper UI feel blocked because each loaded batch mounted and decoded too many images at once.
- A visible `贴图` title remained at the top of the image-editor right gallery header, which was no longer needed after the header was simplified to keep only `本地上传`.

### Root Cause

- Runtime browser inspection showed `添加 -> 官方图库` did not contain a `贴图` text node, but the image-editor right gallery still rendered a standalone `贴图` heading in `CanvasImageEditorModal`.
- The add-gallery grid already preferred `thumbnailUrl` and used `decoding="async"`, but it still requested and mounted `30` cards per batch. That made the first render heavier than the image-editor gallery, whose official-gallery page size is `15`.
- The add-gallery infinite-scroll implementation merged each loaded batch into a growing DOM list. Without a lighter batch size and browser-level render containment, the grid became progressively more expensive while scrolling through large categories.

### Code Fix

- Updated `apps/web/src/components/canvas-tool-menu.tsx`:
  - changed `OFFICIAL_GALLERY_PAGE_SIZE` from `30` to `15` so the initial and follow-up waterfall batches match the lighter editor-gallery loading cadence
  - added `OFFICIAL_GALLERY_EAGER_IMAGE_COUNT = 6`
  - marks the first 6 images in the current loaded set as `loading="eager"` and `fetchPriority="high"` for faster visible-first paint
  - keeps later images as `loading="lazy"` and `fetchPriority="auto"` to avoid unnecessary network/decode pressure
  - keeps `decoding="async"` and `thumbnailUrl ?? item.url`, so browsing continues to use lightweight thumbnails while insertion still uses the original image URL
  - added `content-visibility: auto` and `contain-intrinsic-size` on gallery cards to reduce off-screen render/layout work as infinite-scroll content grows
- Updated `apps/web/src/components/canvas/canvas-image-editor-modal.tsx`:
  - removed the standalone `贴图` title from the right gallery header
  - removed the now-unneeded top margin from the `本地上传` button so the header remains visually compact
- Updated tests:
  - `apps/web/test/canvas-tool-menu.test.tsx` now asserts the add gallery does not render `贴图`, requests page size `15`, and gives the first image eager/high-priority loading while preserving thumbnail browsing
  - `apps/web/test/canvas-image-editor-modal.test.tsx` and `apps/web/test/canvas-page-selection-action-bar.test.tsx` now assert the editor gallery no longer renders the `贴图` header

### Verification

- Red/green evidence in the Docker web container:
  - before the production change, `pnpm exec vitest run --dir . test/canvas-tool-menu.test.tsx test/canvas-image-editor-modal.test.tsx test/canvas-page-selection-action-bar.test.tsx --reporter=dot` failed on the new assertions:
    - editor modal still contained the `贴图` header
    - add gallery first image still used `loading="lazy"` instead of eager/high-priority loading
  - after the implementation, the same command passed:
    - `3` files passed
    - `40` tests passed
    - `4` tests skipped
- Type verification in the Docker web container:
  - `pnpm --filter @loomic/web typecheck` passed
  - command ran `next typegen && tsc -p tsconfig.json --noEmit`
- Real-browser verification against Docker runtime `http://127.0.0.1:3000`:
  - opened existing canvas project `c2d39249-5f0f-42eb-b462-23c2f56e8886`
  - opened `添加 -> 官方图库`
  - DOM/runtime proof after reload:
    - `hasStickerText: false`
    - initial image count: `15`
    - status: `已展示 15 / 311 张本地图库图片`
    - first 6 images reported `loading="eager"`, `fetchpriority="high"`, `decoding="async"`, and `naturalWidth: 480`
    - the 7th image reported `loading="lazy"` and `fetchpriority="auto"`
    - first gallery card computed style reported `contentVisibility: auto`
  - scrolled the modal body to the bottom:
    - image count increased from `15` to `30`
    - status changed to `已展示 30 / 311 张本地图库图片`
    - last image remained `loading="lazy"` and `fetchpriority="auto"`
  - screenshot evidence:
    - `D:/97-CodingProject/Loomic-ArcIns/.tmp/browser-add-gallery-performance-verified.png`

### Follow-Up

- The add-gallery thumbnails are still the persisted upstream `source_thumb_url` values, while original insertable images remain local Supabase Storage URLs. A future fully local thumbnail strategy should pre-generate local thumbnail objects during sync or fix the local Supabase image-transform path before replacing the upstream thumbnail URLs.
- The current fix keeps the user's required waterfall/infinite-scroll interaction. If categories later become much larger in single-session browsing, the next step should be true list virtualization with stable spacer heights rather than reverting to a visible pagination button.

## 2026-04-26 - 编辑图库缩略图性能修复与添加图库瀑布流回退

### Symptoms

- 用户确认前一轮定位范围有误：需要优化的是图片编辑弹窗右侧的【编辑】图库，而不是左侧【添加】图库。
- 图片编辑弹窗右侧顶部仍有独立的【贴图】标题，用户要求删除，只保留右上角【本地上传】按钮。
- 【编辑】图库加载图片慢，原因需要按【添加】图库已经验证过的“缩略图浏览、原图插入”思路处理。
- 【添加】图库不应该被改成更小批次或显式按钮分页，需要恢复原来的瀑布式滚动追加体验。

### Root Cause

- `apps/server/src/features/official-gallery/official-gallery-service.ts` 的官方编辑图库接口只返回 `asset_url`，没有选择并返回数据库里的 `source_thumb_url`，导致编辑图库网格只能用本地 Supabase Storage 原图 URL 作为 `<img src>`。
- `apps/web/src/components/canvas/canvas-image-editor-modal.tsx` 的 `mapOfficialGalleryItemToStickerItem(...)` 把 `item.url` 同时用于网格预览和插入画布，缺少“浏览图源”和“插入图源”的分离。
- 同一文件的右侧图库 header 仍渲染独立 `贴图` 文本节点；这才是用户反馈的右上方文字来源，和左侧【添加】图库无关。
- 前一轮把【添加】图库 batch 从 `30` 改成 `15` 并添加 eager/high-priority 与 `content-visibility`，这不符合用户要求的“改回原来的瀑布滚动加载模式”。

### Code Fix

- 在 `apps/server/src/features/official-gallery/official-gallery-service.ts` 中：
  - `official_gallery_assets` 查询新增 `source_thumb_url`
  - 返回 item 时新增可选 `thumbnailUrl`
  - 保留 `url` 指向本地 Supabase Storage 原图，作为插入/保存时的原始资源
- 在 `packages/shared/src/http.ts` 的官方图库 item schema 中保留 `thumbnailUrl` 合同，使前端可稳定消费该字段。
- 在 `apps/web/src/components/canvas/canvas-image-editor-modal.tsx` 中：
  - `StickerItem` 新增 `originalSrc`
  - 官方图库映射改为 `src: item.thumbnailUrl ?? item.url`，`originalSrc: item.url`
  - 右侧图库网格用缩略图浏览，前 6 张 `loading="eager"` / `fetchPriority="high"`，后续 `loading="lazy"` / `fetchPriority="auto"`，统一 `decoding="async"` 与 `sizes="86px"`
  - 图片卡片增加 `[content-visibility:auto]` 与 `[contain-intrinsic-size:86px_86px]` 降低离屏渲染成本
  - `insertSticker(...)` 改为插入 `item.originalSrc ?? item.src`，确保插入画布的仍是本地数据库/Storage 中的原图
  - 删除右侧 header 中独立的 `贴图` 标题，仅保留【本地上传】按钮
- 在 `apps/web/src/components/canvas-tool-menu.tsx` 中回退【添加】图库：
  - `OFFICIAL_GALLERY_PAGE_SIZE` 恢复为 `30`
  - 图片恢复为 `loading="lazy"` / `decoding="async"`，不再设置 `fetchPriority`
  - 移除前一轮针对【添加】图库误加的 eager/high-priority 与卡片 `content-visibility`
  - 保留滚动到底自动追加下一页的瀑布流行为，不恢复【加载更多】按钮

### Verification

- 容器内目标测试：
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec loomic-arcins-web-1 sh -lc "cd /app && pnpm --filter @loomic/server exec vitest run src/features/official-gallery/official-gallery-service.test.ts --reporter=dot --pool forks && cd /app/apps/web && pnpm exec vitest run --dir . test/canvas-tool-menu.test.tsx test/canvas-image-editor-modal.test.tsx test/canvas-page-selection-action-bar.test.tsx --reporter=dot"`
  - 结果：server `1` file / `1` test passed；web `3` files passed，`40` tests passed，`4` skipped
  - 说明：该 web bundle 仍会输出两个既有的模拟失败 stderr：`official gallery unavailable` 和 `download failed`，测试结果为通过
- 容器内类型检查：
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec loomic-arcins-web-1 sh -lc "cd /app && pnpm --filter @loomic/server typecheck && pnpm --filter @loomic/web typecheck"`
  - 结果：server `tsc -p tsconfig.json --noEmit` 通过；web `next typegen && tsc -p tsconfig.json --noEmit` 通过
- 容器运行态健康检查：
  - `curl http://127.0.0.1:3001/api/health` 返回 `{"ok":true,"service":"loomic-server","version":"0.0.0"}`
  - `curl -I http://127.0.0.1:3000/home` 返回 `HTTP/1.1 200 OK`
- 真实浏览器验证，页面：`http://127.0.0.1:3000/canvas?id=c2d39249-5f0f-42eb-b462-23c2f56e8886&studio=architecture`
  - 【添加 -> 官方图库】切到 `建筑效果图 / 文化建筑` 后，首批按钮数为 `30`，状态为 `已展示 30 / 86 张本地图库图片`
  - 向底部滚动后按钮数变为 `60`，状态为 `已展示 60 / 86 张本地图库图片`
  - 未出现 `加载更多官方图库图片` 按钮
  - 第一个【添加】图库 `<img>` 为 `loading="lazy"`、`decoding="async"`、无 `fetchpriority` attribute，`fetchPriority` DOM property 为 `auto`
  - 【添加】图库 body 使用 `scrollbar-hover-gutter`，`scrollbar-gutter: stable`
  - 【编辑】图库右侧没有独立 `贴图` 文本节点，且只有一个【本地上传】按钮
  - 【编辑】图库首屏 `15` 张图片，第一张使用 `resize,w_480` 缩略图 URL，`loading="eager"`、`fetchpriority="high"`、`decoding="async"`、`sizes="86px"`、`naturalWidth=480`
  - 第 7 张【编辑】图库图片为 `loading="lazy"`、`fetchpriority="auto"`
  - 【编辑】图库卡片 class 包含 `[content-visibility:auto]`
  - 点击第一张【编辑】图库图片后，新增 SVG image 的 href 为本地 Supabase Storage 原图 URL：`http://127.0.0.1:54321/storage/v1/object/public/official-gallery-assets/...png`
  - Network 记录显示：
    - `/api/official-gallery/subtypes/.../items?limit=15&offset=0 => 200`
    - `/api/add-gallery/subtypes/.../items?limit=30&offset=0 => 200`
    - `/api/add-gallery/subtypes/.../items?limit=30&offset=30 => 200`
- 截图证据：
  - `D:/97-CodingProject/Loomic-ArcIns/.tmp/browser-editor-gallery-performance-verified.png`

### Follow-Up

- 本次明确把两套图库分开处理：左侧【添加】图库继续保持 30 张一批的瀑布滚动追加；右侧【编辑】图库采用 15 张一页的缩略图网格优化。
- 浏览器 console 检查仍可看到一个既有 WebSocket connection failed 记录，和本次图库 API、图片加载链路无关；本次未改 WebSocket 连接逻辑。
- 如果后续【编辑】图库在长时间翻页后仍有 DOM 增长压力，再考虑分页虚拟化或 keep-window 策略，不应把这个优化误加回【添加】图库。

## 2026-04-26 - 图片编辑器图库预览与工具交互回归修复

### Symptoms

- 【编辑】图库预览区已经支持鼠标滚轮缩放，但按住鼠标滚轮中键拖拽时不能平移缩放后的预览画面。
- 【编辑】图库右侧二级分类中，`植物配景`、`城市建筑` 等分类有大量图片预览空白。
- 【编辑】左侧工具条的【文字】工具在画布上反复点击会不断新增文本框，没有在首次放置文本后退出文字添加模式。
- 【编辑】左侧工具条的【裁剪】工具缺少直观的裁剪外区域灰显预览，裁剪夹点在交互后容易变得不可用或难以编辑。
- 【编辑】左侧工具条的【箭头】工具仍使用实心三角箭头，描边颜色修改没有同时作用到箭头头部，并且工具栏仍暴露不应存在的填充控制。

### Root Cause

- 预览缩放只改变 SVG `viewBox`，但编辑器没有记录任何预览平移交互状态；`handleStagePointerDown` 还会直接忽略所有非左键事件，导致中键拖拽不会进入交互流。
- 官方编辑图库现在优先使用数据库返回的第三方 `thumbnailUrl` 渲染缩略图，但部分 Huaban 等第三方缩略图会在 Chromium 中失败；前端 `<img>` 没有 `onError` 回退，所以数据存在且本地原图可用时仍会显示空白预览。
- `beginTextOverlay(...)` 创建文本后只设置 `editingTextId`，没有把 `activeTool` 从 `text` 切回 `selection`，所以后续画布点击仍继续新增文本覆盖层。
- 裁剪预览用整张灰色矩形加透明裁剪矩形表示，透明矩形不会在 SVG 中挖洞；裁剪夹点的视觉尺寸和命中尺寸也没有按当前 SVG 缩放比例统一换算。
- 箭头 SVG 预览使用 `markerEnd` 加实心三角 marker，Canvas 导出路径也绘制并填充三角形箭头；箭头还复用了形状工具栏，导致出现填充模式和填充切换按钮。

### Code Fix

- 更新 `apps/web/src/components/canvas/canvas-image-editor-modal.tsx`：
  - 新增 `PreviewPanInteraction`，在中键 `button=1/buttons=4` 或【抓手】左键拖拽时记录起始 client 坐标、起始中心点、当前可视框和基础可视范围。
  - 在 pointer move 中按 `stageMetrics.scale` 把屏幕拖拽距离换算为图像坐标，并更新 `previewCenter`，使缩放后的 SVG `viewBox` 可以被中键拖动平移。
  - 官方图库 `<img>` 增加 `onError`，第三方缩略图失败时回退到 `item.originalSrc` 本地 Supabase Storage 原图；回退日志使用 `console.info`，避免把常见降级路径刷成 warning。
  - `beginTextOverlay(...)` 在创建并选中新文本后立即 `setActiveTool("selection")`，保留当前文本编辑状态但退出连续添加状态。
  - 裁剪预览改用 `fillRule="evenodd"` / `clipRule="evenodd"` 的 SVG path 灰显裁掉区域，只保留裁剪框内部为原图；裁剪夹点视觉尺寸和命中尺寸分别用固定屏幕像素换算到图像坐标。
  - 箭头预览改为线段加开放式描边箭头头部 path，移除 `markerEnd` 三角 marker；Canvas 导出也改为两段描边箭头线，不再填充三角形。
  - 箭头样式工具栏隐藏填充模式和填充切换，只保留描边颜色与线宽控制。
- 更新 `apps/web/test/canvas-image-editor-modal.test.tsx`：
  - 新增并红绿验证中键平移、缩略图失败回退、文字工具退出添加模式、裁剪灰显 mask、开放式箭头和颜色联动回归测试。
  - 修正新增测试中的按钮名称，使用真实中文可访问名称 `文字`、`裁剪`、`箭头`。

### Verification

- Docker 容器内红测证据：
  - 修正测试按钮名后，`pnpm exec vitest run --dir . test/canvas-image-editor-modal.test.tsx --reporter=dot` 在生产代码修复前失败。
  - 失败点包括：中键拖拽后 `viewBox` 未变化、缩略图失败未回退、第二次画布点击新增文本、裁剪 mask 缺失、箭头仍带 `marker-end`。
- Docker 容器内绿测证据：
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec loomic-arcins-web-1 sh -lc "cd /app/apps/web && pnpm exec vitest run --dir . test/canvas-image-editor-modal.test.tsx --reporter=dot"`
  - 结果：`1` file passed，`11` tests passed。
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec loomic-arcins-web-1 sh -lc "cd /app/apps/web && pnpm exec vitest run --dir . test/canvas-page-selection-action-bar.test.tsx test/canvas-tool-menu.test.tsx test/canvas-image-editor-modal.test.tsx --reporter=dot"`
  - 结果：`3` files passed，`45` tests passed，`4` skipped；输出中仍有既有模拟失败场景产生的 stderr，和本次新增修复无关。
- Docker 容器内类型检查：
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec loomic-arcins-web-1 sh -lc "cd /app && pnpm --filter @loomic/web typecheck"`
  - 结果：`next typegen && tsc -p tsconfig.json --noEmit` 通过。
- 真实浏览器验证 against Docker runtime：
  - 重启 `loomic-arcins-web-1` 后打开 `http://127.0.0.1:3000/canvas?id=56b30185-bd03-4bef-afdc-345d08593ec2&studio=architecture`。
  - 选中画布图片并打开【图片编辑】弹窗。
  - 中键平移验证：滚轮缩放后 `viewBox` 从 `0 0 1788 824` 变为 `136.372881355932 62.05615835325966 1515.2542372881358 698.3050847457628`；按住中键拖拽后变为 `0 0 1515.2542372881358 698.3050847457628`，证明缩放和平移都生效。
  - 图库预览验证：`植物配景` 首屏 `15` 张、破图数 `0`、回退到本地 Storage 的图片 `9` 张；`城市建筑` 首屏 `15` 张、破图数 `0`、回退到本地 Storage 的图片 `15` 张。
  - 文字工具验证：首次放置后文本数量 `1`，再次点击画布后仍为 `1`。
  - 裁剪工具验证：存在 `image-editor-crop-outside-mask`，`fill-rule=evenodd`，`clip-rule=evenodd`，夹点数量 `8`，最小夹点宽度约 `11.99px`。
  - 箭头工具验证：填充切换按钮不可见，箭头线没有 `marker-end`，箭头头部存在且 `fill=none`；真实修改描边色为 `#00ff00` 后，箭头线和箭头头部 stroke 均为 `#00ff00`。
  - 浏览器最终状态：Console `0` errors，只有既有 WebSocket 相关 warning；缩略图回退日志已降级为 info。
  - 截图证据：`D:/97-CodingProject/Loomic-ArcIns/.tmp/browser-image-editor-tools-fixed.png`。

### Follow-Up

- 当前前端回退可以修复可见破图，但长期更稳妥的方案是在同步阶段生成并入库本地缩略图，避免持续依赖第三方 `source_thumb_url` 的可用性。
- 如果后续继续扩展裁剪工具，应补充拖拽每个方向夹点的浏览器级场景，保证视觉夹点、命中区域和实际裁剪矩形始终一致。
## 2026-04-26 - 图片编辑器缩小、涂鸦工具条、裁剪拖点与贴图变换修复

### Symptoms

- 【编辑】弹窗初始图片只能放大，不能从初始状态继续缩小；需求要求最小缩小比例为 `0.25`。
- 【编辑】弹窗的【涂鸦】工具缺少颜色和粗细浮动工具条。
- 形状、涂鸦、箭头、文字的默认颜色不是统一红色；线宽和字号按图片分辨率写入，导致高分辨率图片上视觉尺寸过小、低分辨率图片上视觉尺寸过大。
- 右侧图库一级分类默认显示数量不足，二级分类默认显示数量不足；图库缩略图缺少鼠标悬浮时的大图预览。
- 裁剪工具只有旧的拖点集合，新增的 12 个拖点中方向判断不稳定，真实浏览器里拖上边点会误触发东西/南北方向并把裁剪框压塌。
- 插入的官方图库贴图只能显示，缺少可拖动和缩放的变换控制。
- 真实浏览器验证时发现连续缩小时 `viewBox` 会漂移到图片外；同时 React `onWheel` 的 passive listener 中调用 `preventDefault()` 会产生 console error。

### Root Cause

- `PREVIEW_ZOOM_MIN` 仍限制在 `1`，初始状态下滚轮向下会被夹到原始全图范围，无法进入小于 1 倍的预览状态。
- 缩小到小于 1 倍时，缩放焦点直接使用当前 `viewBox` 下的指针坐标；连续滚轮时该焦点可逐步落到图片外，导致 `viewBox` 远离图片中心。
- 之前用 React `onWheel` 直接处理滚轮并调用 `preventDefault()`，真实 Chromium 中该链路会触发 passive event listener 报错。
- 浮动样式工具条只覆盖形状、箭头和文字，没有把 `freedraw` / `doodle` 纳入 stroke-only 工具链。
- 线宽和字号直接存为图片坐标单位，没有通过当前 SVG stage 的屏幕缩放比例做 `screen px -> image unit` 换算。
- 裁剪拖点方向判断使用 `interaction.handle.includes("n" | "s" | "e" | "w")`，而所有 handle 字符串都以 `resize-` 开头，天然包含 `e` 和 `s`，因此拖任意点都可能误入错误方向分支。
- 贴图插入后只创建 `sticker` overlay，没有进入选择模式，也没有绘制可操作的缩放手柄。

### Code Fix

- 更新 `apps/web/src/components/canvas/canvas-image-editor-modal.tsx`：
  - 将 `PREVIEW_ZOOM_MIN` 调整为 `0.25`，并保留 `PREVIEW_ZOOM_MAX = 5`。
  - 为 `zoom < 1` 的 `visibleRect` 增加图片边界内的焦点约束，允许留白但保证图片中心仍在可见区域内。
  - 抽出 `applyStageWheel(...)`，实际滚轮缩放改由 `passive: false` 的原生 `wheel` listener 处理；React `onWheel` 仅作为测试/降级兜底，并通过事件标记避免重复处理。
  - 新增 `screenPxToImageUnits(...)` / `imageUnitsToScreenPx(...)`，形状、箭头、涂鸦线宽和文字字号均按当前 stage 屏幕缩放比例换算后写入图片坐标。
  - 默认绘制颜色统一为 `#ff0000`，文字默认色也同步为红色。
  - 将 `freedraw` 和已选中 `doodle` 纳入浮动 stroke 工具条，支持描边颜色和线宽调整。
  - 将裁剪拖点扩展为 12 个，并把拖点方向解析改为只读取 `resize-` 后的方向段，避免 `resize` 前缀污染方向判断。
  - 为选中的 `sticker` overlay 绘制 4 个缩放手柄，插入贴图后自动切回 `selection`，支持拖动和等比缩放。
  - 右侧图库面板调宽，一级分类按钮按 `basis-1/3` 展示，二级分类按 `basis-1/4` 展示，并新增 `344px x 344px` 的悬浮大图预览。
- 更新 `apps/web/test/canvas-image-editor-modal.test.tsx`：
  - 新增/补强初始缩小到 `0.25`、缩小后图片仍可见、涂鸦工具条、红色默认值、屏幕像素换算、12 个裁剪拖点、裁剪上边点不压塌宽度、图库悬浮预览、贴图拖拽与缩放的回归测试。

### Verification

- Docker focused test:
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec loomic-arcins-web-1 sh -lc "cd /app/apps/web && pnpm exec vitest run --dir . test/canvas-image-editor-modal.test.tsx --reporter=dot"`
  - Result: `1` test file passed, `16` tests passed.
- Docker bounded regression:
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec loomic-arcins-web-1 sh -lc "cd /app/apps/web && pnpm exec vitest run --dir . test/canvas-page-selection-action-bar.test.tsx test/canvas-tool-menu.test.tsx test/canvas-image-editor-modal.test.tsx --reporter=dot"`
  - Result: `3` test files passed, `50` tests passed, `4` skipped.
  - Note: output still includes two expected stderr branches from existing negative-path tests: `official gallery unavailable` and `download failed`.
- Docker typecheck:
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec loomic-arcins-web-1 sh -lc "cd /app && pnpm --filter @loomic/web typecheck"`
  - Result: `next typegen && tsc -p tsconfig.json --noEmit` passed.
- Real-browser Docker validation against `http://127.0.0.1:3000/canvas?id=56b30185-bd03-4bef-afdc-345d08593ec2&studio=architecture`:
  - opened an existing canvas image through the real selection action bar and entered 【图片编辑】
  - wheel zoom-out reached `zoomApprox: 0.25`, `viewBox.width: 7152`, and `imageCenterStillVisible: true`
  - doodle toolbar showed `#ff0000` and `5px`; created doodle rendered `#ff0000` with `screenStrokePx: 5`
  - arrow rendered `#ff0000` with `screenStrokePx: 5`; text rendered `#ff0000` with `screenFontPx: 34`
  - category row reported `data-default-visible-count=3`; subcategory row reported `data-default-visible-count=4`
  - hover preview rendered `344 x 344`
  - crop handle count was `12`; dragging `resize-n-1` changed only top/height and kept width stable
  - inserted sticker had `4` resize handles, drag changed `x/y`, resize increased `width/height`
  - final browser console check returned `<no console messages found>`
  - screenshot artifact: `D:/97-CodingProject/Loomic-ArcIns/.tmp/browser-image-editor-final-verified.png`

### Follow-Up

- The current sticker resize implementation intentionally exposes 4 corner handles first. If future parity requires side-edge non-uniform scaling, add it as a separate interaction slice with explicit aspect-ratio rules.
- The editor still stores overlay geometry in image coordinates for export correctness; future work should keep screen-pixel authoring controls but continue converting into image units at the boundary.

## 2026-04-27 - 图片编辑缩放锚点、背景与选中变换修复

### Symptoms

- 图片编辑弹窗内滚轮缩放会漂移：鼠标从图像左侧/右侧切换位置继续缩放时，图像会跟着鼠标方向突然切换，而不是保持鼠标下的同一个图像点稳定。
- 缩放接近原始尺寸时，预览会被强制回到居中状态；如果用户已经把图像平移到远离中心的位置，这个自动复位会打断操作。
- 预览区同时存在整体灰色背景和 SVG 自身的白色圆角阴影背景，视觉上出现两层背景。
- 【形状】弹层里重复出现【箭头】工具，而左侧工具栏已经有独立【箭头】入口。
- 点击放置文字后需要立即进入编辑状态，点击外部结束编辑，双击文字应重新进入编辑状态。
- 形状、箭头、涂鸦绘制过程中不应显示虚线选框；使用选中状态查看这些对象时，虚线框需要带可拖拽缩放句柄。

### Root Cause

- `applyStageWheel(...)` 把每次滚轮事件的鼠标图像点直接写入 `previewCenter`，等价于“鼠标在哪，中心就跳到哪”，所以鼠标从左侧切到右侧缩放时会产生横向漂移。
- `visibleRect` 在 `zoom === 1` 时直接返回 `previewBaseRect`，绕过了用户当前的 `previewCenter`，导致缩放回自然尺寸附近时自动居中。
- 预览 SVG 自身仍带有 `bg-white`、圆角和阴影类名，叠加在外层灰色编辑背景之上。
- `SHAPE_OPTIONS` 仍包含 `arrow`，没有和独立箭头工具入口解耦。
- 非文字 overlay 的缩放逻辑只允许 `sticker` 进入 `resize-overlay` 交互；形状、箭头和涂鸦虽然能被选中，但没有统一的 resize transform。
- 绘制开始时立即 `setSelectedOverlayId(...)`，渲染层又无绘制态隐藏条件，所以绘制过程中会提前显示虚线选框。

### Code Fix

- 更新 `apps/web/src/components/canvas/canvas-image-editor-modal.tsx`：
  - 新增 `getPreviewVisibleRect(...)` 和 `clampPreviewCenterForRect(...)`，统一计算可视框，删除 `zoom === 1` 强制回到 `previewBaseRect` 的分支。
  - 重写 `applyStageWheel(...)`：先计算鼠标在当前 SVG 显示框内的比例和鼠标下的图像点，再按新 zoom 反推下一帧中心点，使同一个图像点保持在同一个屏幕位置。
  - 中键/抓手平移也复用同一套中心点约束逻辑，避免缩小和放大状态下的边界规则分裂。
  - 删除 stage SVG 自身 `bg-white`、圆角和阴影类名，仅保留 `block overflow-visible`，由外层整体灰色背景承载预览氛围。
  - 从 `SHAPE_OPTIONS` 删除 `arrow`，保留矩形、圆形和直线；箭头只通过左侧独立工具入口进入。
  - 增加 `selectionHiddenOverlayId`，绘制形状、箭头、涂鸦期间隐藏选中虚线框，pointer up/cancel 后恢复选中态。
  - 抽象 `overlaySupportsResize(...)`、`scalePointToRect(...)` 和 `resizeOverlayToRect(...)`，让 sticker、矩形、圆形、直线、箭头、涂鸦共享四角缩放句柄。
  - `resize-overlay` 交互不再只接受 sticker；当前对象已经选中且句柄可见时，即使仍处于刚绘制后的工具态，也允许句柄拖拽生效。
- 更新 `apps/web/test/canvas-image-editor-modal.test.tsx`：
  - 增加缩放锚点稳定、接近自然尺寸不自动居中、stage 无白底圆角阴影、形状弹层不重复箭头、文字编辑生命周期、绘制态隐藏选框和选中态缩放句柄的回归覆盖。

### Verification

- Docker focused red/green:
  - 修复前同一 focused 测试出现 3 个预期失败：缩放锚点投影不稳定、形状弹层箭头数量为 2、形状/箭头/涂鸦缺少可测试选框与缩放句柄。
  - 修复后执行：`wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app/apps/web loomic-arcins-web-1 pnpm exec vitest run --dir . test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - 结果：`1` file passed, `21` tests passed.
- Docker bounded regression:
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app/apps/web loomic-arcins-web-1 pnpm exec vitest run --dir . test/canvas-page-selection-action-bar.test.tsx test/canvas-tool-menu.test.tsx test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - 结果：`3` files passed, `55` tests passed, `4` skipped.
- Docker typecheck:
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app loomic-arcins-web-1 pnpm --filter @loomic/web typecheck`
  - 结果：`next typegen && tsc -p tsconfig.json --noEmit` passed.
- Real-browser validation against `http://127.0.0.1:3000/canvas?id=56b30185-bd03-4bef-afdc-345d08593ec2&studio=architecture`:
  - 打开真实画布图片的【图片编辑】弹窗，stage 类名为 `block overflow-visible`，无 `bg-white`、圆角和阴影类名。
  - 左侧滚轮缩放后 `viewBox` 从 `0 0 1788 824` 变为 `57.5299805501528 49.43931741505344 1515.2542372881358 698.3050847457628`；切到右侧继续缩放后变为 `252.7994763140423 91.33704403798009 1284.1137604136743 591.7839701235278`，缩放锚点按当前鼠标位置稳定推进而非突跳成新中心。
  - 缩回接近自然尺寸后 `viewBox` 为 `-199.82822865642436 -5.780387287523865 1819.889116232532 838.6961027827775`，`x` 没有被重置为 `0`，证明没有自动居中。
  - 形状弹层中矩形、圆形、直线各 1 个；【箭头】按钮在弹窗内总数为 1，仅保留左侧工具栏入口。
  - 矩形选中后出现 1 个 selection outline 和 4 个 resize handles；拖拽右下角句柄后矩形宽度从 `278.45297953284637` 增加到 `437.5689678373301`。
  - 箭头和涂鸦绘制后分别显示 1 个 selection outline 和 4 个 resize handles。
  - 文本放置后编辑 textarea 出现；点击外部后编辑 textarea 消失；双击文字 hitbox 后编辑 textarea 再次出现。
  - Browser console error count: `0`。
  - 截图证据：`D:/97-CodingProject/Loomic-ArcIns/.tmp/browser-image-editor-zoom-selection-verified.png`。

### Follow-Up

- 当前非文字对象统一使用四角等比缩放。若后续需要矩形/圆形支持边缘自由缩放，应作为单独交互需求补充纵横比规则和导出一致性测试。
- 真实浏览器验证中绘制过程“不显示虚线框”主要由自动化回归测试覆盖；浏览器端已验证 pointer up 后选中态与句柄可用，后续如需更细的中途视觉证据，可补充 Playwright 低层 pointer-down/move 截图脚本。
## 2026-04-27 本地运行时启动脚本归档与冷启动恢复修复

- 问题现象：用户重启电脑后重新启动项目服务，现有启动链路在 `supabase_db_loomic` 短暂 `unhealthy` 时直接失败；实际观察中数据库仍在 Postgres 启动恢复和 fsync 阶段，继续等待数分钟后会转为 `healthy`，API/Web 随后恢复。
- 根因分析：旧启动脚本直接信任 `supabase start` 的即时退出状态，没有为 Windows/WSL 重启后的 Supabase DB 冷恢复预留等待窗口；启动脚本也分散在 `scripts/windows` 与 `scripts/wsl`，记忆文件记录了具体路径，后续容易继续调用旧入口。
- 代码层修复方案：新增 `docs/scripts/startprogram` 作为统一索引和真实启动入口；新 WSL 启动脚本在 `supabase start` 未即时成功时改为等待 `supabase status` 真正可用，并输出 DB health 状态；启动流程继续保留 Docker、keepalive、Compose server health、API health 和 Web home readiness gate。旧 `scripts/windows` / `scripts/wsl` 文件改为兼容代理，转发到新目录，避免历史命令失效。
- 验证证据：启动失败后观察到 `supabase_db_loomic` 从 `unhealthy` 在等待窗口内恢复到 `healthy`，API health 与 Web home 均返回成功；`docs/scripts/startprogram` 新 `status` 入口确认 keepalive running、Docker active、Supabase 全部核心容器 healthy、`loomic-arcins-server-1` healthy、Web/API 端口成功；新 `start` 入口再次执行成功；真实浏览器打开 `http://127.0.0.1:3000/home`，页面标题为 `Loomic`，console error 数量为 0。
- 后续事项：后续任何本地运行、联调、验收、真实验证都应先阅读并执行 `docs/scripts/startprogram` 目录索引；`AGENTS.md` 不再维护具体启动脚本细节。
## 2026-04-27 - 图片编辑绘制完成选中态与缩放句柄漂移修复

### Symptoms

- 在【图片编辑】中使用【箭头】绘制完成后，新箭头立即处于选中状态，会显示紫色虚线框和四角缩放句柄；用户期望绘制完成后先保持非选中状态。
- 同类绘制工具【形状】和【涂鸦】也存在相同的自动选中体验问题。
- 选中对象后，缩放句柄悬浮时没有显示双向缩放鼠标图标，用户无法从光标状态判断句柄可以拖拽缩放。
- 拖拽缩放句柄时，当前实现会出现“句柄漂移”：鼠标移动到新位置后，句柄没有跟随鼠标，而是因为等比缩放推导到另一个位置。

### Root Cause

- `CanvasImageEditorModal` 在创建 shape / arrow / doodle overlay 时立即调用 `setSelectedOverlayId(overlayId)`，同时用 `selectionHiddenOverlayId` 临时隐藏绘制中的虚线框。
- `handleStagePointerUp(...)` 在绘制结束时统一清空 `selectionHiddenOverlayId`，但没有清空刚绘制对象的 `selectedOverlayId`，所以 pointer up 后虚线框和句柄必然显示。
- overlay 缩放函数 `resizeRectFromHandle(...)` 使用旧矩形宽高比和最大轴位移计算统一 scale，再由 scale 推导宽高。这会让被拖拽角点受另一轴约束，无法严格落在当前鼠标位置。
- resize handle 的 SVG `<rect>` 仅绘制视觉形态，没有设置 `cursor` 样式；拖拽过程中 stage 也没有保持对应 resize cursor。

### Code Fix

- 更新 `apps/web/src/components/canvas/canvas-image-editor-modal.tsx`：
  - 在 `handleStagePointerUp(...)` 中，当交互类型为 `draw-shape` 或 `doodle` 时清空 `selectedOverlayId`，让 shape / arrow / doodle 绘制完成后保持非选中状态。
  - 新增 `getOverlayResizeCursor(...)`，为 `nw/se` 句柄设置 `nwse-resize`，为 `ne/sw` 句柄设置 `nesw-resize`。
  - 新增 `activeOverlayResizeHandle` 状态，拖拽句柄期间让 stage 保持同方向 resize cursor。
  - 重写 `resizeRectFromHandle(...)`，改为以被拖拽角点的对角为锚点，直接用当前 pointer 坐标计算宽高，只在低于最小尺寸时做 clamp，不再通过最大轴位移进行等比推导。
- 更新 `apps/web/test/canvas-image-editor-modal.test.tsx`：
  - 新增回归要求：shape / arrow / doodle 绘制完成后不显示 selection outline，也不显示 resize handles；切回【选择】并点击对象后才显示选中框与 4 个句柄。
  - 新增回归要求：overlay resize handles 具有方向性 cursor；拖拽东南角句柄做非等比位移时，句柄中心必须贴近目标 pointer 位置。

### Verification

- Docker focused RED：
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app/apps/web loomic-arcins-web-1 pnpm exec vitest run --dir . test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - 修复前结果：`2 failed | 20 passed`，失败点分别命中“绘制完成后仍显示选中框”和“句柄缺少方向 cursor”。
- Docker focused GREEN：
  - 同一命令修复后通过，结果：`1` file passed, `22` tests passed.
- Docker bounded regression：
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app/apps/web loomic-arcins-web-1 pnpm exec vitest run --dir . test/canvas-page-selection-action-bar.test.tsx test/canvas-tool-menu.test.tsx test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - 结果：`3` files passed, `56` tests passed, `4` skipped.
  - 说明：输出中仍包含既有负向测试模拟产生的 `official gallery unavailable` 和 `download failed` stderr，测试结果为通过。
- Docker web typecheck：
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app loomic-arcins-web-1 pnpm --filter @loomic/web typecheck`
  - 结果：`next typegen && tsc -p tsconfig.json --noEmit` passed.
- In-app browser verification against Docker runtime：
  - 页面：`http://127.0.0.1:3000/canvas?id=56b30185-bd03-4bef-afdc-345d08593ec2&studio=architecture`
  - 在真实【图片编辑】弹窗中绘制【箭头】后，DOM 检查 `image-editor-selection-outline` 数量为 `0`，`image-editor-overlay-resize-handle` 数量为 `0`。
  - 切到【选择】工具并点击箭头后，DOM 检查 selection outline 数量为 `1`，resize handle 数量为 `4`。
  - 选中箭头后，东南角句柄 style 为 `cursor: nwse-resize;`，东北角句柄 style 为 `cursor: nesw-resize;`。
  - 继续绘制【形状】和【涂鸦】后，二者绘制完成状态均保持 selection outline `0`、resize handles `0`。
  - Browser console error count: `0`。
  - 截图证据：`D:/97-CodingProject/Loomic-ArcIns/.tmp/browser-image-editor-selection-resize-followup-verified.png`。

### Follow-Up

- 当前自由缩放规则优先满足“被拖拽句柄跟随鼠标位置”的交互诉求。若后续希望对 sticker 图片恢复强制等比缩放，需要单独设计约束光标或比例锁定反馈，避免再次出现句柄与鼠标分离的漂移感。
- 真实浏览器中已验证选中态、句柄数量、cursor 和 console；句柄严格跟随 pointer 的数值级断言由 Docker 回归测试覆盖，后续若继续强化可补一条低层 pointer-event 浏览器脚本作为额外证据。

## 2026-04-27 - 图片编辑多段句柄缩放复合放大修复

### Symptoms

- 在【图片编辑】中选中【形状】里的直线、【箭头】或【涂鸦】对象后，拖动四角缩放句柄时，鼠标移动一点点，对象会被放大或拉伸得过快。
- 如果一次拖拽中先向外拖，再往回收，最终句柄不会停在最后的鼠标位置，视觉上像第一次移动方向被锁住或后续移动方向失真。
- 这个问题在真实浏览器里更明显，因为一次拖拽会产生多次 `pointermove`；之前的单次 pointermove 单测无法覆盖这个交互路径。

### Root Cause

- `resize-overlay` 交互在 pointer down 时只保存了 `originRect`，没有保存 pointer down 时的原始 overlay 快照。
- 每次 `pointermove` 时，代码调用 `resizeOverlayToRect(overlay, interaction.originRect, nextRect)`，其中 `overlay` 是当前 React state 中已经被上一帧缩放过的对象。
- 对直线、箭头、涂鸦这类需要按点位重新映射的 overlay 来说，这会把“上一帧已缩放结果”再次按照最初矩形缩放，形成复合缩放；真实浏览器的多段 pointermove 越多，放大速度越夸张。
- 画板主页面 Excalidraw 的缩放手感更稳定，是因为 transform 过程基于 pointer down 时的元素状态快照推导当前帧，而不是在上一帧变换结果上继续叠加。

### Code Fix

- 更新 `apps/web/src/components/canvas/canvas-image-editor-modal.tsx`：
  - 在 `ResizeOverlayInteraction` 中新增 `originOverlay` 字段，pointer down 时保存当前 overlay 快照。
  - 在 `resize-overlay` 的 pointermove 分支中，改为 `resizeOverlayToRect(interaction.originOverlay, interaction.originRect, nextRect)`。
  - 这样每一帧都从拖拽开始时的对象状态重新计算当前结果，避免多次 pointermove 造成复合缩放。
- 更新 `apps/web/test/canvas-image-editor-modal.test.tsx`：
  - 新增多段 pointermove 回归测试，覆盖【形状-直线】、【箭头】、【涂鸦】。
  - 测试路径模拟真实浏览器手势：先向外拖动 SE 句柄，再往回收；最终 SE 句柄中心必须贴近最后鼠标点。

### Verification

- Docker focused RED：
  - 命令：`wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app/apps/web loomic-arcins-web-1 pnpm exec vitest run --dir . test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - 修复前结果：`1` file failed；新增测试中 `arrow` 和 `doodle` 失败，偏移约 `114px`，符合真实浏览器复合缩放症状。
- Docker focused GREEN：
  - 同一命令修复后通过。
  - 结果：`1` file passed, `25` tests passed.
- Docker bounded regression：
  - 命令：`wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app/apps/web loomic-arcins-web-1 pnpm exec vitest run --dir . test/canvas-page-selection-action-bar.test.tsx test/canvas-tool-menu.test.tsx test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - 结果：`3` files passed, `59` tests passed, `4` skipped.
  - 说明：输出中仍包含既有负向测试模拟产生的 `official gallery unavailable` 和 `download failed` stderr，但测试结果为通过。
- Docker web typecheck：
  - 命令：`wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app loomic-arcins-web-1 pnpm --filter @loomic/web typecheck`
  - 结果：`next typegen && tsc -p tsconfig.json --noEmit` passed.
- `git diff --check`：
  - 结果：通过；仅输出仓库既有 CRLF warning，无新增 whitespace error。
- In-app browser real interaction verification：
  - 页面：`http://127.0.0.1:3000/canvas?id=56b30185-bd03-4bef-afdc-345d08593ec2&studio=architecture`
  - 操作：刷新 Docker 运行态页面，选择已有画布图片，打开真实【图片编辑】弹窗。
  - 对【形状-直线】、【箭头】、【涂鸦】分别执行真实浏览器拖拽：SE 句柄先外拖，再往回收。
  - 结果：`shape-line dx=0 dy=-0.015625`、`arrow dx=0 dy=-0.015625`、`doodle dx=0 dy=-0.015625`。
  - Browser console error count: `0`。
  - 截图证据：`D:/97-CodingProject/Loomic-ArcIns/.tmp/browser-image-editor-resize-snapshot-green.png`

### Follow-Up

- 后续若继续扩展侧边句柄、旋转句柄或越过对角锚点后的翻转行为，仍应保持同一原则：pointer down 时冻结原始 overlay 快照，每个 pointermove 从该快照推导当前帧。
- 当前修复没有改变矩形、圆形、贴图的直接矩形缩放路径；它们本身不受复合点位映射影响，但继续共享同一个快照式 resize interaction 更安全。

## 2026-04-27 - 图片编辑选中移动跳跃与文字复编链路验证修复

### Symptoms

- 在【图片编辑】弹窗中，用【选择】工具移动【箭头】等已绘制对象时，鼠标开始拖动后图形会突然跳到另一侧或产生和鼠标方向不一致的位移。
- 负方向箭头最容易复现：真实浏览器里从箭头中点向右下拖拽，箭头 SVG 坐标曾出现大幅向上跳动，而不是跟随鼠标向右下移动。
- 【涂鸦】对象在一次拖拽中经过多段 `pointermove` 时，会把中间帧位移累加到最终帧，造成移动距离过大。
- 用户同时反馈【文字】仍不可编辑；本轮真实浏览器复查中，文字放置、输入、失焦、双击复编和 SVG 同步均可工作，因此本轮将文字链路补为真实交互回归验证，防止后续被拖拽事件顺序影响。

### Root Cause

- `DragOverlayInteraction` 只记录了 `startPoint` 和 bounds 左上角 `origin`，没有记录 pointer down 时的原始 overlay 快照。
- `drag-overlay` 的 `pointermove` 分支从 React 当前 state 中取 overlay 再计算下一帧位移。对于负方向 `line/arrow`，overlay 自身 `x/y` 不一定等于 normalized bounds 左上角，所以旧公式 `delta - (overlay.x - origin.x)` 会把端点方向差错误地混入拖拽位移。
- 对于 `doodle`，旧逻辑直接把“从起点到当前指针”的总 delta 加到“上一帧已经移动过的点集”上；真实浏览器一次拖拽会触发多次 `pointermove`，于是中间帧位移会被重复累加。
- 这和前一轮 resize 问题同类：变换过程必须冻结 pointer-down 源对象，再由当前指针位置推导当前帧，不能把上一帧变换结果继续作为下一帧输入。

### Code Fix

- 更新 `apps/web/src/components/canvas/canvas-image-editor-modal.tsx`：
  - 将 `DragOverlayInteraction` 的 `origin` 改为 `originOverlay: EditorOverlay`。
  - `handleOverlayPointerDown(...)` 在 pointer down 时保存当前 overlay 快照。
  - `drag-overlay` 的 `pointermove` 分支改为 `translateOverlay(interaction.originOverlay, delta)`，每一帧都从 pointer-down 快照加当前 delta 推导结果。
  - 该修复同时覆盖 rectangle/ellipse/sticker/text 的普通移动、负方向 line/arrow 的端点移动，以及 doodle 点集移动。
- 更新 `apps/web/test/canvas-image-editor-modal.test.tsx`：
  - 新增负方向箭头选中移动回归，断言 `x1/y1/x2/y2` 的变化严格匹配鼠标 delta 换算后的图像坐标 delta。
  - 新增 doodle 多段 pointermove 移动回归，断言最终点位只等于最后指针位置的 delta，不累加中间帧。
  - 新增真实 `userEvent.dblClick` 文字复编回归，验证文字放置后输入、失焦、双击复编、再次输入都会同步更新 SVG text。

### Verification

- Docker focused RED：
  - 命令：`wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app/apps/web loomic-arcins-web-1 pnpm exec vitest run --dir . test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - 修复前结果：`2 failed | 26 passed`。
  - 失败点符合预期：负方向箭头 `x1` 实际 delta 为 `-159.297...`，预期为 `63.250...`；doodle 实际 delta 为 `147.584...`，预期为 `42.166...`。
- Docker focused GREEN：
  - 同一命令修复后通过。
  - 结果：`1` file passed, `28` tests passed。
- Docker bounded regression：
  - 命令：`wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app/apps/web loomic-arcins-web-1 pnpm exec vitest run --dir . test/canvas-page-selection-action-bar.test.tsx test/canvas-tool-menu.test.tsx test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - 结果：`3` files passed, `62` passed, `4` skipped。
  - 说明：输出中仍包含既有负向测试模拟产生的 `official gallery unavailable` 和 `download failed` stderr，但测试结果为通过。
- Docker web typecheck：
  - 命令：`wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app loomic-arcins-web-1 pnpm --filter @loomic/web typecheck`
  - 结果：`next typegen && tsc -p tsconfig.json --noEmit` passed。
- `git diff --check`：
  - 结果：通过；仅输出仓库既有 CRLF warning，无 whitespace error。
- In-app browser real interaction verification against Docker runtime：
  - 页面：`http://127.0.0.1:3000/canvas?id=56b30185-bd03-4bef-afdc-345d08593ec2&studio=architecture`
  - 操作：刷新页面，从真实画板选中已有图片，点击【编辑】打开【图片编辑】。
  - 负方向箭头验证：绘制从右下到左上的箭头后，用【选择】拖拽；鼠标屏幕 delta 为 `70px / 36px`，换算后的图像坐标预期 delta 为 `103.27868852459015 / 53.114754098360656`，实际 `x1/y1/x2/y2` delta 完全一致。
  - 涂鸦验证：绘制 doodle 后，用【选择】拖拽，路径先移动到更远位置再回到最终位置；预期 delta `88.52459016393442 / 44.26229508196721`，实际 delta 完全一致。
  - 文字验证：点击【文字】放置文本后，可直接输入 `浏览器文字`；点击外部后 textarea 消失；双击文字后 textarea 再次出现；输入 `复编成功` 后 SVG text 同步为 `复编成功`。
  - Browser console error count：`0`。
  - 截图证据：`D:/97-CodingProject/Loomic-ArcIns/.tmp/browser-image-editor-drag-text-green.png`。

### Follow-Up

- 后续任何 overlay move / resize / rotate / flip 交互都应沿用同一原则：pointer down 冻结源 overlay，pointermove 从源快照和当前指针位置推导当前帧，不复用上一帧变换结果作为输入。
- 本轮真实浏览器没有复现文字输入链路断裂，但已把“放置、输入、失焦、双击复编、SVG 同步”写入自动化回归；若用户后续仍反馈文字不可编辑，应重点检查是否存在特定工具状态、z-index 覆盖或输入法组合态导致 textarea 焦点丢失。

## 2026-04-27 - 图片编辑文字真实点击焦点与双击复编修复

### Symptoms

- 在真实浏览器中点击【文字】并在图片编辑 stage 上放置文字后，页面只生成 `双击编辑文字` SVG 文本，但 `aria-label="编辑文字"` 的 textarea 没有保持可见，无法立即输入。
- 继续对已生成文字执行双击时，真实浏览器只触发文本 hitbox 的 `pointerdown` 链路，textarea 仍未出现，表现为文字仍然不可编辑。
- 该问题在原有 jsdom 单测中没有稳定暴露，因为旧测试主要直接触发 `pointerDown` 或 `doubleClick`，没有完整模拟真实浏览器的 pointer capture、pointerup/click/dblclick 事件顺序。

### Root Cause

- `beginTextOverlay(...)` 在 stage `pointerdown` 中创建文本后立即设置 `editingTextId`，随后 `useEffect` 立刻 focus/select textarea。
- 真实浏览器的一次点击尚未结束时，后续 `pointerup/click` 会把刚 focus 的 textarea blur 掉，因此编辑框一闪即消失或根本看不到。
- 文本 hitbox 的双击也受同一事件链路影响：第一次 `pointerdown` 会进入 `handleOverlayPointerDown(...)` 并把指针捕获到 stage，后续 click/dblclick 不再可靠回到 hitbox；Playwright 事件日志确认 hitbox 只收到了两次 `pointerdown`，没有收到预期的 `click/dblclick`。

### Code Fix

- 更新 `apps/web/src/components/canvas/canvas-image-editor-modal.tsx`：
  - 新增 `pendingTextFocusPointerIdRef`，文字放置时记录当前 pointerId，并让 textarea focus 延迟到同一次手势的 `pointerup` 后执行，避免被原生点击收尾事件 blur 掉。
  - 抽出 `focusEditingTextInput(...)`，统一处理文字 textarea 的 focus/select。
  - 新增 `lastTextPointerDownRef`，针对文本 hitbox 记录相邻两次 pointerdown 的 overlay、时间和位置；当第二次 pointerdown 在 450ms 内且距离小于 10 屏幕像素时，直接进入文字编辑状态，避免双击被拖拽 pointer capture 吞掉。
  - 保留 `onClick(detail >= 2)` 和 `onDoubleClick` 作为浏览器事件能正常冒泡时的兜底入口。
- 更新 `apps/web/test/canvas-image-editor-modal.test.tsx`：
  - 文字放置相关测试补齐 `pointerUp`，与真实浏览器点击链路对齐。
  - 新增“浏览器双击的第二次 pointerdown 应进入文字复编”的回归测试，覆盖 hitbox 被 pointer capture 拦截 click/dblclick 的真实路径。

### Verification

- Docker focused modal test：
  - 命令：`wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app/apps/web loomic-arcins-web-1 pnpm exec vitest run --dir . test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - 结果：`1` file passed，`29` tests passed。
- Docker bounded regression：
  - 命令：`wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app/apps/web loomic-arcins-web-1 pnpm exec vitest run --dir . test/canvas-page-selection-action-bar.test.tsx test/canvas-tool-menu.test.tsx test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - 结果：`3` files passed，`63` passed，`4` skipped。
  - 说明：输出中仍包含既有负向测试模拟产生的 `official gallery unavailable` 与 `download failed` stderr，但测试结果为通过。
- Docker web typecheck：
  - 命令：`wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app loomic-arcins-web-1 pnpm --filter @loomic/web typecheck`
  - 结果：`next typegen && tsc -p tsconfig.json --noEmit` passed。
- 真实浏览器验证：
  - 页面：`http://127.0.0.1:3000/canvas?id=56b30185-bd03-4bef-afdc-345d08593ec2&studio=architecture`
  - 操作：刷新页面后选中已有画板图片，点击【编辑】进入真实【图片编辑】弹窗。
  - 箭头移动：绘制负方向箭头后切换【选择】并拖拽，屏幕 delta 为 `90px / 55px`；换算图像坐标预期为 `180.4035874439462 / 110.2676399026764`，实际 `x1/x2` delta 为 `180.4035874439462`，实际 `y1/y2` delta 为 `110.24669794330686`，误差小于 `1.25` 图像单位。
  - 文字放置：点击【文字】后在 stage 放置文字，textarea 可见并可输入 `初次文字验证`，点击外部后 SVG text 同步为 `初次文字验证`。
  - 文字复编：双击文本 hitbox 后 textarea 再次出现，输入 `复编浏览器验证` 后 SVG text 同步为 `复编浏览器验证`。
  - Browser console error count：`0`。
  - 截图证据：`D:/97-CodingProject/Loomic-ArcIns/.tmp/image-editor-move-text-recheck.png`。

### Follow-Up

- 后续图片编辑 overlay 的双击、长按、拖拽等复合手势不要只依赖 `click/dblclick`；一旦 pointer capture 介入，应优先在 pointer 层记录时间、位置和目标来判断用户意图。
- 后续新增真实浏览器指针交互回归时，应同时覆盖完整 `pointerdown -> pointerup -> click/dblclick` 链路和“pointer capture 后 click 不回到原 hitbox”的链路，避免 jsdom 事件简化再次漏测。
## 2026-04-27 - Image editor crop handles, crop apply, style toolbar, and gallery tag scrolling

### Symptoms

- In the image editor shape toolbar, the left stroke/fill mode switch group was still shown even though the user wanted only stroke color and line width controls.
- Pressing the crop toolbar button did not actually apply the visible crop to the edited image; the crop overlay disappeared only as a tool-state change in some paths, while the underlying visible image region was not reliably committed.
- The crop frame still exposed the older 12-handle layout. The requested interaction is 8 handles only: 4 corners plus 4 edge midpoints.
- Crop edge midpoint handles needed axis-constrained dragging: top/bottom only vertical, left/right only horizontal.
- Editor gallery first-level and second-level labels were truncated or partially visible. Arrow scrolling moved by an arbitrary pixel distance, so a click could leave half-visible category text.

### Root Cause

- `handleApplyCrop(...)` wrote the bounded rectangle back to `cropDraftRect`, but did not reset preview state around the newly committed crop region; this made crop application behave like a transient draft update instead of an obvious image-region commit.
- `CROP_RESIZE_HANDLES` and `CropInteraction["handle"]` still contained the previous 12-handle identifiers (`resize-n-1`, `resize-n-2`, etc.), so the UI and pointer hit testing could not match the new 8-handle requirement.
- Crop midpoint drag logic inferred resize axes from handle names, but the old segmented handle names obscured the intended midpoint-only constraints.
- The shape toolbar still rendered the old stroke/fill toggle block before the stroke color and width controls.
- Gallery category strips used flex-fill widths plus proportional `scrollBy(...)`; in a real browser the row could expose a partial fourth/fifth tag, and `offsetLeft` was relative to a higher positioning ancestor rather than the scroll strip.

### Code Fix

- Updated `apps/web/src/components/canvas/canvas-image-editor-modal.tsx`.
- Replaced crop handles with the exact 8-handle set: `resize-nw`, `resize-n`, `resize-ne`, `resize-e`, `resize-se`, `resize-s`, `resize-sw`, `resize-w`.
- Updated `getCropHandleCenter(...)` to place midpoints at true side centers and kept corner handles at the four crop corners.
- Kept midpoint drag axis-constrained by using simple directional handles: `resize-n/s` adjust only `y/height`; `resize-e/w` adjust only `x/width`.
- Updated crop apply to compute one bounded crop rectangle, write it to `cropDraftRect`, reset `previewZoom` to `1`, reset `previewCenter` to `null`, then switch back to selection mode.
- Removed the entire left stroke/fill switch group from the shape/arrow/doodle style toolbar, leaving only stroke color and line width.
- Changed editor gallery first-level and second-level strips to fixed complete-label widths: category strip `w-[254px]` for exactly 3 complete tags; subcategory strip `w-[340px]` for exactly 4 complete tags.
- Changed category arrow scrolling to compute target offsets relative to the first tag and call `scrollTo(...)`, so one click advances exactly one tag boundary without inheriting unrelated page `offsetLeft` values.
- Added/updated tests in `apps/web/test/canvas-image-editor-modal.test.tsx` for toolbar controls, crop handle count, midpoint constraints, crop application, gallery tag widths, and tag-aligned scrolling.

### Verification

- Docker focused RED before the fix:
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app/apps/web loomic-arcins-web-1 pnpm exec vitest run --dir . test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - Result: `7 failed | 26 passed`, matching the intended regressions for old tag widths, old proportional scroll, 12 crop handles, missing new midpoint ids, crop apply, and stale stroke/fill toggles.
- Docker focused GREEN after the fix:
  - Same command passed with `1` file passed and `33` tests passed.
- Docker bounded regression:
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app/apps/web loomic-arcins-web-1 pnpm exec vitest run --dir . test/canvas-page-selection-action-bar.test.tsx test/canvas-tool-menu.test.tsx test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - Result: `3` files passed, `67` tests passed, `4` skipped.
  - Note: expected negative-test stderr still appears for mocked `official gallery unavailable` and `download failed`; test status is passing.
- Docker web typecheck:
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app loomic-arcins-web-1 pnpm --filter @loomic/web typecheck`
  - Result: `next typegen && tsc -p tsconfig.json --noEmit` passed.
- Real browser validation against Docker runtime:
  - Page: `http://127.0.0.1:3000/canvas?id=56b30185-bd03-4bef-afdc-345d08593ec2&studio=architecture`
  - Shape toolbar check: `描边模式=false`, `切换填充=false`, `描边颜色=true`, `形状线宽=true`.
  - Crop check before apply: crop handles `8`, top midpoint `1`, old `resize-n-1` handle `0`, crop rect `1`.
  - Crop apply check: after dragging the top midpoint and pressing toolbar `裁剪`, crop rect count became `0`; SVG `viewBox` became `0 154.55080049261085 1788 669.4491995073892`, proving the visible image region was committed.
  - Gallery check: category strip client width `254`, subcategory strip client width `340`.
  - Gallery visible labels before scroll: `总平素材`, `植物配景`, `人物配景`, all fully visible.
  - Gallery visible labels after one right-arrow click: `植物配景`, `人物配景`, `交通配景`, all fully visible.
  - Browser console error count: `0`.
  - Screenshot evidence: `D:/97-CodingProject/Loomic-ArcIns/image-editor-gallery-crop-verification.png`.

### Follow-Up

- If future gallery label font size or padding changes, keep the same invariant: strip width must be derived from complete tag width plus gap, not from flex leftover space.
- If crop presets later need non-destructive history separate from selection mode, split `cropDraftRect` into explicit `appliedCropRect` and `draftCropRect`; the current implementation preserves existing state shape while making the applied crop visible and test-covered.

## 2026-04-28 - Image editor gallery data, cursor, crop boundary, and tag width repair

### Symptoms

- In the image editor right-side official sticker gallery, second-level tags such as `写实植物` still used a wider four-tag strip. The latest requirement is to match the first-level row: show exactly three complete tags, and size the gallery panel around that invariant.
- `人物配景` and `交通配景` showed wrong local database assets. The first rows under affected STSQ subtypes were trees, chickens, ducks, moons, furniture, and other unrelated items.
- Selecting left editor tools did not consistently change the stage cursor. `抓手` should show grab, `文字` should show text, and drawing/crop tools should show crosshair.
- Crop handles did not expose directional resize cursors.
- After applying a crop, mouse wheel zoom could still expand the SVG `viewBox` outside the crop rectangle and reveal the original uncropped image.

### Root Cause

- The gallery UI still had the second-level strip configured as `data-default-visible-count="4"` with `w-[340px]`, while the first-level row had already moved to `3` tags and `w-[254px]`.
- The editor stage only set cursor style during active overlay resize. Tool selection state and crop resize state were not represented in the SVG cursor.
- Crop handle `<rect>` nodes had `pointerEvents="none"` and no cursor style, so hovering them gave no resize affordance.
- `getPreviewVisibleRect(...)` always allowed zoom-out below the base rect size. That is correct for uncropped initial preview zoom-out, but incorrect after a crop has been committed, because the committed crop rect is now the user-visible image boundary.
- The local `official_gallery_assets` data had been polluted by STSQ search results. The affected `source_tag` values were correct, for example `免抠-青年人` and `免抠-汽车`, but the actual stored top assets were shared across unrelated subtypes and included titles like `写实大型植物免抠` and `写实鸡免抠PNG`. The sync script accepted STSQ browser-search results without any semantic quality gate.
- Targeted official-gallery sync cleanup was global. A category/subtype-limited run without `--skip-cleanup` could deactivate unrelated gallery rows, so teams avoided cleanup and stale wrong subtype rows could remain active.

### Code Fix

- Updated `apps/web/src/components/canvas/canvas-image-editor-modal.tsx`.
- Added `data-testid="editor-sticker-panel"` and resized the editor sticker panel to `w-[360px]`.
- Changed the second-level sticker strip to `data-default-visible-count="3"` and `w-[254px]`, matching the first-level row.
- Made active sticker subtype selection prefer the first subtype that has `assetCount > 0`, falling back to the first subtype only when all are empty. This prevents a cleaned category from defaulting onto a zero-asset polluted subtype.
- Added stage cursor derivation from editor state: overlay resize, crop resize, preview pan, hand, text, crop, shape, arrow, and doodle tools.
- Added crop resize cursor mapping for corners and edge midpoints: `ns-resize`, `ew-resize`, `nwse-resize`, and `nesw-resize`.
- Kept initial image zoom-out behavior intact, but constrained `visibleRect` and wheel-derived next rect to the committed crop rect once a non-full crop is applied.
- Updated `apps/server/src/features/official-gallery/official-gallery-sync.ts`.
- Added `filterOfficialGalleryStsqAssetsByRelevance(...)` and `isOfficialGalleryStsqAssetRelevant(...)` to reject obvious STSQ cross-category leakage before sync persistence.
- Updated `scripts/sync-jzxz-official-gallery.ts`.
- Applied the STSQ quality gate inside `fetchAllStsqAssetsForSubtype(...)`; suspicious rows are logged with samples, and a subtype run fails instead of persisting if all remote results are rejected.
- Changed cleanup to scoped mode for targeted sync runs, so only current target categories/subtypes/assets are considered stale. Full cleanup is still used for true full sync.
- Updated `apps/web/test/canvas-image-editor-modal.test.tsx` with regressions for 3-tag second-level gallery width, panel width, stage cursors, crop handle cursors, and post-crop wheel bounds.
- Updated `apps/server/src/features/official-gallery/official-gallery-sync.test.ts` with STSQ quality-gate regressions for traffic and people categories.

### Local Data Repair

- In the local Supabase container, deactivated clearly polluted active assets under `人物配景` and `交通配景`.
- The data repair only targeted obvious cross-class leakage in those two categories, for example trees, plants, chickens, ducks, geese, moons, stars, furniture, and packaging material.
- Reordered remaining active assets within each affected subtype so first-page browsing starts from the cleaned set.
- Data evidence after cleanup:
  - `人物配景/青年`: `10` active assets, first titles include `日式古风人物` and `免抠时装时尚模特人物`, with no tree/chicken/duck leakage.
  - `交通配景/自行车`: `3` active assets, first titles are `自行车运动人物组合`, `骑自行车运动人物组合`, and `自行车`.
  - `交通配景/轮船`: `22` active assets, first titles are `写实轮船免抠`.
  - `交通配景/飞机`: `11` active assets, first titles are `飞机免抠素材`.
  - `交通配景/汽车`, `摩托车`, and `直升机` currently have no reliable local correct assets after removing polluted rows, so they remain at `0` rather than showing wrong material.

### Verification

- Docker focused modal RED before the UI fix:
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app/apps/web loomic-arcins-web-1 pnpm exec vitest run --dir . test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - Result: `5 failed | 29 passed`, matching missing panel test id, missing tool cursor, missing crop cursor, post-crop wheel bounds, and stale second-level tag count.
- Docker focused modal GREEN after the UI fix:
  - Same command passed with `34` tests.
- Docker server official-gallery RED before the sync helper fix:
  - `pnpm --filter @loomic/server exec vitest run src/features/official-gallery/official-gallery-sync.test.ts --reporter=dot`
  - Result: `2` expected failures because `filterOfficialGalleryStsqAssetsByRelevance` did not exist yet.
- Docker server official-gallery GREEN:
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app loomic-arcins-web-1 sh -lc "pnpm --filter @loomic/server exec vitest run src/features/official-gallery/official-gallery-sync.test.ts src/features/official-gallery/official-gallery-service.test.ts --reporter=dot"`
  - Result: `2` files passed, `19` tests passed.
- Docker bounded web regression:
  - `wsl.exe --cd /mnt/d/97-CodingProject/Loomic-ArcIns -e docker exec -w /app/apps/web loomic-arcins-web-1 pnpm exec vitest run --dir . test/canvas-page-selection-action-bar.test.tsx test/canvas-tool-menu.test.tsx test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - Result: `3` files passed, `68` passed, `4` skipped.
- Docker typechecks:
  - `pnpm --filter @loomic/web typecheck`: passed.
  - `pnpm --filter @loomic/server typecheck`: passed.
- `git diff --check`: passed with only existing CRLF warnings.
- Real-browser validation in the in-app browser:
  - Page: `http://127.0.0.1:3000/canvas?id=0a1dc7cd-098b-4dda-af76-dc24063f4b16&studio=architecture`.
  - Opened the image editor from a selected canvas image.
  - Gallery panel width: `360px`.
  - Category strip: `data-default-visible-count="3"`, width `254px`.
  - Subcategory strip: `data-default-visible-count="3"`, width `254px`.
  - Tool cursors: `抓手=grab`, `文字=text`, `裁剪=crosshair`, `箭头=crosshair`, `涂鸦=crosshair`.
  - Crop handle cursors: `resize-n=ns-resize`, `resize-e=ew-resize`, `resize-se=nwse-resize`, `resize-ne=nesw-resize`.
  - After dragging the crop top midpoint and pressing toolbar `裁剪`, a wheel zoom-out kept the `viewBox` inside the applied crop bounds.
  - `人物配景/青年` displayed person assets and no tree/chicken/duck titles.
  - `交通配景` defaulted to `自行车` because it is the first non-empty cleaned subtype, and displayed bicycle assets.
  - Browser console error count: `0`.
  - Screenshot evidence: `D:/97-CodingProject/Loomic-ArcIns/.tmp/image-editor-latest-comments-verified.png`.

### Follow-Up

- The current local data repair intentionally does not fabricate missing `汽车/摩托车/直升机` assets. If STSQ quota or authenticated scraping becomes available again, run a targeted resync for those subtypes after verifying the STSQ quality gate allows only semantically matching results.
- Future STSQ sync changes should preserve the invariant that irrelevant remote results must fail closed and not be persisted.
- Targeted sync should continue using scoped cleanup; global cleanup is only safe for a complete all-category run.

## 2026-04-29 Official Editor Gallery Low/Missing Asset Resync

### Problem

- Several official editor-gallery subtypes were still empty or under-filled after the earlier pollution cleanup.
- Confirmed local counts before this repair included `总平素材/户型总平=0`, `人物配景/青年=10`, `人物配景/人群=10`, `植物配景/攀爬植物=0`, and `交通配景/汽车/摩托车/直升机=0`.
- The user asked that low/missing directories be checked against 建筑学长 official gallery and synced locally only if matching public assets exist.

### Root Cause

- The local category/subtype rows existed and were active, but several subtypes had no persisted assets.
- Direct container calls to 建筑学长 `image/search` and `queryByTag` returned `400 API_ILLEGAL_REQUEST`, while the logged-in real browser tab could retrieve the same public metadata. The remote API therefore depends on official browser/request context, not just request body/sign shape.
- `总平素材/户型总平` had valid official `JZXZ queryByTag` results, but no local import had completed.
- `人物配景/青年` and `人物配景/人群` had more public official STSQ search results than the 10 rows left after cleanup.
- `植物配景/攀爬植物` returned `0` official results, and `交通配景/汽车` / `摩托车` / `直升机` continued to return polluted non-traffic search pages, so importing them would reintroduce wrong material.
- The STSQ people quality gate was still too broad for future sync runs: a youth search could accept child or elder assets because the generic people keyword list contained `小孩` / `儿童` / `老人`.

### Code/Data Fix

- Imported captured official-browser `JZXZ queryByTag` responses for `总平素材/户型总平` into local Supabase Storage and `official_gallery_assets`.
- Imported captured official-browser STSQ search responses for `人物配景/青年` and `人物配景/人群`.
- Limited targeted people imports to 60 active rows per subtype and scoped cleanup only to those two subtypes, deactivating stale rows not present in the current trusted set.
- Preserved the fail-closed decision for empty or polluted directories: `植物配景/攀爬植物`, `交通配景/汽车`, `交通配景/摩托车`, and `交通配景/直升机` remain empty.
- Updated `apps/server/src/features/official-gallery/official-gallery-sync.ts` with subtype-specific STSQ people positive/reject keywords so future youth syncs reject child and elder assets even when they carry a generic `免抠人物PS素材` tag.
- Added a regression in `apps/server/src/features/official-gallery/official-gallery-sync.test.ts` proving `青年` rejects `亚洲儿童免抠` and `老人散步免抠素材` while accepting `免抠时装时尚模特人物`.

### Verification

- Docker runtime status before work: `docs/scripts/startprogram/status-local-runtime.ps1` reported Docker active, keepalive running, Supabase healthy, `loomic-arcins-server-1` healthy, `http://127.0.0.1:3000/home => 200`, and `http://127.0.0.1:3001/api/health => 200`.
- Official browser evidence: `户型总平` official `queryByTag` pages `0`, `1`, and `2` each returned `20` assets; `写实植物-攀爬类植物` pages `0` and `1` returned `0`; STSQ search produced accepted people assets for `青年` and `人群`, but no accepted traffic assets for `汽车` / `摩托车` / `直升机`.
- Local import results: `总平素材/户型总平` downloaded `60`, prepared `60`, skipped `0`; `人物配景/青年` prepared `60`, skipped `0`; `人物配景/人群` prepared `60`, skipped `0`.
- Database verification: `总平素材/户型总平`, `人物配景/青年`, and `人物配景/人群` each have `60` active stored assets with active sort order `0..59`.
- Database verification: `植物配景/攀爬植物`, `交通配景/汽车`, `交通配景/摩托车`, and `交通配景/直升机` remain at `0` active assets because no trustworthy official matching assets were found.
- Database contamination check: active `人物配景/青年` rows matching `小孩|儿童|老人|老年` returned `0`.
- TDD evidence: the new youth subtype regression failed before the quality-gate fix with `1 failed | 19 passed`, then passed after the fix with `20` tests.
- Final Docker verification: `pnpm --filter @loomic/server exec vitest run src/features/official-gallery/official-gallery-sync.test.ts src/features/official-gallery/official-gallery-service.test.ts src/http/official-gallery.test.ts --reporter=dot` passed with `3` files and `24` tests.
- Final Docker verification: `pnpm --filter @loomic/server typecheck` passed.
- Real-browser verification: reloaded `http://127.0.0.1:3000/canvas?id=0a1dc7cd-098b-4dda-af76-dc24063f4b16&studio=architecture`; page title was `Loomic`; imported local Storage images loaded with real dimensions `1093x743`, `3983x2424`, and `1037x607`; console error count was `0`.

### Follow-Up

- Do not fabricate or backfill `汽车` / `摩托车` / `直升机` / `攀爬植物` unless a later official-browser check returns semantically matching assets.
- The durable sync script still needs a browser-authenticated data-fetch path or a documented capture/import mode, because direct container requests are rejected by the official API.
- Future people-category tuning should prefer fewer correct rows over many broad-but-wrong rows.

## 2026-04-29 Official Editor Gallery STSQ Wallpaper Reference Repair

### Problem

- The editor-side official gallery still showed missing or wrong material for `交通配景`, especially `汽车`, `摩托车`, and `直升机`.
- The user confirmed that `交通配景` has real public assets on `https://www.jianzhuxuezhang.com/canvas`, so keeping those local subtypes empty was incorrect.
- `人物配景 / 鸟瞰` was still at risk of using bird-view tree assets instead of the official bird-view people assets.
- The editor gallery second-level labels also needed to stay text-only, show exactly three complete labels per page, and avoid half-visible labels after arrow scrolling.

### Root Cause

- The official editor sticker config marks these tabs as `sourceType=STSQ`, but the local sync script had been querying the legacy JZXZ `https://api.jianzhuxuezhang.com/jzxz/api/image/search` endpoint.
- Real official browser evidence showed that the 建筑学长 editor uses `https://wallpaper.soutushenqi.com/api/wallpaper/reference` for `sourceType=STSQ`.
- Direct container fetches to `wallpaper/reference` without the official browser context returned `400 API_ILLEGAL_REQUEST`; the logged-in real browser call succeeded and included the required official request context.
- The returned STSQ wallpaper rows often do not include an `id`, so the importer also needed to fall back to stable URL-derived asset identity instead of relying on `String(undefined)`.

### Code/Data Fix

- Updated `apps/server/src/features/official-gallery/official-gallery-sync.test.ts` with the correct current signatures for the legacy helper tests and kept the regression proving editor STSQ tabs must use `wallpaper/reference`, not `image/search` or `images_by_text`.
- Updated `scripts/sync-jzxz-official-gallery.ts`:
  - added `buildStsqWallpaperReferenceRequest(...)` usage for STSQ editor-gallery imports
  - added `--stsq-page-size`
  - added `--stsq-response-dir` so real-browser-captured official `wallpaper/reference` responses can be imported inside the Docker container
  - added fixture lookup for `免抠-汽车`, `免抠-自行车`, `免抠-摩托车`, `免抠-轮船`, `免抠-直升机`, `免抠-飞机`, and `免抠-鸟瞰人`
  - normalized `wallpaper/reference` payloads that contain only `largeUrl`, `thumbUrl`, `width`, and `height`
  - changed missing STSQ `id` handling to use `null`, allowing `createOfficialGalleryAssetId(...)` to derive a stable ID from `sourceAssetUrl`
  - kept the semantic quality gate so only matching `*_cutout` paths are persisted
- Re-fetched official data in the real browser through the official module:
  - `免抠-汽车`: `120` rows on page 0
  - `免抠-自行车`: `52` rows
  - `免抠-摩托车`: `120` rows on page 0
  - `免抠-轮船`: `67` rows
  - `免抠-直升机`: `54` rows
  - `免抠-飞机`: `84` rows
  - `免抠-鸟瞰人`: `58` rows
- Imported the verified official responses into local Supabase Storage and DB with scoped cleanup:
  - `交通配景/汽车`: `112` active assets
  - `交通配景/自行车`: `46` active assets; `1` official source image returned `404` and was skipped
  - `交通配景/摩托车`: `117` active assets
  - `交通配景/轮船`: `65` active assets
  - `交通配景/直升机`: `52` active assets
  - `交通配景/飞机`: `76` active assets
  - `人物配景/鸟瞰`: `58` active assets

### Verification

- Docker focused web regression:
  - `pnpm exec vitest run --dir . test/canvas-image-editor-modal.test.tsx -t 'keeps only local upload|scrolls editor gallery subcategories' --reporter=dot`
  - Result: `1` file passed, `2` tests passed.
- Docker focused server regression:
  - `pnpm exec vitest run src/features/official-gallery/official-gallery-sync.test.ts -t 'official STSQ wallpaper-reference|bird-view people|captured JZXZ config|query-by-tag|legacy JZXZ image-search|images-by-text' --reporter=dot`
  - Result after fixes: `1` file passed, `6` tests passed.
- Docker server gallery regression:
  - `pnpm exec vitest run src/features/official-gallery/official-gallery-sync.test.ts src/features/official-gallery/official-gallery-service.test.ts src/http/official-gallery.test.ts --reporter=dot`
  - Result: `3` files passed, `26` tests passed.
- Docker web modal regression:
  - `pnpm exec vitest run --dir . test/canvas-image-editor-modal.test.tsx --reporter=dot`
  - Result: `1` file passed, `35` tests passed.
- Docker typechecks:
  - `pnpm --filter @loomic/web typecheck`: passed.
  - `pnpm --filter @loomic/server typecheck`: passed.
- `git diff --check`: passed with only existing CRLF warnings.
- Database verification:
  - active `人物配景/鸟瞰` rows with `bird_view_tree_cutout`, `tree_cutout`, or `鸟瞰树`: `0`
  - active `交通配景` rows whose source URL does not include `car_cutout`, `bicycle_cutout`, `motorcycle_cutout`, `ship_cutout`, `helicopter_cutout`, or `airplane_cutout`: `0`
- Real-browser validation in the in-app browser:
  - editor gallery `交通配景/汽车` displayed `15` first-page thumbnails
  - second-level labels were text-only: `border: 0px`, transparent background, `w-[82px]`
  - first-level and second-level strip containers were `254px`, showing three complete tags
  - one second-level right-arrow click moved `scrollLeft` from `0` to `86`, exposing `自行车 / 摩托车 / 轮船` with no half-visible label
  - `人物配景/鸟瞰` displayed `aerial_view_people_cutout` thumbnails; visible images loaded at `480x480`; no tree path was present
  - after a fresh reload, local page console error count was `0`

### Follow-Up

- The current data import intentionally uses the first captured `120` official rows per STSQ subtype. The official `汽车` search has additional pages; future full mirror work should use an authenticated browser-context fetch path rather than direct unauthenticated container fetch.
- Do not revert back to `image/search` or `images_by_text` for editor STSQ sticker tabs; those endpoints are not the official editor gallery source and can pollute categories.
- Continue keeping STSQ persistence fail-closed: wrong or ambiguous remote rows should be rejected instead of used to fill a subtype.

## 2026-04-29 Canvas Mixed Selection Action Bar / Context Menu Grouping

### Problem

- In the main canvas, box-selecting mixed elements such as `image + text` or `image + freedraw` did not show the floating `创建编组` and `合并图层` actions, even though multi-image selection showed them.
- The canvas right-click menu could show an internal scrollbar and presented a long ungrouped action list, making dense menus feel unlike the grouped 建筑学长-style context menu.

### Root Cause

- The floating selection toolbar split selection state into two paths:
  - `selectedCanvasImage` only exists for exactly one selected image.
  - `showMultiImageSelectionActionBar` previously required more than one selected image.
- A mixed `image + text/freedraw` selection therefore had `selectedCanvasImage === null` and `multiSelectedCanvasImages.length === 1`, so neither toolbar mode rendered.
- `CanvasContextMenu` owned its own scroll behavior through `max-h-[min(520px,calc(100vh-2rem))]` and `overflow-y-auto`.
- The menu renderer only had a special divider before delete instead of grouping actions by intent, so clipboard, layer ordering, grouping/merge, visibility/lock, export, and destructive actions appeared as one flat list.

### Code Fix

- Updated `apps/web/src/app/canvas/page.tsx` so the multi-selection floating toolbar renders when the selection was created from the left/box-selection path, contains more than one element, and includes at least one image. This preserves single-image edit behavior while allowing `image + text` and `image + freedraw` to expose `创建编组`, `合并图层`, and `发送至对话`.
- Updated `apps/web/src/components/canvas/canvas-context-menu.tsx` to remove the menu-owned scrollbar classes and use `overflow-hidden` instead of `overflow-y-auto`.
- Added action-id based grouping in `CanvasContextMenu` for clipboard, layer ordering, conversation, composition, state, view/file, and destructive groups, rendering light gray separators at group boundaries.
- Added regression coverage in `apps/web/test/canvas-page-selection-action-bar.test.tsx` for mixed `image + text` and `image + freedraw` selections.
- Added regression coverage in `apps/web/test/canvas-context-menu.test.tsx` proving the dense menu has no scrollbar classes and renders the expected light separators.

### Verification

- Docker runtime status before validation:
  - `docs/scripts/startprogram/status-local-runtime.ps1` reported keepalive running, Docker active, Supabase healthy, `loomic-arcins-server-1` healthy, `http://127.0.0.1:3000/home => 200`, and `http://127.0.0.1:3001/api/health => 200`.
- RED evidence before the production fix:
  - `pnpm exec vitest run --dir . test/canvas-page-selection-action-bar.test.tsx test/canvas-context-menu.test.tsx --reporter=dot` failed with `3` expected failures: mixed selections could not find `创建编组`, and the context menu still contained `overflow-y-auto`.
- GREEN focused Docker verification:
  - `pnpm exec vitest run --dir . test/canvas-page-selection-action-bar.test.tsx test/canvas-context-menu.test.tsx --reporter=dot`
  - Result: `2` files passed, `26` tests passed, `4` skipped.
- Additional Docker regression:
  - `pnpm exec vitest run --dir . test/canvas-page-context-menu.test.tsx test/canvas-context-actions.test.ts --reporter=dot`
  - Result: `2` files passed, `17` tests passed.
- Docker typecheck:
  - `pnpm --filter @loomic/web typecheck`
  - Result: passed.
- Static check:
  - `git diff --check`
  - Result: passed with only existing LF/CRLF warnings.
- Real-browser verification in the Codex in-app browser:
  - Reloaded `http://127.0.0.1:3000/canvas?id=0a1dc7cd-098b-4dda-af76-dc24063f4b16&studio=architecture`; title was `Loomic`.
  - Real canvas selection showed exactly one `canvas-selection-action-bar` and one each of `创建编组`, `合并图层`, and `发送至对话`.
  - Real right-click blank canvas menu had class `min-w-[220px] -translate-x-1/2 overflow-hidden ...`, with no `overflow-y-auto` or max-height scrollbar class.
  - Real right-click blank canvas menu rendered `2` light gray separators for its grouped blank-canvas action inventory.
  - Browser console error count was `0`.

### Follow-Up

- If future product direction wants mixed non-image selections such as `text + freedraw` to show the same floating grouping actions, extend the toolbar eligibility from “multi-selection containing at least one image” to “any multi-selection with groupable canvas elements.”
- Keep context-menu grouping centralized in `CanvasContextMenu` unless the page action inventory needs per-mode custom group boundaries.

## 2026-04-29 Canvas Mixed Selection Group/Merge Follow-Up

### Problem

- In the main canvas mixed-selection flow, clicking `创建编组` or `合并图层` left a visible selected effect after the operation completed.
- Mixed selections such as `image + text`, `image + freedraw`, or `image + shape` could expose the `合并图层` action, but the actual merge path only handled multiple selected images. A single image plus annotation layer was ignored instead of being rasterized into one new image layer.

### Root Cause

- `groupSelectedCanvasElements(api)` updated grouped elements but did not clear `appState.selectedElementIds`, so Excalidraw still considered the originals selected after grouping.
- `handleGroupSelectedImages()` closed the mutation path without clearing the React page-level selection state (`selectedCanvasElements` and `selectionActionOrigin`), so the floating action bar could remain visible even after the native scene was updated.
- `handleMergeSelection()` filtered the live scene down to selected image elements with `fileId` and required at least two images. Mixed selections containing one image plus text/freedraw/shape therefore failed the old image-count guard and never reached layer merge.
- The old merge implementation drew only image bitmaps into a scratch `<canvas>`, which could not faithfully merge non-image Excalidraw elements such as text, freedraw strokes, arrows, and shapes.

### Code Fix

- Updated `apps/web/src/lib/canvas-context-actions.ts` so `groupSelectedCanvasElements(api)` clears `selectedElementIds` in the same `updateScene(...)` call that applies the group IDs.
- Added `clearCanvasSelectionUiState()` in `apps/web/src/app/canvas/page.tsx` to close context menus, suppress further floating action-bar rendering, and clear page-level selected elements after successful grouping/merge.
- Updated `handleGroupSelectedImages()` to call the shared clear helper whenever grouping succeeds, with a mixed-selection fallback for the page-level action-bar path.
- Refactored `handleMergeSelection()` to use all selected scene elements, rasterize through Excalidraw `exportToBlob(...)`, delete the selected originals, insert the merged image layer, and clear both native and React selection UI state.
- Added regression coverage in `apps/web/test/canvas-page-selection-action-bar.test.tsx` and `apps/web/test/canvas-page-context-menu.test.tsx` for grouping and merging `image + text` mixed selections.

### Verification

- Docker runtime status before validation:
  - `docs/scripts/startprogram/status-local-runtime.ps1` reported keepalive running, Docker active, Supabase healthy, `loomic-arcins-server-1` healthy, `http://127.0.0.1:3000/home => 200`, and `http://127.0.0.1:3001/api/health => 200`.
- Focused Docker regression:
  - `pnpm exec vitest run --dir . test/canvas-page-selection-action-bar.test.tsx test/canvas-page-context-menu.test.tsx --reporter=dot`
  - Result: `2` files passed, `33` tests passed, `4` skipped.
- Additional Docker regression:
  - `pnpm exec vitest run --dir . test/canvas-context-actions.test.ts test/canvas-context-menu.test.tsx --reporter=dot`
  - Result: `2` files passed, `13` tests passed.
- Docker typecheck:
  - `pnpm --filter @loomic/web typecheck`
  - Result: passed.
- Static check:
  - `git diff --check`
  - Result: passed with only existing LF/CRLF warnings.
- Real-browser validation:
  - Opened `http://127.0.0.1:3000/canvas?id=0a1dc7cd-098b-4dda-af76-dc24063f4b16&studio=architecture`; title was `Loomic`.
  - The live scene contained `1` image, `1` text element, and `2` freedraw elements.
  - Selecting the live `image + text` pair rendered the real floating action bar with `创建编组`, `合并图层`, and `发送至对话`.
  - Clicking `创建编组` cleared `appState.selectedElementIds`, removed the floating action bar, and assigned the same `groupId` to the selected image and text elements.
  - After restoring the original live scene, clicking `合并图层` on the same `image + text` selection deleted the original image/text elements, inserted one new image layer, cleared `appState.selectedElementIds`, and removed the floating action bar.
  - The validation scene was restored to its original `text + freedraw + freedraw + image` state and reloaded; the restored page still had `4` visible elements, no selection, no floating action bar, and console error count `0`.

### Follow-Up

- The mixed merge path now relies on Excalidraw `exportToBlob(...)`, which is the correct rendering path for annotations. Keep future layer-merge work on that path instead of reintroducing image-only scratch-canvas drawing.
- If future requirements allow merging pure annotation selections without any image, the current implementation already supports any selected scene elements; the UI eligibility can be expanded separately if product wants to expose that action for non-image-only selections.

## 2026-05-01 Main Canvas Shape/Doodle Selection Toolbar Repair

### Problem

- In the main canvas, selecting a shape or doodle displayed a floating style toolbar containing `描边 / 填充 / 清除填充 / 线宽 / W / H`.
- The selected shape/doodle toolbar should not expose W/H size inputs; resizing is handled by the native selection box and drag handles.
- When a selected object was close to the top of the viewport, the toolbar fell back below the object, which could place it over the lower/middle part of the selected artwork and block the user's view.

### Root Cause

- `buildCanvasSelectionToolbarStyle(...)` used a fallback branch: when the preferred top anchor was less than `16px`, it placed the toolbar below the selected element using `args.y + args.height + 12`.
- That fallback was originally meant to keep the toolbar inside the viewport, but for canvas objects it violated the expected interaction model because it covered the selected object.
- `renderArchitectureShapeToolbar()` rendered selected shape W/H number inputs inside the same style toolbar card. These inputs duplicated native handle-based resizing and made the toolbar wider/taller than necessary.

### Code Fix

- Updated `apps/web/src/components/canvas-tool-menu.tsx` so `buildCanvasSelectionToolbarStyle(...)` always anchors the selected-object toolbar above the object's top edge and only clamps to the viewport top instead of falling below the object.
- Removed the selected shape W/H number-input block from the shape toolbar card.
- Simplified selected shape style updates to only update stroke, fill, and stroke width; object dimensions remain owned by native canvas resize handles.
- Updated `apps/web/test/canvas-tool-menu.test.tsx` with regression coverage proving:
  - selected shape toolbars no longer render `形状宽度` or `形状高度` spinbuttons.
  - selected doodle toolbars do not render those size controls.
  - near-top selected shapes keep the toolbar above the object rather than falling below it.

### Verification

- Docker runtime status before validation:
  - `docs/scripts/startprogram/status-local-runtime.ps1` reported keepalive running, Docker active, Supabase containers healthy, `loomic-arcins-server-1` healthy, `http://127.0.0.1:3000/home => 200`, and `http://127.0.0.1:3001/api/health => 200`.
- RED evidence before production changes:
  - `pnpm exec vitest run --dir . test/canvas-tool-menu.test.tsx --reporter=dot`
  - Result: `1` file failed as expected, with `2` failing assertions:
  - `形状宽度` was still present in the selected-shape toolbar.
  - a near-top shape produced toolbar `top: 164px`, below the object's `y: 32`.
- GREEN focused Docker verification:
  - `pnpm exec vitest run --dir . test/canvas-tool-menu.test.tsx --reporter=dot`
  - Result: `1` file passed, `16` tests passed.
- Bounded Docker regression:
  - `pnpm exec vitest run --dir . test/canvas-tool-menu.test.tsx test/canvas-page-selection-action-bar.test.tsx --reporter=dot`
  - Result: `2` files passed, `38` tests passed, `4` skipped.
- Docker typecheck:
  - `pnpm --filter @loomic/web typecheck`
  - Result: passed.
- Static check:
  - `git diff --check`
  - Result: passed with only existing LF/CRLF warnings.
- Real-browser validation in the Codex in-app browser:
  - Opened `http://127.0.0.1:3000/canvas?id=0a1dc7cd-098b-4dda-af76-dc24063f4b16&studio=architecture`; title was `Loomic`.
  - Drew a temporary rectangle and confirmed the real selected-object toolbar had `data-mode="selection"` and `data-anchor="canvas-selection"`.
  - The real toolbar style was `left: 460px; top: 188px;` for a rectangle drawn from about `y: 260`, placing the toolbar above the object.
  - The real toolbar text was only `描边 / 填充 / 清除填充 / 线宽 / 2`.
  - `形状宽度` and `形状高度` input counts were both `0`.
  - Deleted the temporary validation rectangle afterward; the toolbar count returned to `0`.

### Follow-Up

- A reload/temporary-tab console check surfaced a `CanvasEditor.useEffect.flushBeforeUnload` `Failed to fetch` message from a beforeunload autosave path. It was not caused by the toolbar code path, but it is worth tracking separately if canvas reload/close autosave reliability becomes a user-facing issue.
- Keep selected shape and doodle resizing on native handles. Avoid reintroducing W/H inputs into the style toolbar unless the product later adds a dedicated precision-size panel.
