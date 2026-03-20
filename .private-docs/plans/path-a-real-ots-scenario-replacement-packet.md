---
title: Path A Real OTS Scenario Replacement Packet
doc_type: packet
status: completed
owner: tack
phase: p5-path-a-real-ots-scenario-replacement
canonical: true
---

# Path A Real OTS Scenario Replacement Packet

Completed packet after the browser-safe real OTS bridge closeout.

## Purpose

- replace one placeholder Path A proof path with the new real corpus in a wider scenario flow
- reduce reliance on placeholder `1040` content where the PoC can now use real helper-verified proof bytes
- keep helper-derived truth and protocol truth explicitly separated

## Scope Delta

In scope:

- one narrow replacement of placeholder Path A proof material with the real corpus in an existing scenario or verification path
- deterministic verification around that replacement
- explicit provenance notes where behavior changes

Out of scope:

- bundling `opentimestamps` into the browser demo
- remote calendar orchestration
- broad fixture-family redesign
- Path C changes

## Frozen Assumptions

- the real corpus is currently a browser-safe mirror of helper-side verification, not browser-side `.ots` parsing
- independent Bitcoin block-header verification remains deferred
- the next slice should stay narrow and replace only one placeholder proof path first

## Closeout Conditions

- one existing placeholder Path A proof path is replaced by the real corpus without breaking demo clarity
- deterministic tests or scripts cover the replacement
- any remaining trust-model or browser-boundary limits stay explicit

## Closeout Notes

- the `pending-ots` scenario now reuses the shared real pending PMA corpus item
- the main Path A fixture list now includes `real-confirmed-pma` as a real helper-verified confirmed walkthrough
- demo and script surfaces now label real-backed versus placeholder-backed Path A scenarios explicitly
