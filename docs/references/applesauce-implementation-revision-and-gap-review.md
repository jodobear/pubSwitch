# Applesauce implementation revision and gap review

**Date:** 2026-03-19

## Summary

This note supersedes the NDK-specific parts of `path-a-c-implementation-spec-and-poc-plan.md`.
The PoC should use `hzrd149/applesauce` as the client SDK layer.

It also records the current protocol and implementation gaps that should be fixed before calling the drafts submission-ready.

## Implementation decision

### SDK stack

Use Applesauce packages instead of NDK:

- `applesauce-core`
  - `EventStore`
  - models / helpers
- `applesauce-relay`
  - `RelayPool`
  - `onlyEvents`
- `applesauce-loaders`
  - `createEventLoaderForStore`
  - `createEventLoader`
  - `createAddressLoader`
- `applesauce-react`
  - `EventStoreProvider`
  - `use$`
  - `useEventModel`
- `applesauce-signers`
  - NIP-07 signer adapter
  - NIP-46 signer adapter
- `applesauce-accounts`
  - local dev/demo signer and account helpers
- `applesauce-actions`
  - optional custom action runner for the prepare / execute / claim / attest flows

Use a small, separate crypto utility layer for exact canonical detached-signature preimages, PMA/PMU/PMX validation, transition-id computation, and OTS verification.

## PoC shape

### Keep the dedicated demo app

Do **not** fork a full social client for v1.

Even with applesauce, the fastest and clearest route is still a dedicated demo app because:

- the feature set is narrow and protocol-heavy;
- the UI needs an evidence inspector and state visualizer;
- Path A and Path C must stay visibly separate;
- deterministic fixture playback matters more than social-client completeness.

### Use noStrudel as a reference, not as the base

Because noStrudel already uses applesauce and is designed to expose raw Nostr events, it is a good source of patterns and possibly reusable inspector UI.

But it is still broader than needed for the PoC, so a direct fork would likely slow down delivery unless you specifically want the result to look and behave like noStrudel.

## Updated architecture

```text
apps/
  demo-client/              # React + Vite + applesauce-react
  ots-helper/               # local helper for OTS stamp/upgrade/verify
packages/
  protocol-a/               # PMA / PMU / PMX codecs, validators, resolver
  protocol-c/               # STC / STA codecs, validators, resolver
  protocol-shared/          # canonical serialization, hex helpers, errors
  applesauce-adapters/      # EventStore / RelayPool / signers / loaders glue
  fixtures/                 # deterministic scenarios
```

## Applesauce-specific implementation plan

### Event ingestion

- Create a single `EventStore` per app session.
- Create a `RelayPool`.
- Attach `createEventLoaderForStore(eventStore, pool, options)`.
- For explicit evidence fetches, prefer focused loaders:
  - `createEventLoader(pool, { eventStore })`
  - `createAddressLoader(pool, { eventStore })`
- Add all raw events into the store and keep validation / resolution in protocol packages, not in the relay glue.

### React integration

- Wrap the app in `EventStoreProvider`.
- Use `use$` for reactive observables that are specific to the PoC.
- Use `useEventModel` only for standard models where it helps, e.g. profiles.
- Keep Path A and Path C state machines as pure functions outside React.

### Signing

Support three signer modes:

1. `applesauce-signers` NIP-07 signer
2. `applesauce-signers` NIP-46 signer
3. `applesauce-accounts` dev/local signer for fixtures and local demos only

The production-shaped onboarding and execute flows should prefer NIP-46.

### Publishing

Use one publish abstraction:

```ts
publish(event: NostrEvent, relays?: string[]): Promise<void>
```

Optionally wrap it with an applesauce `ActionRunner` so the core flows become explicit actions:

- `PrepareMigrationAction`
- `UpdateMigrationAuthorityAction`
- `ExecuteMigrationAction`
- `CreateSocialClaimAction`
- `SetSocialAttestationAction`

That keeps the flow code clean and makes it easier to test action inputs and outputs separately from the UI.

## Concrete demo-client recommendation

### UI sections

1. **Prepare account**
   - connect signer
   - generate migration key
   - export encrypted recovery bundle
   - publish `1776`
   - request / poll OTS confirmation
   - publish `1040`

2. **Execute migration**
   - connect migration key
   - generate or connect successor key
   - publish `1777`

3. **Social transition**
   - publish `1778`
   - publish / replace `31778`

4. **Evidence inspector**
   - raw events
   - validation results
   - resolver outputs
   - cached vs relay-fetched indication

5. **Scenario switcher**
   - load pre-seeded adversarial and happy-path fixtures

### Fastest implementation path

- React + Vite
- Applesauce packages listed above
- Minimal custom styling
- Local demo relay via Docker
- Optional link-out to a noStrudel instance for raw-event inspection, rather than embedding a full inspector at first

## Gaps and inconsistencies to fix

### A. Protocol A gaps

#### 1. Duplicate semantic PMA roots currently conflict

The draft treats multiple PMA roots at the same minimum anchor height as `conflicting_roots`.
That is correct for **different** migration authorities, but too strict for semantically equivalent duplicate roots.

**Fix:**
Before conflicting, normalize roots by effective authority payload:

