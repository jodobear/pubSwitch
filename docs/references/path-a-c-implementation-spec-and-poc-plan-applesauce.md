# Implementation Specification and PoC Plan for Path A + Path C (Applesauce)

**Date:** 2026-03-19
**Scope:**
- NIP-XX Prepared Migration (`1776`, `1777`, `1779`, plus NIP-03 `1040`)
- NIP-XY Social Transition Claims and Attestations (`1778`, `31778`)
- applesauce-based demo implementation

## Executive decision

Build a **minimal dedicated demo client** using Applesauce.
Do **not** fork a full social client for v1.

## Why

The PoC needs:

- custom event kinds and validators;
- detached-signature preimages;
- OTS lifecycle handling;
- explicit conflict-state UX;
- raw evidence inspection;
- strict separation of Path A and Path C.

A focused demo app is faster and easier to reason about than trimming down a full client.

## SDK choice

Use Applesauce as the application SDK layer.

### Core packages

- `applesauce-core`
- `applesauce-relay`
- `applesauce-loaders`
- `applesauce-react`
- `applesauce-signers`
- `applesauce-accounts`
- optionally `applesauce-actions`

### Separate protocol packages

Keep protocol logic outside applesauce-specific glue:

- `protocol-a`
- `protocol-c`
- `protocol-shared`

These packages should remain pure and testable with plain event JSON.

## Recommended stack

- **UI:** React + TypeScript + Vite
- **Reactive layer:** RxJS via Applesauce
- **Event store:** `EventStore`
- **Relay pool:** `RelayPool`
- **Loaders:** `createEventLoaderForStore`, `createEventLoader`, `createAddressLoader`
- **React hooks:** `EventStoreProvider`, `use$`, `useEventModel`
- **Signers:** applesauce NIP-07 / NIP-46 adapters, plus dev/local signer for fixtures
- **OTS helper:** small local helper service or CLI wrapper
- **Tests:** Vitest + deterministic fixtures

## Repo layout

```text
key-rotation-poc/
├─ apps/
│  ├─ demo-client/
│  └─ ots-helper/
├─ packages/
│  ├─ protocol-a/
│  ├─ protocol-c/
│  ├─ protocol-shared/
│  ├─ applesauce-adapters/
│  └─ fixtures/
├─ scripts/
│  ├─ generate-fixtures.ts
│  ├─ publish-scenario.ts
│  └─ verify-scenario.ts
├─ docker/
│  └─ relay/
└─ docs/
   ├─ protocol/
   ├─ demo-script.md
   └─ threat-matrix.md
```

## Runtime architecture

### 1. App context

Create one session context:

```ts
export type DemoAppContext = {
  eventStore: EventStore;
  relayPool: RelayPool;
  publish: (event: NostrEvent, relays?: string[]) => Promise<void>;
};
```

### 2. Relay wiring

- instantiate `EventStore`
- instantiate `RelayPool`
- attach `createEventLoaderForStore(eventStore, relayPool, options)`
- use focused loaders for targeted fetches

### 3. Protocol resolvers

Resolvers must be **pure** and **independent**:

- Path A resolver reads only `1776`, `1777`, `1779`, `1040`
- Path C resolver reads only `1778`, `31778`
- UI layer may merge the two outputs for presentation only

## Evidence fetch strategy

### Path A fetches

For viewed old key `O`:

- load candidate PMAs by `authors:[O], kinds:[1776]`
- load candidate PMUs by `kinds:[1779], #o:[O]`
- load candidate PMXs by `kinds:[1777], #o:[O]`
- load candidate OTS proofs by `kinds:[1040]` and `#k:[1776,1779]`, then filter by `#e` target ids

### Path C fetches

For viewed old key `O`:

- load candidate STCs by `kinds:[1778], #o:[O]`
- load candidate STAs by `kinds:[31778], #o:[O]`
- after candidate `(O,N)` pairs are known, optionally refine by `#d:[transitionId]`

### Important

