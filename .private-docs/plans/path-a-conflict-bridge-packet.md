---
title: Path A Conflict Bridge Packet
doc_type: packet
status: completed
owner: tack
phase: p4-path-a-conflict-bridge
canonical: false
---

# Path A Conflict Bridge Packet

Queued follow-on packet in the Path A conflict-state implementation loop.

## Purpose

- remove helper-side authority-id regex parsing from free-form conflict reason text
- consume structured Path A conflict metadata directly
- preserve current helper proof posture semantics while reducing bridge fragility

## Scope Delta

In scope:

- helper bridge migration to structured conflict metadata
- bridge test updates
- focused verification against the existing conflict fixture

Out of scope:

- new proof semantics
- Path C changes
- demo redesign
- `.ots` parsing

## Frozen Assumptions

- this packet depends on the protocol-side conflict field landing first
- helper status meanings should not change as part of the migration
- free-form reason text may remain for humans even after machine-readable fields exist

## Closeout Conditions

- the helper bridge no longer extracts the authority id from reason text
- helper tests cover the structured conflict field
- any remaining conflict-bridge shortcuts are recorded explicitly

## Closeout Result

- `apps/ots-helper/src/path-a-proof-bridge.ts` now consumes the structured conflict field directly
- helper conflict coverage no longer regex-parses authority ids from reason text
- bridge tests now lock the structured conflict path against the deterministic conflict fixture
