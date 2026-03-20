---
title: Shared Foundation Packet
doc_type: packet
status: completed
owner: tack
phase: p1-shared-foundation
canonical: false
---

# Shared Foundation Packet

Completed shared-foundation packet after bootstrap closeout.

## Purpose

- implement the first real shared protocol helpers
- freeze the exact Path A entry assumptions for the first implementation slice
- leave the repo ready for PMA / PMU / PMX work without reopening bootstrap questions

## Scope Delta

In scope:

- canonical JSON preimage helper
- lowercase-hex and byte helpers
- transition-id helper
- shared Nostr event/tag helpers
- first Path A frozen assumptions for builders and validators

Out of scope:

- full OTS verification
- full Path A resolver
- Path C implementation beyond shared primitives
- UI expansion beyond the existing shell

## Frozen Assumptions

- keep PMA wire format unchanged for the first slice
- treat migration-key liveness as local onboarding policy for now, not wire-level proof
- keep OTS confirmation modeled explicitly as pending versus confirmed
- keep detached-signature preimages canonical and fixture-driven

## Closeout Conditions

- `protocol-shared` exports are real and tested
- one Path A implementation packet is ready to start immediately after this slice
- any new protocol uncertainty is recorded explicitly, not hidden in code

## Closeout Result

- `protocol-shared` now provides deterministic canonical JSON bytes for detached-signature preimages
- hex, transition-id, and tag helpers are covered by fixture-style tests
- object keys are serialized in sorted order and ambiguous values such as `undefined`, sparse arrays,
  and non-finite numbers are rejected
- the next active packet is `path-a-foundation-packet.md`
