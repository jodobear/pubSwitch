---
title: Path A Real OTS Chain Root Loop
doc_type: loop
status: completed
owner: tack
phase: p5-path-a-real-ots-chain-root
canonical: false
---

# Path A Real OTS Chain Root Loop

Completed uninterrupted implementation loop for adopting the shared real confirmed PMA root across the single-root Path A authority-chain family.

## Why This Loop Is Safe

- all slices stay in one narrow Path A fixture, script, and demo lane
- the loop reuses the already prepared shared real confirmed PMA corpus item instead of minting new proof material
- each slice can close with deterministic fixture and script checks, plus focused browser smoke where the UI changes
- no slice requires browser-side `.ots` parsing, Path C changes, or protocol wire changes

## Executor Contract

- execute the slices in order without interruption unless a hard stop condition triggers
- treat this as an implementation loop, not just a planning queue
- after each slice, run the listed gates, update the current packet honestly, then continue
- stop if the work starts turning into broad real-proof migration instead of narrow single-root chain adoption

## Slice Sequence

1. `path-a-real-ots-chain-root-packet.md`
   - adopt the shared real confirmed PMA root in the `confirmed-authority` scenario
   - likely edit targets:
     - `packages/fixtures/src/index.ts`
     - `packages/fixtures/src/__tests__/path-a-fixtures.test.ts`
     - `scripts/verify-scenario.ts`
2. `path-a-real-ots-chain-conflict-packet.md`
   - adopt the same real confirmed PMA root in the `conflicting-children` scenario
   - likely edit targets:
     - `packages/fixtures/src/index.ts`
     - `packages/fixtures/src/__tests__/path-a-fixtures.test.ts`
     - `apps/ots-helper/src/__tests__/path-a-proof-bridge.test.ts`
3. `path-a-real-ots-chain-execution-packet.md`
   - adopt the same real confirmed PMA root in `executed-happy-path` and `conflicting-executions`
   - likely edit targets:
     - `packages/fixtures/src/index.ts`
     - `packages/fixtures/src/__tests__/path-a-fixtures.test.ts`
     - `scripts/verify-scenario.ts`
4. `path-a-real-ots-chain-parity-packet.md`
   - make mixed real-root versus placeholder-chain backing explicit across demo, script, and control docs
   - likely edit targets:
     - `apps/demo-client/src/App.tsx`
     - `apps/demo-client/src/styles.css`
     - `scripts/publish-scenario.ts`
     - `handoff.md`
     - `.private-docs/plans/build-plan.md`

## Hard Stop Conditions

Stop the loop immediately if a slice requires any of the following:

- minting new real PMU or PMX `.ots` proofs instead of reusing the shared real confirmed PMA root
- bundling `opentimestamps` or other Node-oriented verification code into the browser demo
- protocol wire changes for PMA, PMU, PMX, STC, or STA
- Path C changes or cross-lane state merging
- broad replacement of every remaining placeholder proof path instead of the single-root authority-chain family

## Execution Rules

- keep one active packet at a time even though the queue is preselected
- close each slice before starting the next one
- run `bun run typecheck`, `bun test`, and manual smoke for UI changes after each slice
- update `handoff.md` and `build-plan.md` honestly at every slice boundary
- if an autonomous agent needs a compact execution brief, use `bun run show:autonomous-loop --current --prompt`

## Outcome

- slice 1 closed with `confirmed-authority` reusing the shared real confirmed PMA root
- slice 2 closed with `conflicting-children` reusing the same real confirmed root while retaining plural-child conflict semantics
- slice 3 closed with `executed-happy-path` and `conflicting-executions` reusing the same real confirmed root
- slice 4 closed with explicit mixed-backing parity across demo, verify, publish, and control-doc surfaces
