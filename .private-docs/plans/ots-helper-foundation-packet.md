---
title: OTS Helper Foundation Packet
doc_type: packet
status: completed
owner: tack
phase: p4-ots-helper-foundation
canonical: false
---

# OTS Helper Foundation Packet

Current active packet after recovery-bundle foundation closeout.

## Purpose

- replace more of the local proof placeholder posture with a concrete OTS helper slice
- keep the helper clearly in the UX/tooling layer rather than treating it as new trust
- prepare the repo for more credible demo proof handling without broad production hardening

## Scope Delta

In scope:

- define the smallest useful helper contract for demo proof inspection or upgrade
- implement one helper-backed proof read or verification path in `apps/ots-helper`
- add at least one deterministic fixture or test for the helper behavior
- document what still remains placeholder versus what becomes helper-backed

Out of scope:

- full production OTS service behavior
- broad relay orchestration
- final standards-grade proof validation UX
- changes to Path C

## Frozen Assumptions

- the helper is for UX and local tooling, not for trust delegation
- Path A authority validity still depends on local verification logic in the PoC
- the next slice should prefer a bounded proof inspection capability over a broad helper feature set

## Closeout Conditions

- `apps/ots-helper` has one concrete non-placeholder behavior
- the behavior is covered by at least one deterministic test or fixture
- any remaining proof or helper shortcuts are recorded explicitly instead of implied

## Closeout Result

- `apps/ots-helper/src/inspect.ts` now provides a concrete proof-inspection path for `kind:1040`
  events:
  - validate target `e` / `k` tags
  - require non-empty proof bytes in `content`
  - surface pending versus locally Bitcoin-confirmed status from
    `x-verified-anchor-height`
- `apps/ots-helper/src/index.ts` now exposes a small CLI with:
  - `inspect-scenario <path-a-scenario-id>`
  - `inspect-stdin`
- deterministic helper coverage landed in `apps/ots-helper/src/__tests__/inspect.test.ts`
- the helper still does not parse raw `.ots` bytes or independently confirm Bitcoin attestations; it
  remains a local tooling bridge over the PoC metadata posture
- the next active packet is `ots-helper-integration-packet.md`
