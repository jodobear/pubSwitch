---
title: Path C Fixtures Demo Packet
doc_type: packet
status: completed
owner: tack
phase: p4-path-c-fixtures-demo
canonical: false
---

# Path C Fixtures Demo Packet

Current active packet after Path C foundation closeout.

## Purpose

- package deterministic Path C scenarios for demo playback
- add a clearly separate Path C evidence and resolution view in the demo client
- keep social evidence visibly advisory beside, not inside, Path A authority logic

## Scope Delta

In scope:

- deterministic Path C fixture scenarios for:
  - claim-only
  - socially supported
  - socially opposed or split
  - self-asserted-only noise that does not count as third-party support
- fixture verification or publication support for those scenarios if needed
- demo-client wiring that renders Path C state, live attestor sets, and raw STC/STA evidence

Out of scope:

- merging Path A and Path C protocol logic
- production social-graph trust policy
- relay-backed live fetch beyond deterministic demo playback
- recovery-bundle hardening

## Frozen Assumptions

- Path C presentation must remain clearly separate from Path A presentation
- followed-attestor support is local policy input, not protocol truth
- self-authored STAs remain visible evidence but do not count as independent third-party support
- `uncertain` STAs remain valid evidence even if the coarse PoC state model does not yet elevate
  them to a separate visible resolver state

## Closeout Conditions

- deterministic Path C fixtures exist for happy and adversarial social cases
- the demo client renders real Path C resolver state from fixture-backed evidence
- Path A and Path C stay clearly separate in the demo presentation
- any remaining Path C display-policy shortcuts are recorded explicitly instead of implied

## Closeout Result

- `packages/fixtures` now ships deterministic Path C scenarios for claim-only, socially supported,
  socially split, and self-asserted-only noise cases
- `scripts/verify-scenario.ts`, `scripts/generate-fixtures.ts`, and `scripts/publish-scenario.ts`
  now work across both Path A and Path C fixture sets
- `apps/demo-client` now renders separate Path A and Path C playback workspaces so social evidence
  remains visibly advisory instead of being merged into Path A authority state
- `bun run build:demo` is green after the UI split
- a Playwright-backed browser smoke was attempted, but the CLI wrapper could not complete package
  resolution in the restricted environment, so only build-level UI verification landed in this slice
- the next active packet is `recovery-bundle-foundation-packet.md`
