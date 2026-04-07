# pubSwitch

PoC workspace for a proposed Nostr key-rotation protocol suite.

Two independent protocol paths:

- **Path A — Prepared Migration** (`kind:1776`, `1777`, `1779` + NIP-03 `kind:1040`)
- **Path C — Social Transition Claims/Attestations** (`kind:1778`, `31778`)

---

## Protocol overview

### Path A: Prepared Migration (NIP-XX)

An opt-in cryptographic migration protocol. Before any key loss or compromise, the identity key `O` enrolls a separate migration key `M` that can later authorize rotation to a successor key `N`.

Three event kinds:

| Kind | Name | Signed by | Purpose |
|------|------|-----------|---------|
| `1776` | PMA — Prepared Migration Authority | `O` | Enrolls migration key `M`; must be Bitcoin-anchored via NIP-03 |
| `1779` | PMU — Prepared Migration Authority Update | current `M` | Rotates the active migration key; requires detached consent from `O` and the new `M` |
| `1777` | PMX — Prepared Migration Execution | active `M` | Executes migration to successor `N`; requires detached consent from `N` |

Resolution produces one of: `none`, `prepared_enrolled`, `prepared_migrated`, `conflicting_roots`, `conflicting_authority_updates`, `conflicting_executions`.

PMAs and PMUs require at least one valid NIP-03 (`kind:1040`) Bitcoin-anchored OTS proof. PMX events do not.

### Path C: Social Transition Claims & Attestations (NIP-XY)

A social-graph signal protocol. Either the old or new key can publish an immutable claim; any observer can publish a mutable attestation expressing support, opposition, or uncertainty.

Two event kinds:

| Kind | Name | Signed by | Purpose |
|------|------|-----------|---------|
| `1778` | STC — Social Transition Claim | `O` or `N` | Immutable statement that transition `(O → N)` exists |
| `31778` | STA — Social Transition Attestation | any observer | Latest-state stance (`support` / `oppose` / `uncertain`) toward the transition |

Resolution is follow-set-aware and produces: `none`, `claimed`, `socially_supported`, `socially_opposed`, `socially_split`.

Self-assertions by `O` or `N` are shown separately and do not count toward third-party corroboration.

### Transition ID

Both protocols share a deterministic transition identifier:

```
SHA-256( UTF8("nostr-social-transition:v1") || 0x00 || <32 bytes O> || 0x00 || <32 bytes N> )
```

This allows cross-protocol presentation without creating a dependency between the protocols.

---

## Running the demo

```bash
bun install          # install dependencies
bun run dev:demo     # start Vite dev server (demo-client SPA)
bun run typecheck    # tsc --noEmit across all packages/apps
bun test             # run all tests
bun run check        # typecheck + test together
```

### Demo stories

```bash
bun run demo:story happy          # clean rotation scenario
bun run demo:story contested      # conflicting execution scenario
bun run demo:walkthrough          # terminal walkthrough
```

### Publishing / watching relay events

```bash
bun run demo:cli publish <scenario-id>   # publish scenario events to relays
bun run demo:cli watch <scenario-id>     # subscribe and watch relay events
```

### Verification

```bash
bun scripts/verify-scenario.ts          # verify fixture scenarios
bun run verify:real-ots-corpus          # verify real OTS corpus items
```

---

## Repo structure

```
packages/
  protocol-shared        # Nostr types, canonical JSON, Schnorr, transition-id
  protocol-a             # Path A builders, validators, resolver
  protocol-c             # Path C builders, validators, resolver
  fixtures               # Deterministic test scenarios with real keypairs
  applesauce-adapters    # Thin bridge to applesauce (app layer only)
apps/
  demo-client            # React + Vite SPA — stage view and operator console
  ots-helper             # Node-side OTS proof inspection (not bundled in browser)
docs/
  v3/                    # Current NIP drafts
```

---

## Non-goals

- production hardening
- full Nostr client fork
- automatic social-graph migration
- final NIP submission polish before the PoC is proven
