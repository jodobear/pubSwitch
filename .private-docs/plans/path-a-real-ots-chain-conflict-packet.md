---
title: Path A Real OTS Chain Conflict Packet
doc_type: packet
status: completed
owner: tack
phase: p5-path-a-real-ots-chain-root
canonical: false
---

# Path A Real OTS Chain Conflict Packet

Completed slice 2 of the Path A real OTS chain-root loop.

## Purpose

- reuse the shared real confirmed PMA root in the `conflicting-children` scenario
- reduce placeholder root-proof usage in the child-conflict branch without changing child-proof semantics
- keep the plural-child conflict posture explicit while the root proof backing becomes real

## Scope Delta

In scope:

- `conflicting-children` fixture migration to a real confirmed PMA root
- deterministic fixture and helper-bridge parity checks
- explicit mixed proof provenance if the root is real-backed while children remain placeholder-backed

Out of scope:

- `multiple_roots` redesign
- real PMU proof minting
- Path C changes
- protocol wire changes

## Frozen Assumptions

- only the root proof becomes real-backed in this slice
- helper-backed authority coverage remains unavailable where one active child authority cannot be chosen
- the shared real confirmed PMA corpus item remains the root source of truth for this lane

## Closeout Conditions

- `conflicting-children` reuses the shared real confirmed PMA root without breaking deterministic conflict behavior
- mixed proof backing is explicit in fixture or surface metadata
- helper and script outputs remain honest about the plural-child conflict

## Closeout Notes

- `conflicting-children` now reuses the shared real confirmed PMA root
- helper plural-authority guardrails remained unchanged
- the scenario is now explicitly marked `mixed_real_root`
