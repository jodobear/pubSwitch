---
title: Path A Foundation Packet
doc_type: packet
status: completed
owner: tack
phase: p2-path-a-foundation
canonical: false
---

# Path A Foundation Packet

Completed PMA foundation packet after shared-foundation closeout.

## Purpose

- implement the first real Path A builder/validator slice
- prove the shared canonicalization path works in PMA-facing code
- leave the repo ready for resolver and fixture playback work

## Scope Delta

In scope:

- PMA event helpers and frozen tag rules
- PMA validation shape with explicit pending-versus-confirmed OTS posture
- deterministic fixture-backed happy path for PMA build/validate flow
- one explicit invalid path around missing or pending OTS authority

Out of scope:

- PMU builder or validator
- PMX builder or validator
- full Path A resolver walk
- Path C implementation
- demo UI expansion beyond reading resolver output later

## Frozen Assumptions

- PMA stays wire-light for the PoC with no extra liveness signature on the wire
- local control of the migration key is an app/onboarding policy, not a validator rule
- only Bitcoin-confirmed `1040` proofs make Path A authority valid
- `published_pending_ots` is visible state but is not valid Path A authority
- the detached-signature serializer is whatever `protocol-shared` emits; no alternate serializer is
  supported in the PoC

## Closeout Conditions

- a PMA builder and validator exist in `packages/protocol-a`
- the PMA path distinguishes pending OTS from confirmed authority
- at least one deterministic happy path and one invalid/pending path are tested
- any unresolved PMA/OTS ambiguity is recorded explicitly instead of guessed in code

## Closeout Result

- `packages/protocol-a` now has a PMA builder, PMA validator, and root-only resolver state handling
- semantic duplicate confirmed PMA roots collapse before root conflict detection
- the PoC currently promotes a `1040` proof from pending to confirmed only when local verification
  metadata includes `x-verified-anchor-height`
- PMA event-signature handling is still shape-only in this package; real Schnorr verification is not
  wired into the repo yet
- the next active packet is `path-a-authority-chain-packet.md`
