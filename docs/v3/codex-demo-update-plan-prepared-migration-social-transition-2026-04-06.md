# Codex Implementation Update Plan: Prepared Migration + Social Transition (Applesauce)

**Date:** 2026-04-06  
**Audience:** Codex / implementation agent  
**Scope:** update the demo and onboarding flows to match the **current** Prepared Migration and
Social Transition drafts. This is not a stripped-down demo spec. It must reflect the published
proposal shape, including full Path A authority updates and full Path C independence.

## 1. Purpose

Update the implementation so it matches the latest protocol decisions:

- **Prepared Migration** remains a full protocol with:
  - `1776` PMA,
  - `1779` PMU,
  - `1777` PMX,
  - `1040` OTS proofs,
  - root/direct-parent lineage tags,
  - semantic-duplicate normalization,
  - evidence-bundle export/import.
- **Social Transition Claims and Attestations** remains a separate protocol with:
  - `1778` STC,
  - `31778` STA,
  - transition-id-based correlation,
  - self-assertion separation,
  - addressable latest-state semantics.
- The demo UI presents both protocols together, but the resolvers remain **independent**.

## 2. Non-negotiable constraints

Codex MUST preserve these constraints:

1. **Protocol independence**
   - Path A resolver MUST read only `1776`, `1779`, `1777`, `1040`.
   - Path C resolver MUST read only `1778`, `31778`.
   - UI MAY merge results by `(O, N, T)` only after independent resolution.

2. **Applesauce, not NDK**
   - Use Applesauce for event storage, relay connections, reactive UI, and signer integration.
   - Preferred packages:
     - `applesauce-core`
     - `applesauce-relay`
     - `applesauce-loaders`
     - `applesauce-react`
     - `applesauce-accounts`
     - optional `applesauce-actions`

3. **No demo-only protocol shortcuts**
   - Do not remove PMU.
   - Do not collapse A and C.
   - Do not invent extra authoritative rules beyond the draft NIPs.
   - Do not silently couple social evidence into Prepared Migration validity.

4. **Threat-aware behavior**
   - Same semantics must hold regardless of relay order, duplicate events, or insertion order.
   - Resolver outputs must be deterministic under permutations of equivalent evidence sets.

## 3. External facts this plan is aligned with

The current NIP repo stresses that proposals should be optional, backwards-compatible, and avoid
multiple ways of doing the same thing, which is why the implementation must keep A and C separate
and narrowly scoped. The README also highlights indexed single-letter tags and current acceptance
criteria. citeturn716275search0turn660573view1

The current `#2278` discussion is still useful for implementation shape even though we are not
adopting it as Path C: it emphasizes “claims and evidence, not truth,” points out the deletion /
availability attack, and shows why explicit root/direct-parent references plus a root discovery hint
improve lineage discovery. citeturn946544view0turn946544view2

Applesauce currently centers app architecture around `EventStore`, `RelayPool`, functional loaders,
React providers/hooks, and async signer / publish APIs, so the update should use those idioms
instead of older loader classes or synchronous signer assumptions. citeturn384021search0turn657695search1turn657695search2turn657695search3

## 4. Target repository layout

Use or update a monorepo shaped like this:

```text
key-rotation/
├─ apps/
│  ├─ demo-client/
│  ├─ onboarding-tool/
│  └─ ots-helper/
├─ packages/
│  ├─ protocol-shared/
│  ├─ protocol-a/
│  ├─ protocol-c/
│  ├─ applesauce-adapters/
│  ├─ evidence-bundles/
│  └─ fixtures/
├─ scripts/
│  ├─ generate-fixtures.ts
│  ├─ publish-scenario.ts
│  ├─ verify-scenario.ts
│  └─ export-bundle.ts
├─ docs/
│  ├─ protocol/
│  ├─ scenarios/
│  └─ threat-matrix.md
└─ pnpm-workspace.yaml
```

## 5. Workstreams

Implement the update in the following order.

---

## Workstream 1: Update shared protocol primitives

### Goals

Create a pure shared package that both A and C use without depending on Applesauce.

### Required exports

```ts
export type Hex32 = string;
export type EventId = string;

export function assertHex32(value: string, label: string): void;
export function canonicalJsonArray(value: unknown[]): Uint8Array;
export function sha256Hex(bytes: Uint8Array): string;
export function schnorrVerify(sigHex: string, msgHashHex: string, pubkeyHex: string): boolean;
export function computeTransitionId(oldPubkey: Hex32, newPubkey: Hex32): string;
```

