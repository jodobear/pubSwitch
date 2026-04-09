# AGENTS.md — tack

Fast PoC workspace for a proposed Nostr key-rotation protocol.

This repo uses a lighter adapted process than `noztr`: keep routing, bounded slices, and explicit
state, but use looser gates so we can reach a demo quickly.

## Session Startup

- Run `./agent-brief` first.
- Read `AGENTS.md` and `handoff.md`.
- Read `.private-docs/README.md`.
- Read `.private-docs/plans/build-plan.md`.
- Read `.private-docs/plans/follow-on-options-packet.md`.
- Read `.private-docs/research/proposal-and-research-review.md` when changing protocol direction,
  implementation shape, or demo scope.

## Repo Posture

- this is a PoC repo, not a production-hardening repo
- optimize for a clear demo and fast iteration
- keep protocol logic pure and testable outside the UI
- keep applesauce at the app layer, not in the protocol packages
- keep Path A and Path C independent; merge only in presentation
- record protocol ambiguity explicitly instead of silently improvising wire behavior

## Artifact Authority

- `docs/references/` are draft inputs and implementation references
- `.private-docs/plans/build-plan.md` is the active execution baseline
- `.private-docs/plans/follow-on-options-packet.md` is the active packet
- `.private-docs/research/proposal-and-research-review.md` is the current protocol/research
  synthesis

## Fast PoC Gate

For any code-bearing slice:

1. freeze the exact demo-facing slice and non-goals
2. implement the narrowest useful path
3. add at least one test or one deterministic fixture
4. do one correctness review and one demoability review
5. run:
   - `bun run typecheck`
   - touched tests or `bun test`
   - manual smoke for UI changes
6. update `handoff.md` and any packet/build-plan state that changed

This repo does not require exhaustive audits before every slice closes.

## Build & Test

```bash
bun run cli --help
bun run check:active
bun test apps/legacy-demo-client && bun run --cwd apps/legacy-demo-client build   # optional quarantined browser smoke
```

## What Not To Do

- do not widen this into a general social client
- do not let Path C socially override Path A cryptographic validity
- do not bury protocol logic in React components
- do not treat drafts as final standards when the repo still needs PoC feedback
- do not add process weight unless it clearly improves demo speed or correctness