Do not rely on author-only queries for Path C or for PMU / PMX discovery.
The `o`, `n`, `d`, and `e` tags are part of the index strategy.

## Signing strategy

Support three signer modes:

1. NIP-07 browser extension
2. NIP-46 remote signer
3. dev-local signer for fixture creation and local demos only

### Public recommendation

Prefer NIP-46 in the main UX flows.
Use NIP-07 as a compatibility path.
Keep dev-local clearly marked unsafe.

## Actions

If using `applesauce-actions`, define custom actions:

- `PrepareMigrationAction`
- `PublishOtsProofAction`
- `UpdateMigrationAuthorityAction`
- `ExecuteMigrationAction`
- `CreateSocialClaimAction`
- `SetSocialAttestationAction`

These actions should:

- read current local state from `EventStore`
- build events via the protocol packages
- sign via signer adapters
- publish via the shared publish abstraction

## Protocol package contracts

## `packages/protocol-shared`

Required exports:

```ts
export type Hex32 = string;
export type EventId = string;

export function canonicalJsonArray(value: unknown[]): Uint8Array;
export function sha256Hex(bytes: Uint8Array): string;
export function assertLowercaseHex32(value: string, label: string): void;
export function computeTransitionId(oldPubkey: Hex32, newPubkey: Hex32): string;
```

## `packages/protocol-a`

Required exports:

```ts
export function buildPma(input: {
  oldSigner: SignerLike;
  migrationPubkey: Hex32;
  createdAt?: number;
}): Promise<NostrEvent>;

export function buildPmu(input: {
  oldPubkey: Hex32;
  previousAuthorityId: EventId;
  currentMigrationSigner: SignerLike;
  nextMigrationPubkey: Hex32;
  oldDetachedSigner: DetachedSignerLike;
  nextDetachedSigner: DetachedSignerLike;
  createdAt?: number;
}): Promise<NostrEvent>;

export function buildPmx(input: {
  authorityId: EventId;
  oldPubkey: Hex32;
  migrationSigner: SignerLike;
  newSigner: SignerLike;
  createdAt?: number;
}): Promise<NostrEvent>;

export function validatePma(event: NostrEvent, otsProofs: NostrEvent[]): ValidatedPma | Invalid;
export function validatePmu(event: NostrEvent, authorityIndex: AuthorityIndex, otsProofs: NostrEvent[]): ValidatedPmu | Invalid;
export function validatePmx(event: NostrEvent, activeAuthority: AuthorityRecord): ValidatedPmx | Invalid;

export function resolvePreparedMigration(input: {
  oldPubkey: Hex32;
  events: NostrEvent[];
  otsProofs: NostrEvent[];
}): PreparedState;
```

### Resolver rule

Normalize semantic duplicates before conflict detection:

- PMA duplicates with same effective `(o, m, anchor_height)` collapse
- PMU duplicates with same effective `(prevAuthorityId, o, currentM, nextM)` collapse
- PMX duplicates with same effective `(authorityId, o, n)` collapse

## `packages/protocol-c`

Required exports:

```ts
export function buildSocialClaim(input: {
  role: "old" | "new";
  oldPubkey: Hex32;
  newPubkey: Hex32;
  signer: SignerLike;
  content?: string;
  createdAt?: number;
}): Promise<NostrEvent>;

export function buildSocialAttestation(input: {
  oldPubkey: Hex32;
  newPubkey: Hex32;
  attestorSigner: SignerLike;
  stance: "support" | "oppose" | "uncertain";
  method?: "in_person" | "video" | "voice" | "website" | "nip05" | "chat" | "other";
  content?: string;
  referencedClaimIds?: EventId[];
  createdAt?: number;
}): Promise<NostrEvent>;

export function validateSocialClaim(event: NostrEvent): ValidatedClaim | Invalid;
export function validateSocialAttestation(event: NostrEvent): ValidatedAttestation | Invalid;

export function resolveSocialTransition(input: {
  viewerFollowSet: Set<Hex32>;
  oldPubkey: Hex32;
  newPubkey: Hex32;
  claims: NostrEvent[];
  attestations: NostrEvent[];
}): SocialState;
```

