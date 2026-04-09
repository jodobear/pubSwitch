---
title: OTS Helper Demo Evidence Packet
doc_type: packet
status: completed
owner: tack
phase: p4-ots-helper-demo-evidence
canonical: false
---

# OTS Helper Demo Evidence Packet

Loop slice 1 after OTS helper integration closeout.

This is slice 1 of the queued Path A proof-evidence autonomous loop in
`path-a-proof-evidence-loop.md`.

## Purpose

- surface helper-backed Path A proof posture directly in the demo evidence workspace
- keep protocol packages pure while making the OTS bridge visible to demo users
- reduce the gap between script verification and what the demo visibly explains

## Scope Delta

In scope:

- add helper-backed Path A proof inspection to the demo client evidence view
- keep the helper status clearly distinct from raw protocol validation
- add focused verification for the UI integration

Out of scope:

- full `.ots` byte parsing
- Path C changes
- broader helper orchestration
- production hardening

## Frozen Assumptions

- helper-backed proof posture remains an app-layer or script-layer bridge, not protocol truth
- the UI should be explicit about helper mediation versus pure protocol logic
- the next slice should keep the integration narrow to the existing Path A evidence workspace

## Closeout Conditions

- the demo client shows helper-backed Path A proof posture for fixture scenarios
- the helper-backed presentation stays separate from protocol state and raw event evidence
- any remaining helper UI shortcuts are recorded explicitly instead of implied

## Closeout Result

- `apps/demo-client` now shows a dedicated helper-backed Path A proof-posture panel
- helper status codes are surfaced directly in the UI as `pending_only`, `confirmed_authority`, and
  helper-error cases, matching the script-facing summary vocabulary
- the helper-backed panel stays separate from raw resolver output and raw `1040` proof JSON
- focused browser smoke passed for the pending and confirmed Path A scenarios
