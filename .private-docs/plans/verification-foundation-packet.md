---
title: Verification Foundation Packet
doc_type: packet
status: completed
owner: tack
phase: p4-verification-foundation
canonical: false
---

# Verification Foundation Packet

Current active packet after the Path A conflict-state loop closeout.

## Purpose

- make the PoC verification trust model explicit in the control surface
- freeze the next high-confidence implementation lane around real Schnorr verification
- defer lower-confidence real OTS parsing work until the trust model and bounded loop are clear

## Scope Delta

In scope:

- reflect the verification trust model in research and execution docs
- switch startup and control surfaces to a verification-focused packet
- queue the next coherent implementation loop for shared, Path A, and Path C Schnorr verification

Out of scope:

- real `.ots` byte parsing
- remote calendar orchestration
- Path A conflict-fixture breadth work
- protocol wire changes

## Frozen Assumptions

- remote OTS services may help produce or upgrade proofs, but local verification should determine
  demo truth
- Applesauce stays at the app layer and must not be treated as an assumed OTS verifier
- the next uninterrupted implementation loop should stay in the high-confidence Schnorr lane rather
  than mixing in lower-confidence OTS parsing work

## Closeout Conditions

- the verification trust model is explicit in the research and control docs
- `verification-credibility-loop.md` exists and is the active implementation loop reference
- startup surfaces point to this packet as the current bounded slice

## Closeout Result

- the verification trust model is now explicit in the research synthesis and control docs
- the verification-credibility loop is queued as the active implementation loop
- the repo now hands off to `shared-schnorr-foundation-packet.md` as the next bounded slice
