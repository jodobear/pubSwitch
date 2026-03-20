---
title: OTS Helper Demo Parity Packet
doc_type: packet
status: completed
owner: tack
phase: p4-ots-helper-demo-parity
canonical: false
---

# OTS Helper Demo Parity Packet

Queued follow-on packet in the Path A proof-evidence loop.

## Purpose

- keep the demo proof-status wording aligned with `scripts/verify-scenario.ts`
- reduce drift between demo explanation and deterministic verification output
- make helper summary states easy to compare across UI and script surfaces

## Scope Delta

In scope:

- alignment of proof-status labels and mismatch language between demo and script surfaces
- one focused deterministic verification pass for the aligned wording
- any small glue needed to keep the two surfaces coherent

Out of scope:

- new fixture families
- protocol behavior changes
- broad process changes
- Path C changes

## Frozen Assumptions

- script parity is a presentation and tooling concern, not a protocol change
- the loop should stop if parity work starts demanding deeper protocol restructuring
- the demo may remain fixture-backed even when live relay support is deferred

## Closeout Conditions

- helper summary states line up across demo and script surfaces
- deterministic verification still passes after the wording and glue changes
- any remaining demo-versus-script divergence is recorded explicitly

## Closeout Result

- the demo now surfaces the exact helper status codes from the proof bridge
- `scripts/verify-scenario.ts` now prints `helper_status=<status>` alongside the JSON summary
- deterministic verification stayed green after the wording and presentation alignment
