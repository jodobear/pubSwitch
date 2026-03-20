---
title: Path C Schnorr Verification Packet
doc_type: packet
status: completed
owner: tack
phase: p4-path-c-schnorr-verification
canonical: false
---

# Path C Schnorr Verification Packet

Planned slice 4 of the verification-credibility loop.

## Purpose

- replace Path C event-signature shape checks with real verification
- keep Path C credible while preserving its separate advisory role
- align Path C validator honesty with the upgraded shared verification posture

## Scope Delta

In scope:

- real Nostr event-signature verification for STC and STA events
- deterministic valid and invalid signature tests in `packages/protocol-c`
- narrow shared-helper adoption from `protocol-shared`

Out of scope:

- Path C resolver redesign
- Path A behavior changes beyond shared-helper reuse
- real `.ots` parsing
- UI presentation changes

## Frozen Assumptions

- Path C remains advisory and separate from Path A
- live-attestation supersession rules are unchanged by this slice
- STA `e` references remain shape-only unless separately scoped later

## Closeout Conditions

- Path C validators perform real event-signature verification
- STC and STA tests cover both valid and invalid signatures
- any remaining Path C validation shortcut is recorded explicitly

## Closeout Result

- `packages/protocol-c` now performs real Schnorr event-signature verification for STC and STA
- deterministic Path C tests now cover tampered claim and attestation signatures
- deterministic Path C fixtures now use real fixed keypairs instead of synthetic hex signatures
