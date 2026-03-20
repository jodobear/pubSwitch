---
title: Path A Real OTS Bridge Packet
doc_type: packet
status: completed
owner: tack
phase: p5-path-a-real-ots-bridge
canonical: true
---

# Path A Real OTS Bridge Packet

Completed slice for the browser-safe real OTS bridge into wider Path A surfaces.

## Purpose

- bridge one real Path A helper-verified corpus item into a wider Path A surface
- keep the browser/helper boundary intact while reducing reliance on placeholder proof paths
- make one real OTS-backed Path A flow more visible in the PoC

## Scope Delta

In scope:

- one narrow bridge from the helper-side real corpus into an existing non-browser or browser-safe Path A surface
- deterministic verification around that bridge
- explicit copy or provenance notes if the bridge surface is user-visible

Out of scope:

- bundling `opentimestamps` into the browser demo
- remote calendar orchestration
- protocol resolver redesign
- Path C changes

## Frozen Assumptions

- the helper-side real OTS path verifies local proof parsing, digest binding, and Bitcoin-attestation presence or height
- independent Bitcoin block-header verification is still deferred
- browser surfaces must not import the Node-oriented OpenTimestamps dependency tree directly

## Closeout Conditions

- one existing Path A surface consumes a real helper-verified corpus item without `x-verified-anchor-height`
- the bridge keeps helper-derived proof truth separate from pure protocol truth
- any remaining browser-boundary or trust-model limits are recorded explicitly

## Closeout Notes

- the deterministic real corpus now lives in a pure browser-safe fixture module
- helper inspection and script verification both consume that shared corpus source
- the Path A demo now shows a separate real-corpus snapshot panel with explicit helper and app provenance
- browser code still does not parse `.ots` bytes directly and still does not perform independent Bitcoin header verification