- old pubkey
- migration pubkey
- minimum anchor height

If multiple valid roots have the same normalized payload, collapse them into one equivalence class.
Only conflict when there are multiple distinct normalized roots at the minimum anchor height.

#### 2. Duplicate semantic PMU updates currently conflict

The draft treats any forked PMU children from the same parent as `conflicting_authority_updates`.
That is too strict when the children all update to the **same** next migration key.

**Fix:**
Normalize PMU children by:

- previous authority id
- old pubkey
- current migration pubkey
- next migration pubkey

Collapse semantically equivalent children before fork detection.
Only conflict when more than one distinct next migration key remains.

#### 3. Anchor-height extraction needs a precise rule

The draft relies on `anchor_height`, but does not fully specify how an implementation extracts it from a verified `kind:1040` proof result.

**Fix:**
Add a normative appendix:

- the verifier must prove the target event id and kind;
- the verifier must expose at least one Bitcoin attestation;
- if multiple Bitcoin attestations exist, the minimum proven block height is used;
- if the verifier cannot determine a block height from the proof result, the proof is insufficient for this NIP.

#### 3b. PMA does not currently prove migration-key liveness

The root PMA names `M`, but unlike PMU and PMX it does not carry detached consent from the named key.
That means enrollment can succeed even if the user typoed `M`, exported the wrong backup, or never actually proved they still control that migration key.

**Fix options:**

- strict option: add a detached `ms` signature from `M` to PMA;
- pragmatic option: keep the wire format unchanged, but require onboarding tools to prove local control of `M` before publishing `1776` and to surface that as a local preflight check.

#### 4. Local pending state is missing from the implementation model

At the protocol level, an unstamped PMA is not valid yet. That is fine. But the implementation spec should explicitly model the local onboarding state before Bitcoin confirmation.

**Fix:**
Add local-only UI states:

- `draft_local`
- `published_pending_ots`
- `bitcoin_confirmed`

These are onboarding states, not protocol resolution states.

### B. Protocol C gaps

#### 5. STAs by `O` or `N` should not count as independent third-party support

The draft currently allows any attestor pubkey, including the old and new keys.
That is acceptable at the event level, but it should not count as independent social evidence.

**Fix:**
Keep such events valid, but require clients to surface them separately and exclude them from third-party support / oppose counts by default.

#### 6. Claim gating is currently stronger than it first appears

The minimal policy requires at least one valid `1778` claim before any social state becomes more than `none`.
That is internally consistent, but it should be stated more explicitly because it means attestations alone do not surface a transition.

**Fix:**
Document this as an intentional anti-spam rule.
If you do not want that behavior, Path C would need a different model.

#### 7. No explicit client rule for claim spam throttling

The draft says clients SHOULD de-emphasize unactioned claims, but the implementation spec should state how the demo handles spam.

**Fix:**
In the PoC:

- hide claims unless the viewed profile matches `o` or `n`, or
- the claim author is followed, or
- at least one followed attestor supports the same transition.

### C. Cross-spec / implementation gaps

#### 8. The implementation spec still hardcodes NDK

This is now obsolete.

**Fix:**
Replace the whole `packages/nostr-adapters` section with `packages/applesauce-adapters` and make `EventStore` + `RelayPool` + loaders the foundation.

#### 9. Test matrix is missing semantic-duplicate cases

The current test plan has conflict cases, but not semantic-equivalence cases.

**Fix:**
Add fixtures for:

- two PMAs with same `m` and same minimum anchor height;
- two PMUs with same `u` from the same parent;
- two PMXs with same `n`;
- STAs by `o` and `n` that should not count as third-party support.

#### 10. The publish / inspect loop should be deterministic and visible

Because applesauce is reactive and event-store based, the PoC should visibly distinguish:

- event created locally,
- event accepted into local store,
- event published to relay,
- event later reloaded from relay,
- event validated by protocol resolver.

This is not a protocol gap, but it is important for making the demo believable.

## Revised package contract

### `packages/applesauce-adapters`

Responsibilities:

- construct `EventStore` and `RelayPool`;
- attach event loaders to store;
- expose focused evidence fetch APIs;
- expose signer constructors / adapters;
- expose publish helpers;
- expose follow-list loading for Path C local policy.

Suggested exports:

```ts
export type DemoAppContext = {
  eventStore: EventStore;
  relayPool: RelayPool;
  publish: (event: NostrEvent, relays?: string[]) => Promise<void>;
};

export function createDemoAppContext(config: DemoConfig): DemoAppContext;
export function createEvidenceSubscriptions(ctx: DemoAppContext, oldPubkey: string, newPubkey?: string): EvidenceStreams;
export function createSignerAdapter(input: SignerConfig): Promise<SignerLike>;
export function loadViewerFollowSet(ctx: DemoAppContext, viewerPubkey: string): Promise<Set<string>>;
```

## Updated recommendation

- **Keep the protocol split exactly as drafted:** A and C independent, composed only in UI.
- **Replace NDK with applesauce throughout the implementation spec.**
- **Keep the dedicated demo app.**
- **Treat noStrudel as a reference / helper, not the base.**
- **Fix the 10 gaps above before calling the drafts bulletproof.**
