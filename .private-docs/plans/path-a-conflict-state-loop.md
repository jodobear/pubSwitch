---
title: Path A Conflict State Loop
doc_type: loop
status: completed
owner: tack
phase: p4-path-a-conflict-structure
canonical: false
---

# Path A Conflict State Loop

High-confidence uninterrupted implementation loop for the current Path A conflict-state lane.

## Why This Loop Is Safe

- all slices stay inside one narrow Path A state-shape and immediate-consumer lane
- the loop reuses existing deterministic fixtures and conflict scenarios
- no slice requires `.ots` parsing, Path C changes, or wider relay orchestration
- each slice can close with the repo's existing light gates

## Executor Contract

- execute the slices in order without interruption unless a hard stop condition triggers
- treat this as an implementation loop, not just a planning queue
- after each slice, run the listed gates, update the current packet honestly, then continue
- stop if the work starts turning into a broader resolver redesign instead of a narrow conflict-state refinement

## Slice Sequence

1. `path-a-conflict-structure-packet.md`
   - add structured authority metadata to relevant Path A conflict states
   - likely edit targets:
     - `packages/protocol-a/src/index.ts`
     - `packages/protocol-a/src/__tests__/protocol-a.test.ts`
     - `packages/fixtures/src/index.ts`
2. `path-a-conflict-bridge-packet.md`
   - migrate helper bridge handling from regex parsing to structured conflict fields
   - likely edit targets:
     - `apps/ots-helper/src/path-a-proof-bridge.ts`
     - `apps/ots-helper/src/__tests__/path-a-proof-bridge.test.ts`
3. `path-a-conflict-demo-packet.md`
   - migrate the Path A demo view model and conflict display to the structured field
   - likely edit targets:
     - `apps/demo-client/src/path-a-proof-view.ts`
     - `apps/demo-client/src/App.tsx`
     - `apps/demo-client/src/__tests__/path-a-proof-view.test.ts`
4. `path-a-conflict-parity-packet.md`
   - keep script output, fixtures, and docs aligned with the new structured conflict metadata
   - likely edit targets:
     - `scripts/verify-scenario.ts`
     - `packages/fixtures/src/index.ts`
     - `handoff.md`
     - `.private-docs/plans/build-plan.md`

## Hard Stop Conditions

Stop the loop immediately if a slice requires any of the following:

- redesigning the broader Path A resolver instead of adding narrow structured conflict metadata
- Path C changes or cross-lane state merging
- full `.ots` byte parsing or Bitcoin verification changes
- relay orchestration, background helpers, or wider adapter-layer rewrites
- protocol-direction changes that should go back through
  `.private-docs/research/proposal-and-research-review.md`

## Execution Rules

- keep one active packet at a time even though the queue is preselected
- close each slice before starting the next one
- run `bun run typecheck`, `bun test`, and manual smoke for UI changes after each slice
- update `handoff.md` and `build-plan.md` honestly at every slice boundary
- if an autonomous agent needs a compact execution brief, use `bun run show:autonomous-loop --current --prompt`

## Closeout Result

- all four queued slices were implemented in one uninterrupted pass
- Path A conflict state is now structured in protocol, helper, demo, and script surfaces
- the loop stopped after slice 4 and handed off to `path-a-conflict-fixtures-packet.md` as the next
  bounded slice
