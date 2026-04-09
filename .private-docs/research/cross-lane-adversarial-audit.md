---
title: Cross-Lane Adversarial Audit
doc_type: audit
status: active
owner: tack
phase: p9-cross-lane-audit
canonical: true
---

# Cross-Lane Adversarial Audit

Date: 2026-04-09

Balanced hybrid audit of the live `pubSwitch` CLI/helper lane after the CLI-first cleanup and hardening pass.

## Scope

In scope:

- public workflow commands:
  - `prepared-migration`
  - `social-transition`
  - `operate-transition`
- shared bundle parsing and serialization
- helper-derived Path A proof inspection
- relay publish/watch runtime
- current docs and testing lane

Out of scope:

- archived browser/demo history
- packaging and release work
- browser re-entry

## System Model

Runtime components:

- `scripts/protocol-cli.ts`
  - public operator entrypoint, input parsing, JSON/text output, error mapping
- `scripts/protocol-cli-lib.ts`
  - prepared/social workflow composition, bundle inspection, publish/watch behavior
- `packages/evidence-bundles`
  - prepared/social bundle parsing and serialization boundary
- `apps/ots-helper`
  - raw OTS inspection and helper-derived proof summaries
- `scripts/relay-runtime.ts`
  - websocket relay session, publish, and observation

Primary trust boundaries:

1. operator input -> CLI flags and bundle files
2. bundle JSON -> parsed prepared/social bundle objects
3. raw proof event bytes -> helper-derived `OtsProofSummary`
4. local saved bundle truth -> relay-observed event set
5. followed/trusted social context -> Path C visible support/opposition state

## Current Strengths

- Path A conflict states and Path C split states are already covered in deterministic fixtures.
- public commands have structured JSON errors and stable exit codes.
- malformed JSON, wrong bundle type/version, wrong secrets, pending proofs, relay partial publish, relay total failure, and watch timeout are already exercised in tests.
- Path C correctly filters claims and attestations to the requested transition id, so unrelated social events are not currently treated as valid evidence.

## Findings By Lane

### Bundle and Proof Boundary

1. `PreparedBundleProof.summary` is trusted ahead of `otsEvent` when both are present.
   - Evidence: `summarizePreparedBundleProofs()` and `describePreparedProofStatus()` in `scripts/protocol-cli-lib.ts`
   - Impact: a bundle can carry a stronger helper summary than the attached raw proof event actually justifies.
   - Coverage: uncovered

2. prepared/social bundle parsing is shape-validating, not coherence-validating.
   - Evidence: `parsePreparedBundle()` / `parseSocialBundle()` in `packages/evidence-bundles/src/index.ts`
   - Impact: parsed bundles can carry stale derived metadata, proofs targeting absent events, or event arrays that only fail later and less explicitly.
   - Coverage: partial

3. proof provenance is only implicit.
   - Evidence: `PreparedBundleProof` stores `otsEvent`, `otsBytesBase64`, and `summary`, but not an explicit provenance/status model.
   - Impact: operators can tell that a proof is local-only from relay reporting, but not whether the trust basis is raw proof bytes, helper summary only, or both.
   - Coverage: partial

### CLI and Operator Boundary

4. secrets are accepted directly on the command line.
   - Evidence: `--old-secret`, `--migration-secret`, `--current-migration-secret`, `--next-migration-secret`, `--new-secret`, `--signer-secret` in `scripts/protocol-cli.ts`
   - Impact: secrets are exposed to shell history and process-list tooling.
   - Coverage: uncovered

5. network actions still fall back to public relay defaults when no explicit relay source exists.
   - Evidence: `resolveRelayList()` in `scripts/protocol-cli-lib.ts` and `DEFAULT_RELAYS` in `scripts/relay-runtime.ts`
   - Impact: publish/watch can target public relays without an explicit operator decision.
   - Coverage: behavior covered, risk unmitigated

### Relay and Observation Boundary

6. watch results distinguish missing ids but do not explicitly describe local-versus-observed divergence as an operator concept.
   - Evidence: `cliWatchBundle()` and `formatOperateTransitionResult()` in `scripts/protocol-cli-lib.ts`
   - Impact: JSON has `missingEventIds`, but the user-facing report still centers on final inspection instead of clearly calling out divergence posture.
   - Coverage: partial

### Foundations and Testability

7. test relay injection still lives inside the public CLI entrypoint.
   - Evidence: `resolveRelayRuntimeForTests()` in `scripts/protocol-cli.ts`
   - Impact: low direct risk, but it keeps test-only behavior coupled to production command parsing.
   - Coverage: covered and intentional for now

## Prioritized Findings

### S1

1. proof summary / raw proof mismatch is not rejected
   - category: `correctness`, `security`
   - affected lane: `bundles`, `helper`, `prepared-migration`, `operate-transition`

2. bundle semantic validation is too weak at the read boundary
   - category: `correctness`, `security`
   - affected lane: `bundles`, `prepared-migration`, `social-transition`, `operate-transition`

### S2

3. public relay fallback is implicit for network actions
   - category: `operator-ux`, `security`, `relay`
   - affected lane: `prepared-migration`, `operate-transition`, `relay-runtime`

4. secrets are exposed through CLI flags
   - category: `security`, `operator-ux`
   - affected lane: `prepared-migration`, `social-transition`

5. proof provenance is not explicit enough in saved bundle artifacts
   - category: `security`, `operator-ux`
   - affected lane: `bundles`, `helper`

### S3

6. local-vs-relay divergence reporting is still thinner than it should be
   - category: `operator-ux`, `relay`

7. test relay injection remains in the public CLI entrypoint
   - category: `foundations`

## Remediation Order

1. strict prepared/social bundle validation at the read boundary
2. proof artifact consistency and provenance hardening
3. explicit relay-source requirement for publish/watch
4. safer secret ingestion path
5. clearer relay divergence reporting
6. isolate test relay seams from the public CLI entrypoint

## Recommended Next Slice

Implement the first remediation wave in:

- `.private-docs/plans/cross-lane-remediation-wave-1.md`

Wave 1 should close every S1 finding plus the two operator-facing S2 findings that can cause unsafe network or secret-handling defaults.
