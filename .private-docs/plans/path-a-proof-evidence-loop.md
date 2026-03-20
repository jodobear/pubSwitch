---
title: Path A Proof Evidence Loop
doc_type: loop
status: completed
owner: tack
phase: p4-ots-helper-demo-evidence
canonical: false
---

# Path A Proof Evidence Loop

High-confidence uninterrupted implementation loop for the current Path A proof-evidence lane.

## Why This Loop Is Safe

- all slices stay in the Path A demo evidence workspace or helper-facing script copy
- all slices reuse deterministic fixtures and existing helper output
- no slice requires Path C changes, wire-format changes, or new relay orchestration
- each slice can close with the repo's existing light gates

## Executor Contract

- execute the slices in order without interruption unless a hard stop condition triggers
- treat this as an implementation loop, not just a planning queue
- after each slice, run the listed gates, update the current packet honestly, then continue
- do not widen into protocol or research work just to keep the loop moving

## Slice Sequence

1. `ots-helper-demo-evidence-packet.md`
   - show helper-backed Path A posture in the demo
   - likely edit targets:
     - `apps/demo-client/src/App.tsx`
     - `apps/demo-client/src/styles.css`
2. `ots-helper-demo-proof-list-packet.md`
   - render per-proof helper inspection details in a separate demo panel
   - likely edit targets:
     - `apps/demo-client/src/App.tsx`
     - `apps/demo-client/src/styles.css`
     - `apps/ots-helper/src/inspect.ts`
3. `ots-helper-demo-provenance-packet.md`
   - label protocol-derived, helper-derived, and app-derived facts explicitly
   - likely edit targets:
     - `apps/demo-client/src/App.tsx`
     - `apps/demo-client/src/styles.css`
4. `ots-helper-demo-parity-packet.md`
   - keep demo wording aligned with `scripts/verify-scenario.ts` helper summary output
   - likely edit targets:
     - `apps/demo-client/src/App.tsx`
     - `scripts/verify-scenario.ts`
     - `apps/ots-helper/src/path-a-proof-bridge.ts`

## Hard Stop Conditions

Stop the loop immediately if a slice requires any of the following:

- changing PMA, PMU, PMX, STC, or STA wire behavior
- full `.ots` byte parsing or independent Bitcoin verification
- Path C behavior changes instead of keeping Path C separate
- relay orchestration, background helper processes, or wider adapter-layer work
- research-direction changes that should go back through
  `.private-docs/research/proposal-and-research-review.md`

## Execution Rules

- keep one active packet at a time even though the queue is preselected
- close each slice before starting the next one
- run `bun run typecheck`, `bun test`, and manual smoke for UI changes after each slice
- update `handoff.md` and `build-plan.md` honestly at every slice boundary
- if an autonomous agent needs a compact execution brief, use `bun run show:autonomous-loop --prompt`

## Closeout Result

- all four queued slices were implemented in one uninterrupted pass
- the Path A workspace now shows helper posture, per-proof inspection, provenance disclosure, and
  helper-status parity with `scripts/verify-scenario.ts`
- the loop stopped after slice 4 and handed off to `path-a-conflict-structure-packet.md` as the
  next bounded slice
