# Phase 7 Batch 14 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the local multi-image pending-reference chips in the canvas composer with the frozen `建筑学长` contract: in-chip arrow controls, top-right close affordance, and visible disabled edge states.

**Architecture:** Keep the slice bounded to the existing composer path in `ChatInput` so the pending reference chips reuse the current selection-state machine. Do not widen into template-model matrix sampling or large-image enhancement. The implementation should replace the current “thumbnail + below-arrow strip” shell with a live-audited overlay control layout while preserving existing move/remove callbacks.

**Tech Stack:** Next.js App Router, React, Vitest, Playwright, Tailwind CSS

---

## Scope Freeze

- In scope:
  - pending selected-canvas image chips in immersive composer mode
  - left/right move button placement and disabled states
  - close button placement
  - focused chat-input regression coverage
  - PRD / findings / progress writeback for the audited live geometry
- Out of scope:
  - full template-to-model matrix sampling
  - `查看大图` enhancement branches
  - right-panel record-card redesign
  - confirmed attachment chip redesign outside the current pending-selection path

## Files Expected In This Batch

- Modify: `apps/web/src/components/chat-input.tsx`
- Modify: `apps/web/test/chat-input.test.tsx`
- Modify: `docs/prd/2026-04-16-jianzhuxuezhang-ai-canvas-agent-prd.md`
- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `docs/verification/2026-04-12-architecture-agent-studio-validation.md`

## Task 1: Freeze The Live Chip Contract In Tests

- [ ] Add focused red assertions for immersive multi-image pending chips:
  - each chip keeps a persistent top-right remove button
  - left / right move controls render inside the thumbnail shell instead of below it
  - boundary controls stay visible but become disabled instead of disappearing
  - the old numeric bottom label is removed from the pending chip shell
- [ ] Run the focused test file and confirm the new assertions fail first.

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/chat-input.test.tsx --reporter=dot --pool forks"
```

Expected:
- the new multi-image chip assertions fail against the old below-thumbnail control layout

## Task 2: Implement The Overlay Chip Layout

- [ ] Replace the current immersive pending-chip shell in `ChatInput` with a live-audited `60x60` overlay layout:
  - close button floats at the chip’s top-right edge
  - left / right reorder buttons sit inside the lower edge of the thumbnail
  - disabled edge controls remain rendered with muted styling
  - no speculative hover tooltip copy is introduced
- [ ] Preserve existing move and remove callbacks so only the presentation layer changes.

## Task 3: Focused Regression And Bounded Recheck

- [ ] Re-run `test/chat-input.test.tsx` until green.
- [ ] Re-run the adjacent bounded regression that protects the canvas/composer shell.

Run:

```bash
wsl.exe -e bash -lc "cd /mnt/d/97-CodingProject/Loomic-ArcIns/apps/web && NODE_OPTIONS=--max-old-space-size=4096 node ../../node_modules/vitest/vitest.mjs run test/chat-input.test.tsx test/chat-sidebar.test.tsx test/canvas-page-shell.test.tsx test/canvas-page-selection-action-bar.test.tsx --reporter=dot --pool forks"
```

Expected:
- all touched composer / sidebar / shell tests pass

## Task 4: Documentation Writeback

- [ ] Write the live geometry and state findings into the PRD.
- [ ] Update `findings.md`, `progress.md`, and the validation report with the red/green evidence.
- [ ] Keep `高清增强` explicitly deferred.

## Exit Criteria

- Local pending multi-image chips match the frozen live structure closely enough to remove the current PRD ambiguity around arrow placement
- Focused `chat-input` regression is green
- Bounded canvas/chat regression remains green
- Docs reflect the new closure and the deferred `高清增强` status
