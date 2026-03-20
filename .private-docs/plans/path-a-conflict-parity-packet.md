---
title: Path A Conflict Parity Packet
doc_type: packet
status: completed
owner: tack
phase: p4-path-a-conflict-parity
canonical: false
---

# Path A Conflict Parity Packet

Queued follow-on packet in the Path A conflict-state implementation loop.

## Purpose

- keep scripts, fixtures, and docs aligned with the new structured conflict shape
- reduce drift between verification output and the demo-facing conflict surface
- end the loop with deterministic parity instead of leaving a mixed old/new conflict model

## Scope Delta

In scope:

- verification script wording or output tweaks
- fixture expected-state parity
- control-doc alignment

Out of scope:

- broader protocol changes
- new fixture families
- Path C changes
- production-hardening

## Frozen Assumptions

- this packet should stay in parity and control-surface territory, not reopen protocol shape
- free-form reason text may stay as human-readable context beside structured fields
- the loop should stop after parity locks cleanly

## Closeout Conditions

- script output remains deterministic with the structured conflict field present
- fixture expectations and docs describe the same conflict shape
- any remaining conflict-state ambiguity is recorded explicitly

## Closeout Result

- `scripts/verify-scenario.ts` now prints structured conflict-state output alongside helper authority
  coverage
- deterministic fixture expectations and protocol tests now describe the same conflict shape
- the loop can stop cleanly with protocol, helper, demo, and script surfaces aligned on conflict state
