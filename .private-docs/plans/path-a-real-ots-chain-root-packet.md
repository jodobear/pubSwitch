---
title: Path A Real OTS Chain Root Packet
doc_type: packet
status: completed
owner: tack
phase: p5-path-a-real-ots-chain-root
canonical: true
---

# Path A Real OTS Chain Root Packet

Completed packet and slice 1 of the Path A real OTS chain-root loop.

## Purpose

- reuse the shared real confirmed PMA corpus item as the confirmed root in the `confirmed-authority` scenario first
- establish the single-root authority-chain adoption pattern before wider execution-family reuse
- keep mixed proof provenance explicit where the root becomes real-backed but PMU proofs remain placeholder-backed

## Scope Delta

In scope:

- one narrow `confirmed-authority` migration to the shared real confirmed PMA root
- deterministic fixture and script parity around mixed real-root-plus-placeholder-child backing
- explicit metadata if the scenario stops being purely placeholder-backed

Out of scope:

- minting new real PMU or PMX `.ots` proofs
- bundling `opentimestamps` into the browser demo
- Path C changes
- protocol wire changes

## Frozen Assumptions

- the shared real confirmed PMA corpus item remains the only real confirmed root available for main demo adoption right now
- PMU and PMX proofs may remain placeholder-backed in this slice if the root becomes real-backed first
- helper-side local `.ots` verification still does not perform independent Bitcoin block-header verification

## Closeout Conditions

- `confirmed-authority` reuses the shared real confirmed PMA root without breaking deterministic behavior
- mixed proof provenance is explicit if the root becomes real-backed but downstream chain proofs stay placeholder-backed
- tests and scripts remain honest about what is real-backed versus placeholder-backed

## Closeout Notes

- `confirmed-authority` now reuses the shared real confirmed PMA root
- the duplicate-PMU authority-chain semantics remain unchanged
- the scenario is now explicitly marked `mixed_real_root`
