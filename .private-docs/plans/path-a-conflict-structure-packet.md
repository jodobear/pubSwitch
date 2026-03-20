---
title: Path A Conflict Structure Packet
doc_type: packet
status: completed
owner: tack
phase: p4-path-a-conflict-structure
canonical: false
---

# Path A Conflict Structure Packet

Loop slice 1 after the Path A proof-evidence loop closeout.

This is slice 1 of the queued Path A conflict-state implementation loop in
`path-a-conflict-state-loop.md`.

## Purpose

- replace helper-adjacent conflict authority-id parsing from reason text with structured Path A state
- keep Path A protocol logic pure while reducing demo and helper glue fragility
- make conflict-state authority coverage explicit for future helper and UI surfaces

## Scope Delta

In scope:

- add structured authority-id metadata to relevant Path A conflict states
- update helper bridges and tests to consume the structured field
- keep the change narrow and avoid widening into broader protocol redesign

Out of scope:

- real `.ots` byte parsing
- Path C changes
- relay orchestration
- real Schnorr verification

## Frozen Assumptions

- this is a PoC state-shape refinement, not a final standards commitment
- any new structured conflict metadata should preserve current resolver meaning
- helper-backed proof posture remains helper-mediated even after conflict metadata is structured

## Closeout Conditions

- Path A conflict states no longer require regex extraction from free-form reason text for authority coverage
- helper bridge tests cover the structured conflict field
- any remaining conflict-shape ambiguity is recorded explicitly

## Closeout Result

- `PreparedMigrationState` now exposes structured conflict variants for:
  - `multiple_roots`
  - `multiple_children`
  - `multiple_executions`
- relevant conflict states now carry structured authority metadata instead of relying only on free-form
  reason text
- deterministic protocol and fixture expectations now cover the new conflict structure
