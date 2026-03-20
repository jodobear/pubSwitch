---
title: Path A Schnorr Verification Packet
doc_type: packet
status: completed
owner: tack
phase: p4-path-a-schnorr-verification
canonical: false
---

# Path A Schnorr Verification Packet

Planned slice 3 of the verification-credibility loop.

## Purpose

- replace Path A signature shape checks with real verification
- keep PMA, PMU, and PMX validation honest without changing wire rules
- improve demo credibility before tackling lower-confidence OTS parsing work

## Scope Delta

In scope:

- real Nostr event-signature verification for Path A events
- real detached-signature verification for PMU and PMX preimages
- deterministic failing and passing tests in `packages/protocol-a`

Out of scope:

- Path A wire-shape changes
- resolver redesign
- real `.ots` parsing
- demo-client UI changes

## Frozen Assumptions

- pending or confirmed OTS behavior does not change in this slice
- validation errors should stay explicit rather than silently downgrading to shape-only checks
- duplicate normalization and resolver semantics should remain intact

## Closeout Conditions

- Path A validators perform real signature verification instead of hex-shape checks
- PMA, PMU, and PMX tests cover both valid and invalid signature cases
- any remaining Path A verification shortcut is recorded explicitly

## Closeout Result

- `packages/protocol-a` now performs real Schnorr verification for:
  - PMA event signatures
  - PMU event signatures plus detached `os` and `ns` signatures
  - PMX event signatures plus detached `ns` signatures
- deterministic Path A tests now cover tampered event signatures and tampered detached signatures
- deterministic Path A fixtures now use real fixed keypairs instead of synthetic hex signatures
