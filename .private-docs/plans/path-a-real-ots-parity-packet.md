---
title: Path A Real OTS Parity Packet
doc_type: packet
status: completed
owner: tack
phase: p5-path-a-real-ots-scenario-replacement
canonical: true
---

# Path A Real OTS Parity Packet

Completed slice for proof-backing parity across the Path A demo and script surfaces.

## Purpose

- label which Path A scenarios are backed by shared real helper-verified corpus data
- make demo and script narration easier and more honest
- keep placeholder-backed scenarios explicit while the remaining adoption work is still in progress

## Scope Delta

In scope:

- proof-backing labels in Path A demo and script/publish output
- deterministic tests or checks for the updated scenario inventory
- no protocol behavior changes

Out of scope:

- browser-side `.ots` parsing
- Path C UI changes
- broad copy rewrites outside the Path A lane

## Closeout Notes

- real-backed and placeholder-backed Path A scenarios are now explicit in the main PoC surfaces
- demo narration no longer has to rely on implicit knowledge of which scenarios use real proof material
