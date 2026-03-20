---
title: Path A Real OTS Chain Execution Packet
doc_type: packet
status: completed
owner: tack
phase: p5-path-a-real-ots-chain-root
canonical: false
---

# Path A Real OTS Chain Execution Packet

Completed slice 3 of the Path A real OTS chain-root loop.

## Purpose

- reuse the shared real confirmed PMA root inside the execution-family scenarios
- reduce placeholder root-proof usage in `executed-happy-path` and `conflicting-executions`
- keep downstream PMU and PMX proof provenance explicit while only the confirmed root becomes real-backed

## Scope Delta

In scope:

- execution-family fixture migration to a real confirmed PMA root
- deterministic script or fixture parity for the updated chain
- explicit mixed proof provenance where root and downstream chain elements differ

Out of scope:

- real PMU proof minting
- real PMX proof minting
- Path C changes
- protocol wire changes

## Frozen Assumptions

- the shared real confirmed PMA root can be reused across the execution-family scenarios
- execution semantics must remain unchanged even if the root proof backing changes
- any UI or script copy should stay narrow and factual

## Closeout Conditions

- `executed-happy-path` and `conflicting-executions` reuse the shared real confirmed PMA root without changing expected resolver outcomes
- deterministic tests or script checks cover the updated execution-family scenarios
- mixed proof backing remains explicit where downstream chain proofs are still placeholder-backed

## Closeout Notes

- `executed-happy-path` and `conflicting-executions` now reuse the shared real confirmed PMA root
- PMU and PMX behavior stayed deterministic and unchanged
- both scenarios are now explicitly marked `mixed_real_root`
