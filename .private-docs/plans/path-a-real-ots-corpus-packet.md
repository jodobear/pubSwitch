---
title: Path A Real OTS Corpus Packet
doc_type: packet
status: completed
owner: tack
phase: p5-path-a-real-ots-corpus
canonical: true
---

# Path A Real OTS Corpus Packet

Completed slice for deterministic real Path A PMA corpus items and helper-side proof verification.

## Purpose

- prepare at least one actual Path A event/proof pair that the helper can verify from real `.ots` bytes
- move from standalone OTS demo vectors toward a real Path A proof corpus
- preserve the browser/demo boundary by keeping the heavy verifier in helper-side code

## Scope Delta

In scope:

- add one prepared real Path A proof corpus slice outside the pure protocol packages
- keep the corpus deterministic and test-backed
- prefer helper/script consumption over direct browser bundling of the OTS verifier

Out of scope:

- protocol resolver redesign
- Path C changes
- bundling `opentimestamps` into the browser demo
- remote calendar orchestration inside the app

## Frozen Assumptions

- real `.ots` verification now exists in helper-side code, but the browser demo still uses the lightweight fixture path
- any direct browser integration must avoid importing the Node-oriented OpenTimestamps dependency graph
- the next credibility step is prepared real Path A proof material, not another protocol change

## Closeout Conditions

- at least one real Path A event/proof pair is available as deterministic helper-consumable corpus
- helper or script surfaces can verify that corpus without relying on `x-verified-anchor-height`
- any remaining corpus-preparation or browser-boundary ambiguity is recorded explicitly

## Closeout Notes

- `apps/ots-helper` now includes deterministic real PMA corpus items for pending and Bitcoin-attested proofs
- each corpus item stores the signed PMA event, its canonical preimage, and real serialized `.ots` bytes
- helper-side inspection and a dedicated verification script can now validate the corpus without `x-verified-anchor-height`
- the corpus still uses locally prepared attestations and does not yet perform independent block-header verification
