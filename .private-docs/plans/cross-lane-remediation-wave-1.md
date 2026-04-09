---
title: Cross-Lane Remediation Wave 1
doc_type: plan
status: active
owner: tack
phase: p9-cross-lane-audit
canonical: true
---

# Cross-Lane Remediation Wave 1

First implementation wave from the cross-lane adversarial audit.

## Summary

Wave 1 hardens the live CLI/helper lane at its highest-risk trust boundaries:

- strict bundle semantic validation
- strict proof summary/raw proof consistency
- explicit relay-source requirement for network actions
- safer secret ingestion without breaking the current PoC surface

This wave does not change protocol wire semantics. It changes bundle validation, CLI defaults, and operator safety.

## Implementation Changes

### 1. Strict Bundle Validation

- add explicit semantic validators inside `packages/evidence-bundles`
  - `validatePreparedBundle(...)`
  - `validateSocialBundle(...)`
- `readPreparedBundle()` and `readSocialBundle()` must reject, not defer, these cases:
  - proof target id absent from prepared bundle events
  - non-protocol event kinds in the wrong bundle type
  - duplicate event ids across bundle event arrays
  - prepared bundle `oldPubkey`, `migrationPubkeys`, or `successorPubkeys` not matching the event set
  - social bundle `oldPubkey` / `newPubkey` not matching the valid claim/attestation transition pair
- `parsePreparedBundle()` and `parseSocialBundle()` should return canonical rebuilt bundles from validated events rather than trusting serialized derived metadata verbatim.

### 2. Proof Artifact Consistency and Provenance

- extend `PreparedBundleProof` with:
  - `provenance: "summary_only" | "raw_event_only" | "raw_event_and_summary"`
- when both `summary` and `otsEvent` are present:
  - recompute the summary from `otsEvent`
  - require exact agreement on:
    - `targetEventId`
    - `targetKind`
    - `status`
    - `anchorHeight` when confirmed
    - `proofEventId` when present
  - reject the bundle with `ERR_INVALID_BUNDLE` if they differ
- when only `otsEvent` is present:
  - derive the effective summary from the raw event at read time
- when only `summary` is present:
  - allow it, but preserve `provenance: "summary_only"` and surface that fact in operator reporting
- keep multiple proofs for the same target allowed, but only if each individual proof artifact is internally valid

### 3. Explicit Relay Source Requirement

- add `ERR_NO_RELAYS`
- for `prepared-migration --publish/--watch-seconds` and `operate-transition --publish/--watch-seconds`:
  - require relays to come from either:
    - explicit `--relays`
    - non-empty bundle relay hints
  - if neither exists, fail before any network action with `ERR_NO_RELAYS`
- keep `DEFAULT_RELAYS` in `relay-runtime.ts` for low-level/internal use only
- public workflow commands must no longer silently fall back to public relays

### 4. Safer Secret Ingestion

- add file-based secret flags:
  - `--old-secret-file`
  - `--migration-secret-file`
  - `--current-migration-secret-file`
  - `--next-migration-secret-file`
  - `--new-secret-file`
  - `--signer-secret-file`
- each raw/file pair is mutually exclusive
- file semantics:
  - read UTF-8
  - trim surrounding whitespace
  - require one lowercase hex32 value after trimming
- keep raw `--*-secret` flags for PoC compatibility, but:
  - add a warning entry in JSON/text output when raw flags are used
  - report secret source in JSON as `flag` or `file`

## Test Plan

### Bundle and Proof Validation

- prepared bundle rejects proof target ids absent from the event set
- prepared bundle rejects mismatched serialized `oldPubkey`
- prepared bundle rejects mismatched serialized `migrationPubkeys`
- social bundle rejects events whose valid transition pair differs from top-level `oldPubkey` / `newPubkey`
- prepared proof rejects mismatched `summary` vs `otsEvent`
- prepared proof accepts `summary_only`, `raw_event_only`, and matching `raw_event_and_summary`

### Relay Source Hardening

- `prepared-migration --publish` fails with `ERR_NO_RELAYS` when no explicit or bundled relays exist
- `operate-transition --publish` fails with `ERR_NO_RELAYS` when no explicit or bundled relays exist
- explicit `--relays` still overrides bundle relay hints
- bundle relay hints still work when present and non-empty

### Secret Ingestion

- file-based secret flags succeed for all public workflow commands
- raw/file flag conflicts fail with `ERR_FLAG_CONFLICT`
- malformed secret files fail with `ERR_INVALID_FLAG_VALUE`
- JSON output reports secret source correctly
- raw secret flags emit warnings but still work

### Regression Gate

- keep `bun run check:active` green
- add focused tests for the new bundle/proof validation paths and relay-source errors

## Assumptions and Defaults

- this is still a PoC CLI, so raw secret flags remain temporarily instead of being removed outright
- summary-only proofs remain valid operator input, but they must be clearly marked and must not silently outrank contradictory raw proof events
- public workflow commands should never publish or watch against public relay defaults without an explicit operator or bundle-provided relay source
