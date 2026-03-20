---
title: Path A Conflict Demo Packet
doc_type: packet
status: completed
owner: tack
phase: p4-path-a-conflict-demo
canonical: false
---

# Path A Conflict Demo Packet

Queued follow-on packet in the Path A conflict-state implementation loop.

## Purpose

- migrate the Path A demo conflict display to use structured conflict metadata
- keep the demo explanation coherent with the helper bridge and protocol state
- avoid any fallback to reason-text parsing in the app layer

## Scope Delta

In scope:

- Path A proof view-model migration
- demo conflict authority display updates
- focused verification for the conflicting-executions scenario

Out of scope:

- new UI lanes
- Path C changes
- recovery-bundle redesign
- broader visual overhaul

## Frozen Assumptions

- the app layer should consume structured conflict metadata after the helper bridge does
- the conflict scenario should remain easy to demo from deterministic fixtures
- the UI should still preserve raw conflict reason text where it helps human explanation

## Closeout Conditions

- the Path A demo no longer depends on reason-text parsing for conflict authority display
- the conflict scenario renders cleanly with the new structured field
- view-model tests cover the structured conflict field

## Closeout Result

- the Path A proof view model now reads structured conflict metadata directly
- protocol provenance cards in the demo now surface `conflict_kind` and conflict counts
- browser smoke confirmed the conflicting-executions scenario renders the structured conflict field
