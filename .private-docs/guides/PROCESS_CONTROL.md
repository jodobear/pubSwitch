---
title: Process Control
doc_type: policy
status: active
owner: tack
canonical: true
---

# Process Control

`tack` uses a small control surface adapted from `noztr`.

The point is not to import every gate. The point is to keep:

- clear routing
- explicit current state
- bounded slices
- truthful closeout

## Core Rule

Do not let this PoC accumulate one giant planning document.

Instead:

- keep one current build plan
- keep one active packet
- keep handoff state-only
- keep research synthesis separate from execution docs

## Doc Roles

- `index`
  - routes readers to the right current docs
- `policy`
  - repo rules and gates
- `state`
  - current status and next work
- `plan`
  - active baseline and sequencing
- `packet`
  - current slice delta
- `research`
  - critique and external findings

## Canonical Owners

- `AGENTS.md`
  - operating rules
- `handoff.md`
  - current state
- `build-plan.md`
  - active baseline
- the active packet under `.private-docs/plans/`
  - current slice
- `FAST_POC_GATE.md`
  - staged execution mechanics
- `proposal-and-research-review.md`
  - current critique and external evidence

## Process-Change Rule

If the process changes materially:

1. update the canonical doc that owns the rule
2. remove superseded wording
3. keep the startup path small
4. update handoff/build-plan/packet state so they agree

## Closeout Rule

A slice is not done until:

- the current packet reflects the accepted result
- `handoff.md` reflects the new next step
- any meaningful protocol change is recorded in the research or plan surface
