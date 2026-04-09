# Testing

Small operator-oriented testing surface for the pubSwitch CLI-first PoC.

## Scripts

- `testing/scripts/setup-env.sh`
  Prepare a deterministic local testing environment and emit shell exports.
- `testing/scripts/runbook-smoke.sh`
  Run the public CLI walkthrough end to end and assert the key expected states.
- `testing/scripts/relay-operator.sh`
  Thin wrapper around `operate-transition` for relay-oriented inspect, publish, watch, and publish-watch runs.

## Quick Start

Bootstrap a working directory:

```bash
eval "$(testing/scripts/setup-env.sh)"
```

Run the deterministic local smoke:

```bash
testing/scripts/runbook-smoke.sh
```

Inspect the saved bundle set through the relay helper:

```bash
testing/scripts/relay-operator.sh inspect
```

## Package Scripts

- `bun run testing:setup`
- `bun run testing:smoke`

The relay helper is argument-driven and is meant to be run directly.
