---
title: Path A Real OTS Helper Packet
doc_type: packet
status: completed
owner: tack
phase: p5-path-a-real-ots-corpus
canonical: true
---

# Path A Real OTS Helper Packet

Completed slice for helper-side corpus inspection and CLI access.

## Purpose

- expose the deterministic real Path A corpus through helper-side inspection commands
- keep the heavy verifier in helper code rather than the browser demo
- make corpus verification easy to run from the terminal during the PoC

## Scope Delta

In scope:

- helper CLI access to the real Path A corpus
- helper-side corpus inspection summaries
- deterministic tests for the helper-side corpus path

Out of scope:

- browser demo bundling of `opentimestamps`
- protocol resolver changes
- Path C changes

## Closeout Notes

- `apps/ots-helper` now exposes real corpus inspection commands
- the corpus stays deterministic and local
- the browser/helper boundary remains intact
