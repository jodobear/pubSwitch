---
title: Path A Conflict Helper Guard Packet
doc_type: packet
status: completed
owner: tack
phase: p4-path-a-conflict-helper-guard
canonical: false
---

# Path A Conflict Helper Guard Packet

Completed slice 2 of the Path A conflict-playback loop.

## Purpose

- keep helper-backed authority coverage honest when root or child conflicts exist
- prevent helper summaries from implying one active authority where the protocol state is plural
- make the no-single-authority rule explicit in deterministic tests

## Scope Delta

In scope:

- narrow helper-bridge handling for `multiple_roots` and `multiple_children`
- deterministic bridge tests for conflict scenarios
- explicit conflict-safe helper wording

Out of scope:

- protocol resolver redesign
- Path C changes
- real `.ots` parsing
- broader helper orchestration

## Frozen Assumptions

- helper-backed authority coverage only makes sense when one active authority exists
- `multiple_roots` must not be collapsed into one implied authority id
- this slice is about guardrails, not new proof semantics

## Closeout Conditions

- helper summaries stay explicit and non-authoritative for root and child conflicts
- bridge tests cover conflict scenarios without implied authority coverage
- any remaining helper ambiguity is recorded explicitly

## Closeout

- helper bridge now returns `conflict_plural_authority` for `multiple_roots` and
  `multiple_children`
- deterministic helper tests cover both plural-conflict cases
- helper-backed authority coverage stays unavailable where one active authority cannot be chosen