### Required behavior

- `canonicalJsonArray()` MUST follow the same JSON normalization assumptions used in the NIPs.
- `computeTransitionId()` MUST exactly match both updated NIP drafts.
- Add golden test vectors for:
  - transition id,
  - PMU detached-signature preimage,
  - PMX detached-signature preimage.

### Deliverables

- `packages/protocol-shared/src/index.ts`
- `packages/protocol-shared/test/*.spec.ts`

---

## Workstream 2: Update Prepared Migration (`protocol-a`)

### Goals

Make the A package match the updated Prepared Migration draft exactly.

### Data model changes

Codex MUST update A to reflect these draft changes:

1. **PMA (`1776`)**
   - add required `["t","root"]`
   - keep `o` and `m`
   - no `e`, no `E`

2. **PMU (`1779`)**
   - add required `E` root lineage reference
   - add required `e` direct parent authority reference
   - keep `o`, `u`, `os`, `ns`
   - detached signature preimage now binds:
     - `o`
     - root authority id
     - previous authority id
     - current migration pubkey
     - next migration pubkey
     - `created_at`

3. **PMX (`1777`)**
   - add required `d`
   - add required `E` root lineage reference
   - add required `e` direct authority reference
   - keep `o`, `n`, `ns`
   - detached signature preimage now binds:
     - transition id
     - root authority id
     - active authority id
     - `o`
     - `n`
     - `created_at`

4. **Normalization**
   - PMA groups are keyed by `(O, M)`
   - PMU groups are keyed by `(rootGroup, currentAuthoritySet, nextMigrationPubkey)`
   - PMX groups are keyed by `(rootGroup, currentAuthoritySet, N)`

### Required exports

```ts
export type AnchorHeight = number;

export function buildPma(input: {
  oldSigner: SignerLike;
  migrationPubkey: Hex32;
  createdAt?: number;
}): Promise<NostrEvent>;

export function buildPmu(input: {
  oldPubkey: Hex32;
  rootAuthorityId: EventId;
  previousAuthorityId: EventId;
  currentMigrationSigner: SignerLike;
  nextMigrationPubkey: Hex32;
  oldDetachedSigner: DetachedSignerLike;
  nextDetachedSigner: DetachedSignerLike;
  createdAt?: number;
}): Promise<NostrEvent>;

export function buildPmx(input: {
  rootAuthorityId: EventId;
  authorityId: EventId;
  oldPubkey: Hex32;
  migrationSigner: SignerLike;
  newSigner: SignerLike;
  createdAt?: number;
}): Promise<NostrEvent>;

export function validatePma(event: NostrEvent, otsProofs: NostrEvent[]): ValidatedPma | Invalid;
export function validatePmu(event: NostrEvent, authorityIndex: AuthorityIndex, otsProofs: NostrEvent[]): ValidatedPmu | Invalid;
export function validatePmx(event: NostrEvent, authorityIndex: AuthorityIndex): ValidatedPmx | Invalid;

export function resolvePreparedMigration(input: {
  oldPubkey: Hex32;
  events: NostrEvent[];
  otsProofs: NostrEvent[];
}): PreparedState;
```

### Resolver rules Codex MUST implement

1. **Root group selection**
   - collect valid PMAs for `O`
   - group by migration key `M`
   - compute `group_anchor_height = min(anchor_height)`
   - if multiple groups share the minimum anchor height and have different `M`, return
     `conflicting_roots`

2. **Root duplicate handling**
   - equivalent PMAs with the same `(O, M)` are not conflicts
   - choose a representative id only for internal normalization:
     - among members at the minimum anchor height,
     - lowest event id lexicographically

3. **PMU chain walking**
   - a PMU belongs to the current lineage step iff:
     - `o == O`
     - `pubkey == currentMigrationKey`
     - `E` points to any member of the winning root group
     - `e` points to any member of the current authority set
   - group candidate PMUs by `u`
   - if more than one distinct `u` exists, return `conflicting_authority_updates`

4. **PMX execution**
   - a PMX belongs to the active authority iff:
     - `o == O`
     - `pubkey == currentMigrationKey`
     - `E` points to any member of the winning root group
     - `e` points to any member of the active authority set
     - `d == computeTransitionId(o, n)`
   - group by `n`
   - if more than one distinct `n` exists, return `conflicting_executions`

