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
