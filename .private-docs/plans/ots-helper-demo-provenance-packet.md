---
title: OTS Helper Demo Provenance Packet
doc_type: packet
status: completed
owner: tack
phase: p4-ots-helper-demo-provenance
canonical: false
---

# OTS Helper Demo Provenance Packet

Queued follow-on packet in the Path A proof-evidence loop.

## Purpose

- make it obvious which facts come from pure protocol resolution, helper mediation, or app-layer UX
- reduce demo ambiguity around what is cryptographic truth versus local tooling posture
- preserve the repo rule that applesauce stays at the app layer

## Scope Delta

In scope:

- provenance labels or cards in the Path A demo workspace
- explicit copy for protocol-derived, helper-derived, and app-derived facts
- focused UI verification for clarity and non-overlap

Out of scope:

- protocol resolver changes
- recovery-bundle redesign
- Path C changes
- production-hardening claims

## Frozen Assumptions

- helper-backed proof posture remains local tooling, not a new trust root
- provenance labels should clarify existing behavior, not invent new behavior
- Path A and Path C stay clearly separate in presentation

## Closeout Conditions

- the demo explicitly distinguishes protocol, helper, and app-layer facts
- at least one fixture per major proof posture is visually checked
- remaining helper shortcuts are recorded explicitly in docs instead of implied in UI copy

## Closeout Result

- the Path A workspace now includes explicit protocol-derived, helper-derived, and app-derived
  provenance cards
- helper limits remain spelled out in the UI, including the current
  `x-verified-anchor-height` bridge dependency
- browser smoke confirmed the provenance cards render alongside the helper posture and proof list