### OTS integration

Codex MUST add a small adapter layer that:

- accepts `kind:1040` events,
- verifies proof integrity using the chosen OTS library/tool,
- extracts one or more Bitcoin block heights,
- computes `anchor_height = min(heights)`.

The adapter MUST reject pending-only proofs for protocol validity.

### Deliverables

- `packages/protocol-a/src/events.ts`
- `packages/protocol-a/src/validate.ts`
- `packages/protocol-a/src/resolve.ts`
- `packages/protocol-a/src/ots.ts`
- `packages/protocol-a/test/*.spec.ts`

---

## Workstream 3: Update Social Transition (`protocol-c`)

### Goals

Make C match the updated draft while staying strictly independent from A.

### Data model changes

1. **STC (`1778`)**
   - remove the old `r` tag
   - signer role is now inferred:
     - event pubkey MUST equal `o` or `n`

2. **STA (`31778`)**
   - keep `d`, `o`, `n`, `s`
   - keep optional `m`
   - keep optional `e` references to STC ids
   - addressable latest-state semantics remain

3. **Self-assertion handling**
   - STAs by `O` or `N` remain valid
   - but they MUST NOT count toward third-party support / opposition by default

### Required exports

```ts
export function buildSocialClaim(input: {
  oldPubkey: Hex32;
  newPubkey: Hex32;
  signer: SignerLike; // must be O or N
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
  viewerTrustedSet?: Set<Hex32>;
  oldPubkey: Hex32;
  newPubkey: Hex32;
  claims: NostrEvent[];
  attestations: NostrEvent[];
}): SocialState;
```

### Resolver rules Codex MUST implement

- `none` if no valid STC exists
- `claimed` if at least one valid STC exists and there is no followed/trusted third-party support or oppose
- `socially_supported` if at least one followed/trusted third-party live `support` STA exists and no third-party `oppose`
- `socially_opposed` if at least one followed/trusted third-party live `oppose` STA exists and no third-party `support`
- `socially_split` if both exist
- STAs by `O` or `N` are returned as `selfAssertions` in the result but excluded from third-party counts

### Addressable latest-state rule

Codex MUST implement addressable latest-state semantics using `(kind, pubkey, d)`.
If two valid STAs for the same tuple share the same `created_at`, keep the lowest event id.

### Deliverables

- `packages/protocol-c/src/events.ts`
- `packages/protocol-c/src/validate.ts`
- `packages/protocol-c/src/resolve.ts`
- `packages/protocol-c/test/*.spec.ts`

---

## Workstream 4: Evidence bundles

### Goals

Implement export/import of evidence bundles for resilience and demo clarity.

### Bundle contents

Prepared Migration bundle MUST support:

- PMA / PMU / PMX JSON
- matching `1040` event JSON
- raw `.ots` bytes where available
- relay list used when publishing

Social Transition bundle SHOULD support:

- STC JSON
- STA JSON
- optional rendered summary metadata for demo display

### Required exports

```ts
export type PreparedBundle = {
  version: 1;
  oldPubkey: Hex32;
  migrationPubkeys: Hex32[];
  successorPubkeys?: Hex32[];
  events: NostrEvent[];
  otsProofs: Array<{
    targetEventId: EventId;
    otsEvent?: NostrEvent;
    otsBytesBase64?: string;
  }>;
  relays: string[];
};

export function exportPreparedBundle(input: ...): Promise<PreparedBundle>;
export function importPreparedBundle(bundle: PreparedBundle): ImportedPreparedBundle;
```

### Deliverables

- `packages/evidence-bundles/src/*`
- `scripts/export-bundle.ts`
- `scripts/import-bundle.ts`

---

## Workstream 5: Applesauce adapters

### Goals

Replace any NDK-shaped assumptions with Applesauce-native wiring.

### Current Applesauce assumptions to follow

- Use `EventStore` as the canonical in-memory event database. citeturn384021search0turn657695search0
- Use `RelayPool` for relay connections and subscriptions. citeturn384021search0turn657695search0
- Use functional loaders where they help, because Applesauce removed class-based loaders in favor of functions returning observables. citeturn657695search2
- Treat signer/account methods and relay publish methods as async Promises. citeturn657695search3

### Adapter responsibilities

