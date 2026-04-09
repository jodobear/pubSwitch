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
- the browser app in `apps/legacy-demo-client` is quarantined legacy context

## Quick Start

```bash
bun install
bun run cli --help
bun run check:active
```

Optional legacy browser smoke:

```bash
bun test apps/legacy-demo-client
bun run --cwd apps/legacy-demo-client build
```

## Operator Workflows

### Prepared Migration

Start a fresh Path A workflow:

```bash
bun run cli prepared-migration \
  --old-secret <hex> \
  --migration-secret <hex> \
  --next-migration-secret <hex> \
  --new-secret <hex> \
  --out-dir output/prepared \
  --root-proof bitcoin_confirmed --root-anchor-height 840100 \
  --update-proof bitcoin_confirmed --update-anchor-height 840101
```

Resume from a saved bundle or bundle directory:

```bash
bun run cli prepared-migration \
  --bundle-dir output/prepared \
  --out-dir output/prepared \
  --old-secret <hex> \
  --current-migration-secret <hex> \
  --next-migration-secret <hex> \
  --new-secret <hex> \
  --root-proof-event root-proof.json \
  --update-proof-summary update-proof-summary.json
```

### Social Transition

Append a claim when `--stance` is omitted, or an attestation when `--stance` is supplied:

```bash
bun run cli social-transition \
  --prepared-bundle-dir output/prepared \
  --social-bundle-dir output/social \
  --signer-secret <hex> \
  --stance support \
  --out-dir output/social \
  --json
```

`social-transition` can also work from explicit `--old-pubkey` and `--new-pubkey` when you are not
deriving the pair from a prepared bundle.

### Combined Operator Flow

Use `operate-transition` as the only saved-bundle inspect/publish/watch route:

```bash
bun run cli operate-transition \
  --prepared-bundle-dir output/prepared \
  --social-bundle-dir output/social \
  --publish \
  --watch-seconds 8 \
  --json
```

With no `--publish` and no `--watch-seconds`, `operate-transition` is the canonical inspection
command.

Use `--require-fully-relayable` when publish should fail instead of warning on summary-only local
proof posture.

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
  legacy-demo-client   quarantined browser demo surface
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
  v3/                  active protocol drafts
```

## Non-Goals

- browser-first implementation
- general social client behavior
- Path C overriding Path A cryptographic validity
- production release packaging in this PoC repo
