---
title: Path A Real OTS CLI Parity Packet
doc_type: packet
status: completed
owner: tack
phase: p5-path-a-real-ots-bridge
canonical: true
---

# Path A Real OTS CLI Parity Packet

Completed slice for helper CLI and script parity on the shared browser-safe real corpus data.

## Purpose

- keep helper CLI output and the verification script aligned to one shared corpus source
- reduce drift between the browser-safe mirror and helper-side verification
- preserve a simple terminal path for rechecking the real corpus

## Scope Delta

In scope:

- CLI and script parity on the shared corpus data
- deterministic tests for parity-sensitive behavior
- no new verifier bundling

Out of scope:

- browser demo redesign
- remote proof minting
- protocol changes

## Closeout Notes

- helper CLI and script surfaces now both read from the shared corpus source
- parity checks remain deterministic and local
