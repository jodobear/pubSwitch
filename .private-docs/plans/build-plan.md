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
- `apps/legacy-demo-client` is quarantined legacy browser context

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

## Fresh Cross-Lane Audit

Completed on 2026-04-09.

Findings:

- the public CLI surface is now coherent
- the main remaining repo-shape problem is context contamination, not command design
- stale control docs and README narration were carrying removed-lane history inline
- root-level legacy browser scripts were still keeping the quarantined browser lane too visible
- removed-command guidance and test-only seams still exist in the live CLI implementation

## Active Remediation Order

1. rewrite control docs around current CLI-first truth
2. compress README around the live operator surface and stable CLI contract
3. remove root-level legacy browser scripts from the main repo surface
4. trim removed-command scaffolding from `scripts/protocol-cli.ts`
5. re-audit whether CLI test harness seams should move out of production command code

Status:

- steps 1-4 are complete
- step 5 is the next likely cleanup slice if we keep pushing the cross-lane audit
- public docs now route through `README.md`, `docs/INDEX.md`, `docs/operator-runbook.md`, and `docs/demo-script.md`
- the repo now also has a small public `testing/` lane for setup, local smoke, and relay-oriented operation helpers

## Near-Term Non-Goals

- browser redesign or browser re-entry
- production packaging and release engineering
- protocol redesign
- broad expansion into a general social client
