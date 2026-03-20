---
title: Path A Real OTS Bridge Loop
doc_type: loop
status: completed
owner: tack
phase: p5-path-a-real-ots-bridge
canonical: false
---

# Path A Real OTS Bridge Loop

Completed uninterrupted implementation loop for the browser-safe real OTS bridge lane.

## Why This Loop Is Safe

- all slices stay inside one narrow Path A bridge from helper-side real corpus data into wider browser-safe surfaces
- the loop does not reopen protocol wire behavior or import `opentimestamps` into the browser
- the bridge relies on deterministic prepared corpus data that can be tested for parity with helper inspection
- each slice can close with pure tests, script checks, and one focused browser smoke

## Executor Contract

- execute the slices in order without interruption unless a hard stop condition triggers
- treat this as an implementation loop, not just a planning queue
- after each slice, run the listed gates, update the current packet honestly, then continue
- stop if the work starts turning into browser bundling of the verifier or broader resolver redesign

## Slice Sequence

1. `path-a-real-ots-bridge-packet.md`
   - move the real corpus into a browser-safe pure fixture module and keep helper inspection layered on top
   - likely edit targets:
     - `packages/fixtures/src/path-a-real-ots.ts`
     - `apps/ots-helper/src/path-a-real-corpus.ts`
     - `packages/fixtures/src/__tests__/path-a-real-ots.test.ts`
2. `path-a-real-ots-demo-packet.md`
   - surface the real corpus snapshot in the Path A demo with explicit provenance labels
   - likely edit targets:
     - `apps/demo-client/src/path-a-real-ots-view.ts`
     - `apps/demo-client/src/path-a-proof-view.ts`
     - `apps/demo-client/src/App.tsx`
     - `apps/demo-client/src/styles.css`
3. `path-a-real-ots-cli-parity-packet.md`
   - keep helper CLI and script surfaces aligned to the shared pure corpus data
   - likely edit targets:
     - `apps/ots-helper/src/index.ts`
     - `scripts/verify-real-ots-corpus.ts`
     - `apps/ots-helper/src/__tests__/path-a-real-corpus.test.ts`
4. `path-a-real-ots-bridge-doc-packet.md`
   - close the lane with honest handoff and next-slice routing
   - likely edit targets:
     - `handoff.md`
     - `.private-docs/plans/build-plan.md`
     - `.private-docs/README.md`

## Hard Stop Conditions

Stop the loop immediately if a slice requires any of the following:

- bundling `opentimestamps` or other Node-oriented verification code into the browser demo
- remote calendar orchestration or network-dependent proof minting
- protocol wire changes for PMA, PMU, PMX, STC, or STA
- Path C changes or cross-lane state merging
- independent Bitcoin block-header verification against a node or explorer

## Execution Rules

- keep one active packet at a time even though the queue is preselected
- close each slice before starting the next one
- run `bun run typecheck`, `bun test`, and manual smoke for UI changes after each slice
- update `handoff.md` and `build-plan.md` honestly at every slice boundary
- if an autonomous agent needs a compact execution brief, use `bun run show:autonomous-loop --loop=path-a-real-ots-bridge-loop --prompt`

## Outcome

- slice 1 closed with a pure browser-safe real Path A corpus module plus helper parity checks
- slice 2 closed with a new Path A demo surface for the real corpus snapshot
- slice 3 closed with helper/script parity on the shared data source
- slice 4 closed with one honest handoff point and the next active packet
