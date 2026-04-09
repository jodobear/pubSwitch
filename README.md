# pubSwitch

PoC workspace for a proposed Nostr key-rotation protocol suite.

Two independent protocol paths:

- **Path A — Prepared Migration**: `kind:1776`, `1779`, `1777` plus NIP-03 `kind:1040`
- **Path C — Social Transition**: `kind:1778`, `31778`

## Current Shape

- the authoritative implementation surface is CLI-first
- the public operator commands are:
  - `prepared-migration`
  - `social-transition`
  - `operate-transition`
- public docs start at [docs/INDEX.md](docs/INDEX.md)

## Quick Start

```bash
bun install
bun run cli --help
bun run testing:setup
bun run testing:smoke
bun run check:active
```

## Operator Workflow

For operator guidance, use:

- [docs/operator-runbook.md](docs/operator-runbook.md)
- [docs/demo-script.md](docs/demo-script.md)
- [testing/README.md](testing/README.md)

Route by job:

- start or resume Path A:
  `prepared-migration`
- append social evidence:
  `social-transition`
- inspect, publish, or watch saved prepared/social bundles:
  `operate-transition`

`operate-transition` is the only saved-bundle inspect/publish/watch route.

## CLI Contract

All three public commands support `--json`.

Success JSON includes:

- `ok: true`
- `command`
- `mode` where applicable
- `warning` as an array
- command-specific `input`
- command-specific `output` / `outputs` / `inspection` / `operatorReport`

Failure JSON includes:

- `ok: false`
- `command`
- `error.code`
- `error.message`
- `error.details`

Exit codes are stable:

- `1` input, flag, bundle, or protocol-state failure
- `2` relay publish or watch failure
- `3` unexpected internal failure

The workflow commands reject:

- unknown flags
- repeated singular flags
- empty CSV list flags
- malformed hex pubkeys and secrets
- malformed prepared/social bundle sources

## Verification

```bash
bun run check:active
bun scripts/verify-scenario.ts
bun scripts/publish-scenario.ts <id>
bun run verify:real-ots-corpus
```

## Repo Structure

```text
apps/
  ots-helper           local proof inspection and real-OTS helper
packages/
  evidence-bundles     shared prepared/social bundle import-export
  fixtures             deterministic scenarios
  protocol-a           Path A codecs, validators, resolver
  protocol-c           Path C codecs, validators, resolver
  protocol-shared      shared Nostr, crypto, transition helpers
scripts/
  protocol-cli.ts      public operator CLI
  verify-scenario.ts   fixture verification tooling
  publish-scenario.ts  fixture publish-plan tooling
docs/
  INDEX.md              public docs router
  operator-runbook.md   operator guidance for local and relay-backed flows
  demo-script.md        canonical local CLI walkthrough
  v3/                  active protocol drafts
testing/
  README.md             testing entrypoint
  scripts/              bootstrap, smoke, and relay helper scripts
```

## Non-Goals

- browser-first implementation
- general social client behavior
- Path C overriding Path A cryptographic validity
- production release packaging in this PoC repo
