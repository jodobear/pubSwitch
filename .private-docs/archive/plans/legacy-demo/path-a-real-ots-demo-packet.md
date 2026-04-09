---
title: Path A Real OTS Demo Packet
doc_type: packet
status: completed
owner: tack
phase: p5-path-a-real-ots-bridge
canonical: true
---

# Path A Real OTS Demo Packet

Completed slice for the browser-safe real OTS snapshot view in the Path A workspace.

## Purpose

- make one real OTS-backed Path A flow visible in the demo without bundling the verifier into the browser
- keep helper-derived proof truth separate from pure protocol scenario truth
- show the real corpus as a labeled snapshot, not as hidden protocol state

## Scope Delta

In scope:

- one Path A demo panel for the real corpus snapshot
- explicit provenance and trust-boundary copy
- focused browser smoke

Out of scope:

- browser-side `.ots` parsing
- protocol resolver changes
- Path C changes

## Closeout Notes

- the Path A demo now shows the real helper-verified corpus snapshot separately from fixture scenarios
- the panel stays explicit about being a browser-safe mirror of helper-side verification results
