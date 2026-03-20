# tack

PoC workspace for a proposed Nostr key-rotation protocol.

Current focus:

- Prepared Migration (`1776`, `1777`, `1779`, with NIP-03 `1040`)
- Social Transition Claims / Attestations (`1778`, `31778`)
- dedicated demo client built for fast protocol validation and demoability

## Goals

- validate the protocol shape quickly
- expose raw evidence and resolver outputs clearly
- keep Path A and Path C separate in code and UI
- reach a credible demo without importing `noztr`'s full audit burden

## Non-goals

- production hardening
- full client fork
- automatic social-graph migration
- final NIP submission polish before the PoC is proven

## Quick start

```bash
bun install
bun run dev:demo
bun run typecheck
bun test
```

## Read first

- `AGENTS.md`
- `handoff.md`
- `.private-docs/README.md`
- `.private-docs/plans/build-plan.md`
- `.private-docs/plans/path-a-conflict-fixtures-packet.md`
