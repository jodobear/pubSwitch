---
title: Shared Schnorr Foundation Packet
doc_type: packet
status: completed
owner: tack
phase: p4-shared-schnorr-foundation
canonical: false
---

# Shared Schnorr Foundation Packet

Planned slice 2 of the verification-credibility loop.

## Purpose

- add one pure shared verification path for Schnorr signatures
- keep event-id and detached-signature verification helpers reusable across protocol packages
- lock deterministic vectors before Path A and Path C adopt the helpers

## Scope Delta

In scope:

- shared Schnorr verification helpers in `protocol-shared`
- deterministic tests or vectors for passing and failing verification
- narrow dependency wiring if direct access to the verifier is needed

Out of scope:

- Path A resolver changes
- Path C resolver changes
- real `.ots` parsing
- app-layer UI changes

## Frozen Assumptions

- prefer a small shared helper surface rather than duplicating verification logic in protocol packages
- keep the helper pure and input-driven
- if direct package usage is needed, make it explicit rather than relying on an opaque transitive dependency

## Closeout Conditions

- shared Schnorr verification helpers exist with deterministic tests
- the helper surface is precise enough for Path A and Path C to adopt without duplicated crypto logic
- any verifier-library choice or limitation is recorded explicitly

## Closeout Result

- `protocol-shared` now exposes one pure Schnorr helper surface for:
  - deterministic event-id recomputation
  - event-signature verification
  - detached-digest signature verification
  - deterministic fixture signing support
- direct shared dependencies on `@noble/curves` and `@noble/hashes` are now explicit instead of
  relying on transitive access
- deterministic shared tests cover valid and tampered event plus detached signature cases
