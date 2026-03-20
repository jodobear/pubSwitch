---
title: Path A Conflict Fixtures Packet
doc_type: packet
status: completed
owner: tack
phase: p4-path-a-conflict-fixtures
canonical: true
---

# Path A Conflict Fixtures Packet

Completed slice 1 of the Path A conflict-playback loop.

## Purpose

- add richer deterministic Path A conflict scenarios now that conflict metadata is structured
- make root-conflict and child-conflict resolution visible in fixtures, scripts, and demo playback
- improve demoability without widening into broader protocol redesign

## Scope Delta

In scope:

- add at least one root-conflict fixture and one child-conflict fixture
- update fixture-backed verification and any affected demo playback surfaces
- keep the work narrow and deterministic

Out of scope:

- real `.ots` byte parsing
- Path C changes
- relay orchestration
- real Schnorr verification

## Frozen Assumptions

- root conflicts still do not expose one single authority id because that would be misleading
- helper-backed authority coverage remains meaningful only where one active authority exists
- this packet is for fixture and playback breadth, not another resolver redesign

## Closeout Conditions

- deterministic Path A fixtures cover multiple_roots and multiple_children conflict states
- scripts and demo playback still present conflict metadata coherently
- any remaining conflict-playback ambiguity is recorded explicitly

Closeout:

- deterministic Path A fixtures now cover `multiple_roots` and `multiple_children`
- fixture expectations stay stable in `packages/fixtures/src/__tests__/path-a-fixtures.test.ts`
- helper, script, and demo playback can now consume the new conflict scenarios