- initialize `EventStore`
- initialize `RelayPool`
- publish signed events
- add received events into `EventStore`
- expose query helpers for A and C
- expose signer adapters for:
  - NIP-46
  - NIP-07
  - dev-local signer

### Suggested exports

```ts
export function createDemoContext(config: DemoConfig): DemoContext;
export function loadPreparedEvidence(ctx: DemoContext, oldPubkey: Hex32): Observable<NostrEvent[]>;
export function loadSocialEvidence(ctx: DemoContext, oldPubkey: Hex32, newPubkey?: Hex32): Observable<NostrEvent[]>;
export function loadOtsProofs(ctx: DemoContext, authorityIds: EventId[]): Observable<NostrEvent[]>;
export function createSignerAdapter(config: SignerConfig): Promise<SignerLike>;
export function loadViewerFollowSet(ctx: DemoContext, viewerPubkey: Hex32): Promise<Set<Hex32>>;
```

### Discovery strategy

Codex MUST use indexed tag queries, not only authors:

#### Prepared Migration

- PMA roots:
  - `{"authors":[O],"kinds":[1776]}`
- PMUs:
  - `{"kinds":[1779],"#o":[O]}`
- PMXs:
  - `{"kinds":[1777],"#o":[O]}`
- OTS proofs for candidate authorities:
  - `{"kinds":[1040],"#e":[authorityIds...]}`

#### Social Transition

- STCs:
  - `{"kinds":[1778],"#o":[O]}`
- STAs for known transitions:
  - `{"kinds":[31778],"#d":[transitionIds...]}`

### Deliverables

- `packages/applesauce-adapters/src/context.ts`
- `packages/applesauce-adapters/src/loaders.ts`
- `packages/applesauce-adapters/src/signers.ts`
- `packages/applesauce-adapters/test/*.spec.ts`

---

## Workstream 6: Onboarding tool

### Goals

Create or update a simple onboarding tool that prepares a new user/key for eventual Prepared Migration
with good UX and good evidence hygiene.

### Public UX target

The onboarding tool should feel like:

1. connect current signer
2. generate or connect migration key
3. explain what the migration key is and why it matters
4. publish PMA
5. obtain OTS proof and publish `1040`
6. export evidence bundle
7. verify re-import of the bundle locally
8. optionally explain how a future PMU / PMX would work

### Required flows

#### Flow A: Prepare migration

- connect old key signer
- generate migration key or connect migration signer
- show confirmation screen with:
  - old pubkey
  - migration pubkey
  - selected relays
- publish PMA
- request/generate OTS proof
- publish `1040`
- export bundle
- save bundle locally

#### Flow B: Update migration authority

- import or discover existing lineage
- connect old key and current migration key
- connect or generate next migration key
- publish PMU
- request/generate OTS proof
- publish `1040`
- update bundle

#### Flow C: Execute migration

- discover or import active authority
- connect active migration signer
- connect new signer
- publish PMX
- optionally create a companion STC template for the user
- update bundle

### Deliverables

- `apps/onboarding-tool/src/*`
- `docs/scenarios/onboarding.md`

---

## Workstream 7: Demo UI

### Goals

Expose the protocols clearly without coupling them.

### Primary UI object

Build the UI around a **Transition Card** for `(O, N)`.

The card shows two independent sections:

1. **Prepared Migration**
2. **Social Transition**

### Required routes or screens

- `/`
  - connect signer
  - choose scenario / enter old key
- `/prepare`
  - PMA / PMU / PMX onboarding flows
- `/social`
  - publish STC / STA
- `/profile/:npub`
  - evidence inspection for a viewed identity
- `/transition/:old/:new`
  - merged evidence view for one transition id
- `/debug/:eventId`
  - raw event inspector

### Required UI states

#### Prepared Migration section

Internally, preserve all machine states.
User-facing, show:

- Not prepared
- Prepared
- Migrated
- Conflict

The details panel must still reveal whether the conflict was:
- root conflict,
- authority-update conflict,
- or execution conflict.

#### Social Transition section

Internally, preserve all machine states.
User-facing, show:

- No signal
- Claimed
- Supported
- Opposed
- Contested

The details panel must reveal:
- STCs
- third-party support
- third-party opposition
- self-assertions
- methods
- referenced claims

### Required user actions

- Follow new key
- Follow both
- Mute old key
- Copy transition summary
- Export evidence bundle
- View raw evidence

