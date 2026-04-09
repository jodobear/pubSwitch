---
title: Follow-on Options Packet
doc_type: packet
status: active
owner: tack
phase: p7-follow-on-options
canonical: true
---

# Follow-on Options Packet

Current active packet after demo-readiness closeout.

## Purpose

- keep the repo in an honest post-demo-ready state
- record the highest-value optional follow-on work without pretending it is still blocking the PoC walkthrough
- give the next session a clean place to choose whether to stop, polish, or deepen proof realism
- the repo has since entered a CLI-first v3 rebuild lane; treat the older demo-ready framing here as
  legacy context rather than the current implementation target

## Scope Delta

In scope:

- optional follow-on slices chosen explicitly from the remaining list
- narrow demo polish if it materially improves the walkthrough
- deeper real-proof work only if the operator decides it is worth the added complexity

Out of scope by default:

- reopening protocol direction without revisiting the research synthesis
- production hardening
- broad app redesign

## Current Optional Paths

- completed:
  - the CLI-first prepared-bundle lane now accepts imported proof artifacts and helper-derived proof
    summaries instead of requiring placeholder proof creation
  - the protocol CLI now has a first direct live relay publish/watch lane for prepared and social
    bundles, so the legacy demo scenario wrapper is no longer the only non-browser relay path
  - a second real confirmed PMA root now exists for the root-conflict demo
  - real PMU `.ots` proofs now exist for the main authority-chain scenarios
  - the demo client now has a presentation-first live stage with stepwise publish controls, paced
    autoplay, explicit Path A key-state cards, and a collapsed-by-default wire inspector
  - the demo client now has a real public-relay operator/observer mode for live publish and observe
- remaining optional path:
  - add independent Bitcoin block-header verification if the helper trust model needs to be stronger than attestation presence or height
  - keep minting fresh prepared public-relay demo sets if repeated live demos begin hitting duplicate-event friction on the chosen relays

## Current Demo Reality

- all seven main Path A walkthrough scenarios now carry real helper-verifiable `.ots` proof content
- Path A fixture resolution still bridges confirmation through local `x-verified-anchor-height` tags
  because raw `.ots` parsing still lives in `apps/ots-helper`, not in the pure browser-safe resolver path
- the default demo surface is now presentation-first and action-driven; wire-level detail still exists
  behind the inspector and the helper/script surfaces
- the browser can now connect directly to public relays and round-trip live events there
- the CLI now has a one-command stage wrapper for share -> optional note -> prepared event publish -> watch, with a dry-run rehearsal mode
- the browser operator console now shares a thinner app-layer core, so future UI passes can iterate on `App.tsx` without re-entangling relay/session logic
- fixed prepared protocol-event ids still mean repeated live demos benefit from fresh pre-minted sets
- the repo remains demo-ready; remaining follow-on work is about stronger verification posture, not missing
  demo coverage

## Immediate Rule

- treat the repo as being in an active CLI-first v3 rebuild; do not treat the browser demo as the
  authoritative implementation target unless a slice explicitly says so
