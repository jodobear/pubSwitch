---
title: Path A Real OTS Adoption Loop
doc_type: loop
status: completed
owner: tack
phase: p5-path-a-real-ots-scenario-replacement
canonical: false
---

# Path A Real OTS Adoption Loop

Completed uninterrupted implementation loop for adopting the shared real OTS corpus into the main Path A scenario flow.

## Why This Loop Is Safe

- all slices stay inside one narrow Path A fixture, demo, and script lane
- the loop reuses already prepared real corpus items instead of adding new proof production work
- each slice can close with deterministic tests and focused demo/script checks
- no slice requires browser-side `.ots` parsing, Path C changes, or protocol wire changes

## Executor Contract

- execute the slices in order without interruption unless a hard stop condition triggers
- treat this as an implementation loop, not just a planning queue
- after each slice, run the listed gates, update the current packet honestly, then continue
- stop if the work turns into broad fixture-family redesign instead of narrow real-corpus adoption

## Slice Sequence

1. `path-a-real-ots-scenario-replacement-packet.md`
   - replace the `pending-ots` placeholder proof path with the shared real pending corpus item
   - likely edit targets:
     - `packages/fixtures/src/index.ts`
     - `packages/fixtures/src/__tests__/path-a-fixtures.test.ts`
2. `path-a-real-ots-confirmed-scenario-packet.md`
   - add one real confirmed PMA scenario to the main Path A fixture list using the shared real confirmed corpus item
   - likely edit targets:
     - `packages/fixtures/src/index.ts`
     - `packages/fixtures/src/__tests__/path-a-fixtures.test.ts`
3. `path-a-real-ots-parity-packet.md`
   - label real-backed versus placeholder-backed Path A scenarios in demo, script, and publish surfaces
   - likely edit targets:
     - `apps/demo-client/src/App.tsx`
     - `apps/demo-client/src/styles.css`
     - `scripts/verify-scenario.ts`
     - `scripts/publish-scenario.ts`
4. `path-a-real-ots-adoption-doc-packet.md`
   - close the lane with honest handoff and next-slice routing
   - likely edit targets:
     - `handoff.md`
     - `.private-docs/plans/build-plan.md`
     - `.private-docs/README.md`

## Hard Stop Conditions

Stop the loop immediately if a slice requires any of the following:

- bundling `opentimestamps` or other Node-oriented verification code into the browser demo
- remote calendar orchestration or new proof minting
- protocol wire changes for PMA, PMU, PMX, STC, or STA
- Path C changes or cross-lane state merging
- broad replacement of all placeholder proof paths in one pass instead of one narrow adoption lane

## Execution Rules

- keep one active packet at a time even though the queue is preselected
- close each slice before starting the next one
- run `bun run typecheck`, `bun test`, and manual smoke for UI changes after each slice
- update `handoff.md` and `build-plan.md` honestly at every slice boundary
- if an autonomous agent needs a compact execution brief, use `bun run show:autonomous-loop --loop=path-a-real-ots-adoption-loop --prompt`

## Outcome

- slice 1 closed with the pending Path A scenario now backed by real shared OTS corpus data
- slice 2 closed with a new real confirmed PMA scenario in the main Path A fixture list
- slice 3 closed with explicit proof-backing labels across demo and script surfaces
- slice 4 closed with one honest handoff point and the next active packet
