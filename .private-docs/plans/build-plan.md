---
title: Build Plan
doc_type: plan
status: active
owner: tack
phase: p7-follow-on-options
canonical: true
---

# tack Build Plan

Date: 2026-04-09

## Strategic Posture

- `tack` remains a fast PoC repo for validating a Nostr key-rotation design
- the current product surface is CLI-first, not browser-first
- Path A and Path C stay separate in code, validation, and resolution
- protocol logic stays in pure packages; app and relay concerns stay outside protocol packages
- current work should optimize for operator correctness and clear repo boundaries, not UI expansion

## Current Baseline

- the public operator surface is:
  - `prepared-migration`
  - `social-transition`
  - `operate-transition`
- `packages/protocol-a` exposes the active v3 Path A wire shape and resolver states
- `packages/protocol-c` exposes the active v3 Path C claim/attestation shape
- `packages/evidence-bundles` is the shared prepared/social import-export layer
- `apps/ots-helper` is the local proof-inspection and real-OTS helper surface
- `scripts/verify-scenario.ts` and `scripts/publish-scenario.ts` are fixture and verification tooling, not the main operator lane

## Hardened CLI Contract

- all public workflow commands support `--json`
- success JSON includes:
  - `ok: true`
  - `command`
  - `mode` where applicable
  - `warning` as an array
  - command-specific `input`
  - command-specific `output` / `outputs` / `inspection` / `operatorReport`
- failure JSON includes:
  - `ok: false`
  - `command`
  - `error.code`
  - `error.message`
  - `error.details`
- exit codes are stable:
  - `1` input, bundle, or protocol-state failure
  - `2` relay publish or watch failure
  - `3` unexpected internal failure

## Current Validation

- `bun run check:active` is the authoritative active verification lane
- current command coverage includes:
  - fresh and resumed Prepared Migration flows
  - Social Transition claim and attestation flows
  - combined Path A + Path C operator flows
  - structured failure paths
  - strict input and bundle validation
  - relay partial publish, total publish failure, and watch timeout behavior

## Current Repo Shape

- public docs route through `README.md`, `docs/INDEX.md`, `docs/operator-runbook.md`, and `docs/demo-script.md`
- the repo also has a small public `testing/` lane for setup, local smoke, and relay-oriented operation helpers
- older public draft sets and implementation-note material are archived under `.private-docs/archive/`
- older browser/demo work remains quarantined and is not part of the active implementation contract

## Near-Term Non-Goals

- browser redesign or browser re-entry
- production packaging and release engineering
- protocol redesign
- broad expansion into a general social client
