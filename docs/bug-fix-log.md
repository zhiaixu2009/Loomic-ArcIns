# Bug Fix Log

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
