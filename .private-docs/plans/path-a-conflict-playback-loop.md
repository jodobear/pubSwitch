---
title: Path A Conflict Playback Loop
doc_type: loop
status: completed
owner: tack
phase: p4-path-a-conflict-fixtures
canonical: false
---

# Path A Conflict Playback Loop

Completed uninterrupted implementation loop for the Path A conflict-playback lane.

## Why This Loop Is Safe

- all slices stay in one narrow Path A fixture, helper, script, and playback lane
- the loop builds on already-structured conflict metadata instead of reopening resolver direction
- each slice can close with deterministic tests and, where needed, focused demo smoke
- no slice requires real `.ots` parsing, Path C changes, or broader orchestration work

## Executor Contract

- execute the slices in order without interruption unless a hard stop condition triggers
- treat this as an implementation loop, not just a planning queue
- after each slice, run the listed gates, update the current packet honestly, then continue
- stop if the work starts turning into broader resolver redesign instead of narrow conflict playback

## Slice Sequence

1. `path-a-conflict-fixtures-packet.md`
   - add deterministic root and child conflict scenarios to the fixture corpus
   - likely edit targets:
     - `packages/fixtures/src/index.ts`
     - `packages/fixtures/src/__tests__/path-a-fixtures.test.ts`
2. `path-a-conflict-helper-guard-packet.md`
   - keep helper summaries explicit when one active authority cannot be chosen
   - likely edit targets:
     - `apps/ots-helper/src/path-a-proof-bridge.ts`
     - `apps/ots-helper/src/__tests__/path-a-proof-bridge.test.ts`
3. `path-a-conflict-playback-packet.md`
   - surface root and child conflict scenarios coherently in the Path A demo lane
   - likely edit targets:
     - `apps/demo-client/src/path-a-proof-view.ts`
     - `apps/demo-client/src/App.tsx`
     - `apps/demo-client/src/__tests__/path-a-proof-view.test.ts`
4. `path-a-conflict-script-parity-packet.md`
   - lock script, helper, fixture, and doc parity for the new conflict scenarios
   - likely edit targets:
     - `scripts/verify-scenario.ts`
     - `handoff.md`
     - `.private-docs/plans/build-plan.md`

## Hard Stop Conditions

Stop the loop immediately if a slice requires any of the following:

- redesigning the broader Path A resolver instead of adding narrow conflict fixtures or playback
- Path C changes or cross-lane state merging
- full `.ots` byte parsing or Bitcoin verification changes
- broad demo-client redesign beyond the existing Path A workspace
- protocol-direction changes that should go back through
  `.private-docs/research/proposal-and-research-review.md`

## Execution Rules

- keep one active packet at a time even though the queue is preselected
- close each slice before starting the next one
- run `bun run typecheck`, `bun test`, and manual smoke for UI changes after each slice
- update `handoff.md` and `build-plan.md` honestly at every slice boundary
- if an autonomous agent needs a compact execution brief, use `bun run show:autonomous-loop --current --prompt`

## Outcome

- slice 1 closed with deterministic `multiple_roots` and `multiple_children` fixture coverage
- slice 2 closed with explicit helper guardrails for plural-authority conflicts
- slice 3 closed with demo playback and provenance updates for the new conflict scenarios
- slice 4 closed with script/doc parity and one final handoff point
