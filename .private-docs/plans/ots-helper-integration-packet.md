---
title: OTS Helper Integration Packet
doc_type: packet
status: completed
owner: tack
phase: p4-ots-helper-integration
canonical: false
---

# OTS Helper Integration Packet

Current active packet after OTS helper foundation closeout.

## Purpose

- connect the new helper output to one existing Path A proof surface in the repo
- reduce direct dependence on bare `x-verified-anchor-height` tags where the helper can stand in
- keep protocol packages pure while letting app or script layers consume helper-backed proof status

## Scope Delta

In scope:

- choose one consumer path for helper-backed proof inspection
- wire helper output into a script, demo evidence path, or adapter-layer bridge
- add deterministic verification for the integration path

Out of scope:

- full `.ots` byte parsing
- broad relay or background helper orchestration
- Path C changes
- production hardening

## Frozen Assumptions

- the helper remains local tooling and UX, not a new trust root
- protocol packages should stay pure; helper integration belongs in app, script, or adapter layers
- the next slice should favor one explicit bridge rather than a broad integration sweep

## Closeout Conditions

- one existing Path A proof surface consumes helper-backed output
- the integration path is test-backed or fixture-backed
- any remaining helper-versus-validator ambiguity is recorded explicitly instead of implied

## Closeout Result

- `scripts/verify-scenario.ts` now consumes helper-backed Path A proof inspection alongside resolver
  state checks
- `apps/ots-helper/src/path-a-proof-bridge.ts` now translates helper inspection output into a
  resolver-aligned proof posture:
  - `pending_only` for `published_pending_ots`
  - `confirmed_authority` when helper-confirmed proof coverage includes the resolved authority event
- the integration path currently extracts the active authority id from conflict-state reason text
  because the PoC conflict state does not yet expose a structured authority id
- deterministic integration coverage landed in
  `apps/ots-helper/src/__tests__/path-a-proof-bridge.test.ts`
- the next active packet is `ots-helper-demo-evidence-packet.md`
