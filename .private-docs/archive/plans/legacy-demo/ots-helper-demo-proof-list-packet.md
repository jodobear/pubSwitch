---
title: OTS Helper Demo Proof List Packet
doc_type: packet
status: completed
owner: tack
phase: p4-ots-helper-demo-proof-list
canonical: false
---

# OTS Helper Demo Proof List Packet

Queued follow-on packet in the Path A proof-evidence loop.

## Purpose

- show each helper-inspected `1040` proof as a separate inspected row in the demo
- make target-event coverage visible without forcing users to read raw JSON first
- keep helper inspection visually distinct from raw proof events and protocol state

## Scope Delta

In scope:

- a per-proof inspection panel in the Path A demo workspace
- helper-inspection fields such as proof id, target id, and pending versus confirmed posture
- focused verification for multiple fixture states

Out of scope:

- new protocol semantics
- Path C changes
- full `.ots` parsing
- protocol-package changes unless required only for harmless presentation data

## Frozen Assumptions

- the helper remains an app-layer bridge, not protocol truth
- the panel should reuse existing helper inspection output before inventing new proof abstractions
- raw proof events still remain separately visible

## Closeout Conditions

- the demo shows a helper-inspected proof list for Path A scenarios
- pending, confirmed, and invalid helper states are visibly distinct
- helper-inspected rows stay separate from raw proof JSON and protocol resolver output

## Closeout Result

- the Path A workspace now renders one helper-inspection row per proof event
- proof rows show proof id, target event id, target kind, content length, and anchor-height posture
- invalid helper rows are isolated from valid proof rows without altering protocol state
- raw `1040` proof JSON remains in a separate evidence panel
