---
title: OTS Real Verification Foundation Packet
doc_type: packet
status: completed
owner: tack
phase: p5-ots-real-verification
canonical: true
---

# OTS Real Verification Foundation Packet

Completed foundation packet after the Path A conflict-playback loop closeout.

## Purpose

- replace the PoC's local `x-verified-anchor-height` bridge with one real local OTS verification path
- keep OTS proof production and OTS proof verification clearly separate in the demo trust model
- improve demo credibility without widening into relay orchestration or protocol redesign

## Scope Delta

In scope:

- choose one concrete local verification path for real `kind:1040` proof bytes in `apps/ots-helper`
- verify at least one deterministic demo proof end to end against a local helper result
- keep protocol packages pure and keep helper logic at the app/tooling layer

Out of scope:

- rewriting the Path A resolver
- Path C changes
- remote-calendar orchestration
- production-hardening around proof storage or caching

## Frozen Assumptions

- remote OTS calendars or services may help create or upgrade proofs, but they are not the final truth source for demo claims
- local verification should determine whether the PoC says a proof is Bitcoin confirmed
- real Schnorr verification already landed and does not need to be reopened in this slice

## Closeout Conditions

- one concrete local OTS verification path is selected and implemented in `apps/ots-helper`
- at least one demo-backed proof can be verified locally without relying on `x-verified-anchor-height`
- any remaining `.ots` operational ambiguity is recorded explicitly

## Closeout

- `apps/ots-helper` now contains a real local `.ots` parsing and digest-binding path in
  `real-inspect.ts`
- deterministic bundled OTS vectors cover one pending proof and one Bitcoin-attested proof without
  relying on `x-verified-anchor-height`
- the current helper path stops at local proof parsing and Bitcoin-attestation extraction; full
  independent block-header verification is still deferred
- the helper CLI can inspect those vectors directly, while the browser demo remains on the lighter
  fixture path because bundling the OpenTimestamps dependency tree into the browser caused runtime
  incompatibilities
