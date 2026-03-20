---
title: Path A Conflict Script Parity Packet
doc_type: packet
status: completed
owner: tack
phase: p4-path-a-conflict-script-parity
canonical: false
---

# Path A Conflict Script Parity Packet

Completed slice 4 of the Path A conflict-playback loop.

## Purpose

- keep fixture scripts, helper output, and docs aligned for the new root and child conflict scenarios
- lock deterministic output for conflict playback after the fixture and UI slices land
- stop the loop with one honest handoff point

## Scope Delta

In scope:

- `scripts/verify-scenario.ts` conflict scenario parity
- any affected fixture/test expectations
- control-doc closeout for the loop

Out of scope:

- broader protocol changes
- Path C changes
- `.ots` parsing
- new demo features beyond parity

## Frozen Assumptions

- script output should stay deterministic and concise
- helper summaries should remain absent or explicitly limited where one authority cannot be chosen
- this slice closes parity; it does not reopen previous conflict-state work

## Closeout Conditions

- verification-script output is deterministic for root and child conflict scenarios
- fixture, helper, demo, and docs describe the same conflict posture
- the loop can stop cleanly after parity is locked

## Closeout

- `scripts/verify-scenario.ts` now reports deterministic plural-conflict helper output for root and
  child conflict scenarios
- fixture, helper, demo, and docs now align on `conflict_plural_authority` for plural Path A
  conflicts
- the loop can stop cleanly with the next active work moving to real local OTS verification
