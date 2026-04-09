---
title: Path A Fixtures Demo Packet
doc_type: packet
status: completed
owner: tack
phase: p4-path-a-fixtures-demo
canonical: false
---

# Path A Fixtures Demo Packet

Current active packet after PMX and execution-resolution closeout.

## Purpose

- package deterministic Path A scenarios for demo playback
- replace the demo shell placeholder with real resolver-backed evidence views
- leave Path C independent and untouched until Path A playback is credible

## Scope Delta

In scope:

- deterministic fixture scenarios for:
  - pending OTS
  - confirmed prepared authority
  - executed happy path
  - one conflict path
- script support to generate or verify those fixtures
- demo-client wiring that shows raw evidence plus real Path A resolver output

Out of scope:

- Path C implementation
- in-repo binary `1040` proof parsing
- real Schnorr verification
- production-grade recovery-bundle hardening

## Frozen Assumptions

- fixture `1040` proofs may continue using local verified metadata until the OTS helper or parser
  slice lands
- Path A and Path C remain separate in logic and display
- demoability is the goal; fixture playback is acceptable where live relay timing would add noise

## Closeout Conditions

- deterministic Path A fixtures exist for happy, pending, and conflict cases
- fixture verification or generation scripts are no longer placeholders
- the demo client renders real Path A resolver state from fixture-backed evidence
- any remaining fixture or demo shortcuts are recorded explicitly instead of implied

## Closeout Result

- `packages/fixtures` now ships deterministic Path A scenarios for pending OTS, confirmed
  authority, executed happy path, and conflicting executions
- `scripts/generate-fixtures.ts`, `scripts/verify-scenario.ts`, and `scripts/publish-scenario.ts`
  now exercise real fixture-backed protocol data instead of placeholder stubs
- `apps/demo-client` now renders Path A fixture scenarios with expected state, resolved state, raw
  events, and raw `1040` proof evidence
- the demo still uses local verified `1040` metadata rather than in-repo proof parsing
- the next active packet is `path-c-fixtures-demo-packet.md`