### Resolver rule

For third-party support counts, exclude STA authors equal to `oldPubkey` or `newPubkey` by default.
They remain valid events, but should be surfaced as self-assertions, not independent support.

## `packages/applesauce-adapters`

Responsibilities:

- create and configure `EventStore`
- create and configure `RelayPool`
- create focused loaders
- expose publish helper
- expose signer adapters
- load current viewer follow set
- expose scenario helpers for fixtures

Suggested exports:

```ts
export function createDemoAppContext(config: DemoConfig): DemoAppContext;
export function createEvidenceStreams(ctx: DemoAppContext, oldPubkey: string, newPubkey?: string): EvidenceStreams;
export function createSignerAdapter(config: SignerConfig): Promise<SignerLike>;
export function loadViewerFollowSet(ctx: DemoAppContext, viewerPubkey: string): Promise<Set<string>>;
```

## Demo client routes

- `/`
  - connect signer
  - choose scenario
  - open protocol screens
- `/prepare`
  - enroll Path A
- `/execute`
  - execute Path A
- `/social`
  - publish Path C claim / attestation
- `/profile/:npub`
  - evidence view for one identity
- `/debug/:id`
  - raw event inspector

## Core screens

### 1. Prepared Migration card

Show:

- local onboarding state
- protocol state
- active authority id
- migration pubkey
- successor pubkey if any
- OTS proof state
- raw event links

### 2. Social Transition card

Show:

- claim state
- support count from followed pubkeys
- oppose count from followed pubkeys
- self-assertions by `O` / `N`
- raw events

### 3. Merged summary banner

Display only.
Never write merged output back into protocol state.

## Onboarding / prep tool

### Main promise

“Protect this account with a recovery key.”

### Required outputs

- active identity key
- migration key
- published `1776`
- published `1040`
- encrypted recovery bundle

### Recovery bundle

```json
{
  "version": 1,
  "type": "nostr-prepared-migration-bundle",
  "old_pubkey": "<hex>",
  "migration_pubkey": "<hex>",
  "encrypted_migration_key": "<ncryptsec...>",
  "pma_event": {"...": "..."},
  "ots_event": {"...": "..."},
  "relay_hints": ["wss://demo-relay.example"]
}
```

## OTS helper

The helper is for UX, not trust.
It should:

- stamp target event ids
- upgrade pending proofs
- verify full proofs
- return `targetEventId`, `targetKind`, and `anchorHeight`

The final proof must still be published as `kind:1040` and independently re-verifiable.

## Test matrix additions

In addition to the existing adversarial tests, include:

### Path A

- duplicate PMAs with same `m` and same minimum anchor height
- duplicate PMUs with same `u` from same parent
- duplicate PMXs with same `n`
- invalid OTS proof that verifies a different target kind

### Path C

- valid STA authored by `o`, excluded from third-party support count
- valid STA authored by `n`, excluded from third-party support count
- same `(kind,pubkey,d)` with same `created_at`, tie broken by NIP-01 rule
- heavy claim spam for one old key

## Development phases

### Phase 1 — protocol packages

Build pure codecs, validators, and resolvers.

### Phase 2 — applesauce adapters

Wire `EventStore`, `RelayPool`, loaders, signer adapters, and publish helpers.

### Phase 3 — deterministic demo environment

Add relay, fixture publisher, OTS helper, and replayable scenarios.

### Phase 4 — demo UI

Add prepare, execute, social, and evidence screens.

### Phase 5 — external signer / public relay smoke tests

Test with NIP-46 first, then NIP-07.

## Final recommendation

Use Applesauce for the PoC foundation, keep the demo app dedicated and narrow, and fix the semantic-duplicate and fetch-strategy gaps before pitching the drafts as implementation-ready.
