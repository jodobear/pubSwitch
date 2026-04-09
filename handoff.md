---
title: Handoff
doc_type: state
status: active
owner: tack
phase: p7-follow-on-options
canonical: true
---

# Handoff

Current execution state for `tack`.

## Read First

- `AGENTS.md`
- `.private-docs/README.md`
- `.private-docs/plans/build-plan.md`
- `.private-docs/plans/follow-on-options-packet.md`
- `.private-docs/research/proposal-and-research-review.md`

## Current Reality

- the authoritative implementation surface is the CLI-first v3 lane
- the public workflow commands are:
  - `prepared-migration`
  - `social-transition`
  - `operate-transition`
- Path A and Path C stay independent in protocol code and only meet in combined operator reporting
- the browser app is quarantined in `apps/legacy-demo-client`; it is not the implementation target

## Stable Operator Contract

- all three public workflow commands support `--json`
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

## Current Capabilities

- `prepared-migration`
  - starts a fresh Path A workflow
  - resumes from `--bundle` or `--bundle-dir`
  - accepts imported proof events or proof summaries
  - can publish and watch with strict relayability enforcement
- `social-transition`
  - creates claims when `--stance` is absent
  - creates attestations when `--stance` is present
  - works from prepared bundles or explicit `(old,new)` pubkeys
  - reuses saved social bundles and relay hints
- `operate-transition`
  - is the only saved-bundle inspect/publish/watch route
  - combines prepared and social bundle inputs
  - reports one combined operator view

## Validation Status

- hardening is complete for the current PoC scope
- the CLI now rejects:
  - unknown flags
  - repeated singular flags
  - empty CSV inputs
  - malformed hex secrets and pubkeys
  - malformed prepared/social bundle sources
- relay-backed flows now distinguish:
  - partial publish with warnings
  - total publish failure
  - watch timeout
- current verification gate:
  - `bun run cli --help`
  - `bun run check:active`
  - optional: `bun test apps/legacy-demo-client`
  - optional: `bun run --cwd apps/legacy-demo-client build`

## Audit Status

- a fresh cross-lane audit was completed after hardening
- main findings:
  - control docs had accumulated stale command history
  - README mixed current operator guidance with repo archaeology
  - root-level legacy browser scripts kept the quarantined lane more visible than needed
  - removed-command guidance and test seams were still sitting in the live CLI implementation
- remediation completed so far:
  - control-doc and README cleanup
  - removal of root-level legacy browser scripts from the main repo surface
  - removal of removed-command scaffolding from the public CLI parser
- next audit follow-up is the relay test seam inside `scripts/protocol-cli.ts`

## Legacy Note

- older implementation history remains in git
- older browser/demo lanes are preserved only as quarantined legacy context
- do not re-open browser-first or demo-first design without an explicit new slice

## Public Docs

- [README.md](/workspace/projects/pubSwitch/README.md) is now the lean repo entrypoint
- [docs/INDEX.md](/workspace/projects/pubSwitch/docs/INDEX.md) is the public docs router
- [docs/operator-runbook.md](/workspace/projects/pubSwitch/docs/operator-runbook.md) is the operator guidance page
- [docs/demo-script.md](/workspace/projects/pubSwitch/docs/demo-script.md) is the canonical CLI walkthrough
- [testing/README.md](/workspace/projects/pubSwitch/testing/README.md) is the testing surface entrypoint
- the walkthrough is aligned to the end-to-end workflow smoke in [scripts/protocol-cli-command.test.ts](/workspace/projects/pubSwitch/scripts/protocol-cli-command.test.ts)
