# Operator Runbook

This runbook is for operating the current pubSwitch CLI PoC.

It assumes the CLI-first workflow surface:

- `prepared-migration`
- `social-transition`
- `operate-transition`

Use this page for operational guidance.
Use [CLI Demo Walkthrough](demo-script.md) for the exact deterministic local rehearsal.

## Operating Model

The CLI has three distinct jobs:

1. `prepared-migration`
   Create or resume the Path A Prepared Migration bundle set.
2. `social-transition`
   Append Path C social evidence to a social bundle set.
3. `operate-transition`
   Inspect, publish, or watch the saved prepared and social bundle sets.

The authoritative artifact is the saved bundle directory, not terminal history.

Recommended directory layout:

```text
work/
  prepared/
  social/
```

## Preflight

Before running a flow:

- start at the repo root
- confirm the CLI is available:
  - `bun run cli --help`
- optionally bootstrap the local testing environment:
  - `bun run testing:setup`
- confirm the active gate is green if you are unsure about repo state:
  - `bun run check:active`
- decide whether you are operating:
  - local-only
  - relay publish
  - relay publish plus watch

## Path A Workflow

### Start a New Prepared Migration

Use `prepared-migration` with fresh secrets and either simple proof flags or imported proof artifacts.

Minimal local example:

```bash
bun run cli prepared-migration \
  --old-secret <hex> \
  --migration-secret <hex> \
  --next-migration-secret <hex> \
  --new-secret <hex> \
  --root-proof bitcoin_confirmed \
  --root-anchor-height <height> \
  --update-proof bitcoin_confirmed \
  --update-anchor-height <height> \
  --out-dir work/prepared \
  --json
```

What to inspect in the result:

- `stage`
- `outputs`
- `operatorReport.advice.nextAction`
- `operatorReport.advice.missingInputs`
- `operatorReport.relayReport`

### Resume an Existing Prepared Migration

Use the same command with `--bundle` or `--bundle-dir`.

```bash
bun run cli prepared-migration \
  --bundle-dir work/prepared \
  --out-dir work/prepared \
  --old-secret <hex> \
  --current-migration-secret <hex> \
  --next-migration-secret <hex> \
  --new-secret <hex> \
  --root-proof-event root-proof.json \
  --update-proof-summary update-proof-summary.json \
  --json
```

Resume is the right mode when:

- proof artifacts arrived later
- the current migration secret changed to the next migration secret
- you need to continue from a saved bundle directory rather than rerun from scratch

## Path C Workflow

### Add a Claim

Omit `--stance` to append a claim.

```bash
bun run cli social-transition \
  --prepared-bundle-dir work/prepared \
  --signer-secret <hex> \
  --out-dir work/social \
  --json
```

### Add an Attestation

Supply `--stance` to append an attestation to an existing social bundle set.

```bash
bun run cli social-transition \
  --prepared-bundle-dir work/prepared \
  --social-bundle-dir work/social \
  --signer-secret <hex> \
  --stance support \
  --follow-pubkeys <csv> \
  --out-dir work/social \
  --json
```

What to inspect in the result:

- `mode`
- `operatorReport.state.state`
- `operatorReport.supportCount`
- `operatorReport.opposeCount`
- `operatorReport.advice.nextAction`

## Combined Operation

Use `operate-transition` as the only saved-bundle command for:

- inspection
- publish
- watch
- publish plus watch

### Inspect Only

```bash
bun run cli operate-transition \
  --prepared-bundle-dir work/prepared \
  --social-bundle-dir work/social \
  --follow-pubkeys <csv> \
  --json
```

### Publish Saved Evidence

```bash
bun run cli operate-transition \
  --prepared-bundle-dir work/prepared \
  --social-bundle-dir work/social \
  --publish \
  --relays wss://relay.one,wss://relay.two \
  --json
```

### Publish and Watch

```bash
bun run cli operate-transition \
  --prepared-bundle-dir work/prepared \
  --social-bundle-dir work/social \
  --publish \
  --watch-seconds 8 \
  --relays wss://relay.one,wss://relay.two \
  --json
```

### Strict Relayability

Use `--require-fully-relayable` when you want publish to fail instead of warning if the prepared
bundle only carries summary-only proof posture.

```bash
bun run cli operate-transition \
  --prepared-bundle-dir work/prepared \
  --publish \
  --require-fully-relayable \
  --json
```

## How To Read Results

### Success

All public commands support `--json`.

Success output always includes:

- `ok: true`
- `command`
- `warning`

Then inspect the command-specific fields:

- `prepared-migration`
  - `mode`
  - `stage`
  - `outputs`
  - `operatorReport`
- `social-transition`
  - `mode`
  - `output`
  - `operatorReport`
- `operate-transition`
  - `input`
  - `inspection`
  - `publishResult`
  - `watchResult`

### Failure

Failure output in `--json` mode includes:

- `ok: false`
- `command`
- `error.code`
- `error.message`
- `error.details`

Stable exit codes:

- `1`
  input, flag, bundle, or protocol-state failure
- `2`
  relay publish or watch failure
- `3`
  unexpected internal failure

## Common Triage

### `ERR_MISSING_FLAG`

The command is incomplete.
Check the command-specific required inputs first.

### `ERR_FLAG_CONFLICT`

You supplied mutually exclusive inputs such as both file and directory forms for the same source.

### `ERR_INVALID_BUNDLE`

The supplied prepared or social bundle does not parse as the expected bundle type.
Check whether you passed the right file to the right flag.

### `ERR_INVALID_PREPARED_STATE`

The prepared bundle set does not contain the state required for the requested operation.
Common examples:

- no saved bundle was found in the directory
- `social-transition` was given a prepared bundle that has not executed yet

### `ERR_SECRET_MISMATCH`

The provided migration secret does not match the currently active authority in the saved prepared
bundle set.

### `ERR_NOT_FULLY_RELAYABLE`

You requested strict relayability, but the prepared bundle does not contain enough raw proof
artifacts to be replayed fully over relays.

### `ERR_RELAY_PUBLISH_FAILED`

No relay accepted the attempted publish set.

### `ERR_WATCH_TIMEOUT`

The requested watch window ended before all target ids were observed.

## Recommended Sequence

For local rehearsal:

1. run `prepared-migration`
2. run `social-transition` for the claim
3. run `social-transition` again for the attestation
4. run `operate-transition` without publish first
5. only then add `--publish` or `--watch-seconds`

For the scripted local rehearsal path, use:

```bash
bun run testing:smoke
```

For relay-backed operation:

1. inspect locally first with `operate-transition`
2. confirm relay posture in the result
3. publish with explicit relays
4. add watch only when you need relay observation feedback

For a shorter relay-oriented wrapper over `operate-transition`, use:

```bash
testing/scripts/relay-operator.sh inspect
testing/scripts/relay-operator.sh publish --relays wss://relay.one,wss://relay.two
testing/scripts/relay-operator.sh publish-watch --relays wss://relay.one --watch-seconds 8
```

## PoC Limits

- this is still a PoC operator CLI, not a packaged production tool
- the browser app remains quarantined legacy context
- protocol truth lives in the protocol packages and saved bundles, not in a browser workflow
- local or summary-backed proof posture is still meaningful operator evidence, but not the same thing as full relay replayability
