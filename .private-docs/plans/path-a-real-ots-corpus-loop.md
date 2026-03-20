---
title: Path A Real OTS Corpus Loop
doc_type: loop
status: completed
owner: tack
phase: p5-path-a-real-ots-corpus
canonical: false
---

# Path A Real OTS Corpus Loop

Completed uninterrupted implementation loop for the deterministic real Path A OTS corpus lane.

## Why This Loop Is Safe

- all slices stay inside one narrow helper-side Path A corpus and verification lane
- the loop avoids browser bundling of `opentimestamps` and does not reopen protocol direction
- the proof artifacts can be generated locally and deterministically from real PMA event ids
- each slice can close with tests or script verification without adding relay or calendar orchestration

## Executor Contract

- execute the slices in order without interruption unless a hard stop condition triggers
- treat this as an implementation loop, not just a planning queue
- after each slice, run the listed gates, update the current packet honestly, then continue
- stop if the work starts turning into browser bundling, remote orchestration, or protocol redesign

## Slice Sequence

1. `path-a-real-ots-corpus-packet.md`
   - add deterministic real Path A PMA corpus items with real `.ots` proof bytes
   - likely edit targets:
     - `apps/ots-helper/src/path-a-real-corpus.ts`
     - `apps/ots-helper/src/__tests__/path-a-real-corpus.test.ts`
2. `path-a-real-ots-helper-packet.md`
   - expose helper-side inspection and CLI access for the corpus
   - likely edit targets:
     - `apps/ots-helper/src/index.ts`
     - `apps/ots-helper/src/path-a-real-corpus.ts`
3. `path-a-real-ots-script-parity-packet.md`
   - add a deterministic script surface for corpus verification parity
   - likely edit targets:
     - `scripts/verify-real-ots-corpus.ts`
     - `package.json`
4. `path-a-real-ots-doc-parity-packet.md`
   - close the lane with honest handoff, plan, and control-doc state
   - likely edit targets:
     - `handoff.md`
     - `.private-docs/plans/build-plan.md`
     - `.private-docs/README.md`

## Hard Stop Conditions

Stop the loop immediately if a slice requires any of the following:

- bundling `opentimestamps` or other Node-oriented verification code into the browser demo
- remote calendar orchestration or network-dependent proof minting as part of the deterministic corpus
- protocol wire changes for PMA, PMU, PMX, STC, or STA
- Path C changes or cross-lane state merging
- independent Bitcoin block-header verification against a node or explorer

## Execution Rules

- keep one active packet at a time even though the queue is preselected
- close each slice before starting the next one
- run `bun run typecheck`, `bun test`, and focused helper/script verification after each slice
- update `handoff.md` and `build-plan.md` honestly at every slice boundary
- if an autonomous agent needs a compact execution brief, use `bun run show:autonomous-loop --loop=path-a-real-ots-corpus-loop --prompt`

## Outcome

- slice 1 closed with deterministic real PMA corpus items and real `.ots` proof bytes
- slice 2 closed with helper CLI inspection over that corpus
- slice 3 closed with script parity for corpus verification
- slice 4 closed with one honest handoff point and the next active packet