The UI MUST NOT automatically rewrite follows or trust labels.

### Deliverables

- `apps/demo-client/src/routes/*`
- `apps/demo-client/src/components/TransitionCard.tsx`
- `apps/demo-client/src/components/PreparedMigrationPanel.tsx`
- `apps/demo-client/src/components/SocialTransitionPanel.tsx`
- `apps/demo-client/src/components/EvidenceDrawer.tsx`

---

## Workstream 8: Threat fixtures and test matrix

### Goals

Make the implementation prove it handles adversarial cases and not just happy paths.

### Required scenarios

Codex MUST add deterministic fixtures for at least these scenarios.

#### Prepared Migration fixtures

1. `A_happy_prepare_and_execute`
2. `A_duplicate_root_same_M`
3. `A_conflicting_roots_same_earliest_anchor`
4. `A_duplicate_pmu_same_next_M`
5. `A_conflicting_pmu_distinct_next_M`
6. `A_duplicate_pmx_same_N`
7. `A_conflicting_pmx_distinct_N`
8. `A_missing_ots_pending_only`
9. `A_relay_loss_after_local_validation`
10. `A_deleted_remote_copy_but_local_bundle_present`

#### Social Transition fixtures

1. `C_claim_by_old_only`
2. `C_claim_by_new_only`
3. `C_claims_by_both`
4. `C_self_attestation_only`
5. `C_supported_by_followed_third_party`
6. `C_opposed_by_followed_third_party`
7. `C_split_followed_graph`
8. `C_uncertain_only`
9. `C_attestation_same_timestamp_tie`
10. `C_claim_present_no_attestations`

#### Cross-protocol fixtures

1. `AC_prepared_migrated_plus_social_supported`
2. `AC_prepared_migrated_plus_social_split`
3. `AC_no_prepared_plus_social_supported`
4. `AC_conflicting_execution_plus_social_supported_for_one_successor`

### Determinism requirements

For every resolver fixture:

- shuffle event order 100 times
- assert exact same result each time

### Deliverables

- `packages/fixtures/src/*`
- `packages/protocol-a/test/scenarios/*.spec.ts`
- `packages/protocol-c/test/scenarios/*.spec.ts`
- `apps/demo-client/test/e2e/*.spec.ts`

---

## Workstream 9: Acceptance criteria

Codex MUST stop only when all of the following are true.

### Protocol correctness

- Prepared Migration resolver returns the same result regardless of event arrival order.
- Social Transition resolver returns the same result regardless of event arrival order.
- Equivalent duplicates do not create fake conflicts.
- Distinct semantic forks do create conflicts.

### Independence

- Removing all C events does not change A resolver output.
- Removing all A events does not change C resolver output.

### Applesauce correctness

- EventStore is the sole in-memory source of truth for the UI.
- RelayPool is the only relay connection layer.
- No NDK imports remain.
- Signer calls are async.
- Publish calls are async.

### UX correctness

- The Transition Card shows A and C as separate evidence sections.
- No automatic follow rewrite exists.
- Evidence details are inspectable.
- Evidence bundle export/import works.

### Security / resilience

- Pending-only OTS proofs are rejected for A validity.
- Missing relay copies do not invalidate previously validated local evidence.
- Self-assertions are not counted as third-party support.

## 6. Suggested execution order for Codex

Use this exact order:

1. patch `protocol-shared`
2. patch `protocol-a`
3. patch `protocol-c`
4. add evidence-bundles package
5. patch Applesauce adapters
6. patch onboarding tool
7. patch demo UI
8. add fixtures and tests
9. run deterministic permutation tests
10. document scenario screenshots / recordings

## 7. What Codex should not do

Codex MUST NOT:

- swap in `#2278` as Path C;
- collapse A and C into one resolver;
- use social evidence to invalidate Prepared Migration;
- use Prepared Migration to auto-authorize social support;
- remove PMU because it seems complex;
- replace Applesauce with NDK;
- treat relay deletion as invalidation of previously validated local evidence.

## 8. Final implementation note

The updated proposals deliberately borrow some good lessons from the current Checkpoints discussion —
especially the humble “claims and evidence, not truth” framing, root/direct-parent discoverability,
and the availability warning — while still keeping A and C as narrower, interoperable protocols.
That is the architecture the implementation must preserve. citeturn946544view0turn946544view2
