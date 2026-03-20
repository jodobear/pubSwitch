---
title: Verification Credibility Loop
doc_type: loop
status: completed
owner: tack
phase: p4-verification-foundation
canonical: false
---

# Verification Credibility Loop

High-confidence uninterrupted implementation loop for the current verification lane.

## Why This Loop Is Safe

- all slices stay inside one narrow verification lane instead of reopening protocol shape
- the loop starts with shared Schnorr plumbing before wiring it into Path A and Path C validators
- each slice is pure-package work with deterministic tests and no required UI redesign
- real OTS parsing stays explicitly out of this loop because it is a lower-confidence slice

## Executor Contract

- execute the slices in order without interruption unless a hard stop condition triggers
- treat this as an implementation loop, not just a planning queue
- after each slice, run the listed gates, update the current packet honestly, then continue
- stop if the work starts turning into `.ots` parsing, remote-service trust, or broader protocol redesign

## Slice Sequence

1. `verification-foundation-packet.md`
   - reflect the verification trust model into research, startup, and control docs
   - likely edit targets:
     - `.private-docs/research/proposal-and-research-review.md`
     - `handoff.md`
     - `.private-docs/plans/build-plan.md`
2. `shared-schnorr-foundation-packet.md`
   - add pure shared Schnorr verification helpers and deterministic vectors
   - likely edit targets:
     - `packages/protocol-shared/src/index.ts`
     - `packages/protocol-shared/src/*.ts`
     - `packages/protocol-shared/src/__tests__/*.test.ts`
3. `path-a-schnorr-verification-packet.md`
   - replace Path A signature shape checks with real verification for event and detached signatures
   - likely edit targets:
     - `packages/protocol-a/src/index.ts`
     - `packages/protocol-a/src/__tests__/protocol-a.test.ts`
4. `path-c-schnorr-verification-packet.md`
   - replace Path C signature shape checks with real event-signature verification
   - likely edit targets:
     - `packages/protocol-c/src/index.ts`
     - `packages/protocol-c/src/__tests__/protocol-c.test.ts`

## Hard Stop Conditions

Stop the loop immediately if a slice requires any of the following:

- full `.ots` byte parsing, Bitcoin attestation verification, or remote calendar orchestration
- changing PMA, PMU, PMX, STC, or STA wire behavior
- merging Path A and Path C logic instead of keeping them independent
- broad demo-client redesign instead of narrow validator and helper work
- protocol-direction changes that should go back through
  `.private-docs/research/proposal-and-research-review.md`

## Execution Rules

- keep one active packet at a time even though the queue is preselected
- close each slice before starting the next one
- run `bun run typecheck` and `bun test` after each slice
- run manual smoke only if a slice unexpectedly reaches the UI
- update `handoff.md` and `build-plan.md` honestly at every slice boundary
- if an autonomous agent needs a compact execution brief, use `bun run show:autonomous-loop --current --prompt`

## Closeout Result

- all four queued slices were executed in one uninterrupted pass
- verification trust-model posture is explicit in research and control docs
- `protocol-shared`, `protocol-a`, and `protocol-c` now use real Schnorr verification
- deterministic fixtures and tests now use real fixed keypairs rather than synthetic signature hex
- the loop stopped after slice 4 and handed off to `path-a-conflict-fixtures-packet.md`
