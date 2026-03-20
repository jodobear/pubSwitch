---
title: Path A Real OTS Chain Parity Packet
doc_type: packet
status: completed
owner: tack
phase: p5-path-a-real-ots-chain-root
canonical: false
---

# Path A Real OTS Chain Parity Packet

Completed slice 4 of the Path A real OTS chain-root loop.

## Purpose

- make mixed real-root versus placeholder-chain proof backing explicit across demo, script, and publish surfaces
- close the chain-root adoption lane honestly
- hand off to the next smallest remaining real-proof adoption slice

## Scope Delta

In scope:

- demo/script/publish wording for mixed proof-backing states
- control-doc parity after the chain-root lane closes
- explicit notes on what still remains placeholder-backed

Out of scope:

- new protocol behavior
- new proof minting
- Path C changes
- broad fixture redesign

## Frozen Assumptions

- mixed proof backing is a PoC presentation concern, not a protocol state change
- the browser demo still must not import the real verifier
- `multiple_roots` remains outside this loop because only one real confirmed root corpus item exists today

## Closeout Conditions

- mixed proof backing is explicit where a real confirmed root is paired with placeholder downstream proofs
- demo, publish, and verify surfaces stay aligned about which scenarios are fully real-backed, mixed-backed, or placeholder-backed
- control docs point to one honest next packet after the lane closes

## Closeout Notes

- demo, verify, and publish surfaces now distinguish `real_helper_verified`, `mixed_real_root`, and `fixture_placeholder`
- app-layer provenance now includes proof-backing and shared real corpus identifiers
- the next active packet is `demo-readiness-packet.md`
