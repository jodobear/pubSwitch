---
title: Path A Real OTS Script Parity Packet
doc_type: packet
status: completed
owner: tack
phase: p5-path-a-real-ots-corpus
canonical: true
---

# Path A Real OTS Script Parity Packet

Completed slice for script parity over the deterministic real Path A corpus.

## Purpose

- provide one script surface that verifies the real corpus end to end
- keep helper inspection, event-id binding, and preimage checks aligned
- make the corpus easy to re-run in CI-like local checks without the browser

## Scope Delta

In scope:

- one deterministic verification script for the real Path A corpus
- parity between stored corpus expectations and helper inspection results
- package-script wiring for the new surface

Out of scope:

- browser demo integration
- remote calendar orchestration
- protocol or fixture-family redesign

## Closeout Notes

- one command now checks the real Path A corpus deterministically
- the script keeps helper verification and stored expectations aligned
- no browser-side verifier imports were added
