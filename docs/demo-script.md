# CLI Demo Walkthrough

This is the canonical local operator walkthrough for the current PoC CLI.

It uses the three public workflow commands only:

- `prepared-migration`
- `social-transition`
- `operate-transition`

Everything below is local and deterministic. The commands write bundles into one working
directory, then reuse those bundle directories for the later steps.

## Preconditions

- run from the repo root
- dependencies installed with `bun install`
- CLI available via `bun run cli --help`

Working directory for the walkthrough:

```bash
export PUBSWITCH_DEMO_DIR=/tmp/pubswitch-demo
mkdir -p "$PUBSWITCH_DEMO_DIR"
```

Deterministic rehearsal secrets used by the test suite:

- old secret:
  `0000000000000000000000000000000000000000000000000000000000000021`
- initial migration secret:
  `0000000000000000000000000000000000000000000000000000000000000022`
- next migration secret:
  `0000000000000000000000000000000000000000000000000000000000000023`
- new account secret:
  `0000000000000000000000000000000000000000000000000000000000000024`
- attestor secret:
  `0000000000000000000000000000000000000000000000000000000000000025`
- attestor pubkey:
  `62d14dab4150bf497402fdc45a215e10dcb01c354959b10cfe31c7e9d87ff33d`

## 1. Run Prepared Migration

```bash
bun run cli prepared-migration \
  --old-secret 0000000000000000000000000000000000000000000000000000000000000021 \
  --migration-secret 0000000000000000000000000000000000000000000000000000000000000022 \
  --next-migration-secret 0000000000000000000000000000000000000000000000000000000000000023 \
  --new-secret 0000000000000000000000000000000000000000000000000000000000000024 \
  --root-proof bitcoin_confirmed \
  --root-anchor-height 840260 \
  --update-proof bitcoin_confirmed \
  --update-anchor-height 840261 \
  --relays wss://relay.prepared \
  --out-dir "$PUBSWITCH_DEMO_DIR/prepared" \
  --json
```

Expected highlights:

- `command: "prepared-migration"`
- `mode: "start"`
- `stage: "prepared_migrated"`
- `outputs.executed` points at `prepared-executed.json`
- `operatorReport.advice.nextAction` is `done`

## 2. Add the Social Claim

This uses the executed prepared bundle directory and writes the first social bundle snapshot.

```bash
bun run cli social-transition \
  --prepared-bundle-dir "$PUBSWITCH_DEMO_DIR/prepared" \
  --signer-secret 0000000000000000000000000000000000000000000000000000000000000021 \
  --relays wss://relay.social \
  --out-dir "$PUBSWITCH_DEMO_DIR/social" \
  --json
```

Expected highlights:

- `command: "social-transition"`
- `mode: "claim"`
- `operatorReport.state.state` is `claimed`

## 3. Add a Social Attestation

This reuses the saved social bundle directory and appends a support attestation.

```bash
bun run cli social-transition \
  --prepared-bundle-dir "$PUBSWITCH_DEMO_DIR/prepared" \
  --social-bundle-dir "$PUBSWITCH_DEMO_DIR/social" \
  --signer-secret 0000000000000000000000000000000000000000000000000000000000000025 \
  --stance support \
  --follow-pubkeys 62d14dab4150bf497402fdc45a215e10dcb01c354959b10cfe31c7e9d87ff33d \
  --out-dir "$PUBSWITCH_DEMO_DIR/social" \
  --json
```

Expected highlights:

- `command: "social-transition"`
- `mode: "attest"`
- `operatorReport.state.state` is `socially_supported`

## 4. Inspect the Combined Transition

This is the canonical saved-bundle operator command.

```bash
bun run cli operate-transition \
  --prepared-bundle-dir "$PUBSWITCH_DEMO_DIR/prepared" \
  --social-bundle-dir "$PUBSWITCH_DEMO_DIR/social" \
  --follow-pubkeys 62d14dab4150bf497402fdc45a215e10dcb01c354959b10cfe31c7e9d87ff33d \
  --json
```

Expected highlights:

- `command: "operate-transition"`
- `inspection.prepared.state` is `prepared_migrated`
- `inspection.social.state` is `socially_supported`
- `inspection.socialAdvice.nextAction` is `review_support`
- `input.effectiveRelays` includes:
  - `wss://relay.prepared`
  - `wss://relay.social`

## Notes

- Add `--publish` to `operate-transition` to publish the saved evidence set.
- Add `--watch-seconds <n>` to `operate-transition` to wait for relay observation.
- `--require-fully-relayable` makes publish fail instead of warning when prepared proof posture is only local or summary-backed.
- `social-transition` can also work from explicit `--old-pubkey` and `--new-pubkey`, but this walkthrough keeps the pair derived from the prepared bundle lane.
