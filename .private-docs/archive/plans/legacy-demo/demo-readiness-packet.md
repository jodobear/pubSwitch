---
title: Demo Readiness Packet
doc_type: packet
status: completed
owner: tack
phase: p6-demo-readiness
canonical: true
---

# Demo Readiness Packet

Completed packet after the Path A real OTS chain-root loop closeout.

## Purpose

- tighten the final PoC walkthrough now that the major implementation slices are landed
- make the demo story explicit around fully real-backed, mixed-backed, and placeholder-backed Path A scenarios
- leave the repo in a clean operator-ready state without pretending the remaining optional proof work is already done

## Scope Delta

In scope:

- final demo narration and control-surface cleanup
- any narrow script or UI polish that improves operator clarity without changing protocol behavior
- explicit documentation of the remaining placeholder-backed scenario limits

Out of scope:

- minting new real PMU, PMX, or second-root `.ots` proofs
- independent Bitcoin block-header verification
- Path C redesign
- production hardening

## Frozen Assumptions

- `conflicting-roots` remains placeholder-backed because the current shared real corpus only contains one confirmed PMA root
- browser code still must not import `opentimestamps` directly
- local `.ots` verification still means digest binding plus attestation presence/height, not full Bitcoin node validation

## Closeout Conditions

- demo-facing docs and surfaces tell one coherent story about what is real-backed today
- any remaining optional work is framed as optional follow-on, not hidden implementation debt
- the final handoff is suitable for a live PoC walkthrough

## Closeout Notes

- the demo now has a shared walkthrough model in `packages/fixtures`
- the browser demo exposes an operator-facing walkthrough panel with current proof-backing coverage and caveats
- `bun run demo:walkthrough` now prints the same walkthrough order and caveats in the terminal
- the next active packet is `follow-on-options-packet.md`
