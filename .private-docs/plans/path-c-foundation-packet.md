---
title: Path C Foundation Packet
doc_type: packet
status: completed
owner: tack
phase: p3-path-c-foundation
canonical: false
---

# Path C Foundation Packet

Completed STC and STA foundation packet after Path A fixture/demo closeout.

## Purpose

- implement the first pure Path C builder/validator/resolver slice
- keep Path C fully independent from Path A protocol logic
- freeze the PoC social-state model before wiring Path C into demo presentation

## Scope Delta

In scope:

- STC builder and validator support
- STA builder and validator support
- Path C resolution for `none`, `claimed`, `socially_supported`, `socially_opposed`, and
  `socially_split`
- followed-attestor counting with explicit exclusion of old/new-key attestations from third-party
  support
- deterministic test coverage for happy and split-state paths

Out of scope:

- Path C demo-client wiring
- Path C deterministic fixture package scenarios
- Path A and Path C merged presentation
- real Schnorr verification

## Frozen Assumptions

- Path C remains advisory and independent from Path A cryptographic validity
- STAs by the old key or new key are valid events but do not count as independent third-party
  support
- Path C resolution is scoped to an explicit old/new transition pair and a local viewer follow set
- valid `uncertain` STAs remain valid evidence but do not currently change the coarse PoC state
- event signatures remain shape-only in the PoC; real Schnorr verification is deferred

## Closeout Conditions

- STC and STA builders exist in `packages/protocol-c`
- STC and STA validators exist in `packages/protocol-c`
- the Path C resolver returns the agreed PoC state model from claims, attestations, and local
  follows
- at least one deterministic test covers build/validate flow and one covers live-attestation
  resolution
- any unresolved Path C policy ambiguity is recorded explicitly instead of buried in the code

## Closeout Result

- `packages/protocol-c` now has:
  - STC builder support
  - STA builder support
  - STC and STA validation against transition-id, tag, and event-envelope shape rules
  - Path C resolution over valid claims plus live followed-attestor stances
- the resolver keeps only the latest valid attestation per attestor and transition, using higher
  `created_at` first and lexicographically higher event id as the deterministic tie-break
- self-authored support and opposition by the old or new key are surfaced separately instead of
  being mixed into third-party support counts
- STA `e` references are currently validated for event-id shape only; the PoC does not yet require
  dereferencing those claim ids during validation
- the next active packet is `path-c-fixtures-demo-packet.md`
