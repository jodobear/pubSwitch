---
title: Proposal And Research Review
doc_type: research
status: active
owner: tack
canonical: true
---

# Proposal And Research Review

## Overall Judgment

The draft docs are strong enough to start a PoC.

They are not yet strong enough to treat as submission-ready or to harden into a production
implementation without more interoperability and protocol-shape clarification.

## What Looks Good

- Path A and Path C are explicitly separated
- detached-signature preimages are concrete
- query/index strategy is already considered
- the applesauce-based PoC shape is pragmatic and fast
- the existing gap review is already identifying the right kinds of implementation risks

## Main Risks In The Current Drafts

### 1. PMA liveness is underspecified

The root PMA names a migration key, but does not itself prove that the named migration key was live
and controlled at enrollment time.

PoC implication:

- keep the current wire shape for now
- require onboarding tools to prove local control of the migration key before publishing
- record this as a likely future protocol decision, not as hidden app behavior

### 2. OTS is protocol-useful but operationally slow

NIP-03 confirms that `kind:1040` carries a full `.ots` proof for a referenced event and that the
proof must contain at least one Bitcoin attestation. That is good protocol evidence, but it also
means live demos need explicit pending states and fixture-backed verified proofs.

PoC implication:

- model `draft_local`, `published_pending_ots`, and `bitcoin_confirmed`
- allow fixture injection for verified proofs in early demos

### 3. PMU and PMX need vector-grade interoperability detail

The detached-signature preimages are readable, but cross-client interoperability will still depend
on exact canonical JSON and signing conventions.

PoC implication:

- freeze one canonical serializer in `protocol-shared`
- add explicit fixtures before claiming interoperability confidence

### 4. Path C needs stronger display policy wording

The social layer should stay machine-readable but visibly non-authoritative compared to Path A.
Attestations by the old or new key should not count as independent third-party support.

PoC implication:

- keep such events valid
- surface them separately in the resolver/UI

### 5. Addressable semantics must stay explicit

`kind:31778` behaves like a parameterized replaceable event keyed by `(kind, pubkey, d)`.

PoC implication:

- resolver and fetch logic should treat it that way from day one
- the UI should show superseded versus live attestation state clearly

## External Reference Checks

### NIP-03

Relevant confirmation:

- `kind:1040` is the OpenTimestamps event
- it references a target event with an `e` tag
- it carries the full `.ots` proof in `content`
- a Bitcoin attestation is required for meaningful proof

### NIP-07 and NIP-46

Relevant confirmation:

- browser signing and remote signing are both standard Nostr signer paths
- keeping both in scope is reasonable for a demo, with dev-local signing only for fixtures and local
  testing

### Applesauce

Relevant confirmation from the public docs:

- `EventStore` is the in-memory event database
- `RelayPool` and the loaders fit targeted evidence fetching
- `EventStoreProvider`, `use$`, and `useEventModel` fit a small reactive demo app

PoC implication:

- keep Applesauce at the app and reactivity layer
- do not assume Applesauce itself is the source of truth for OpenTimestamps verification
- it may still be enough directly or transitively for Schnorr verification plumbing

### OpenTimestamps

Operational observation:

- live Bitcoin anchoring exists and is active, but it is inherently asynchronous
- a demo must not pretend that OTS confirmation is immediate

PoC implication:

- remote calendars or services may help with proof production and proof upgrade
- the demo should prefer local proof verification before claiming Bitcoin-confirmed status
- helper or CLI integration is the right place for real OTS verification if the app stack does not
  already provide it

## PoC Freeze Recommendation

Build the first demo around:

- pure `protocol-shared`
- pure `protocol-a`
- optional but visible `protocol-c`
- fixture-first evidence playback
- applesauce-based demo-client

Do not wait for full standards polish before implementation starts.

## Agreed PoC Decisions

These are PoC implementation decisions. They do not edit the draft NIP texts.

### 1. PMA liveness

- keep the current PMA wire shape for the PoC
- require the app to prove local control of the migration key before publishing a PMA
- treat this as local onboarding policy, not protocol proof

### 2. OTS demo posture

- use real NIP-03 / `1040` proofs
- prepare multiple proof-backed demo scenarios ahead of time
- explicitly model:
  - `draft_local`
  - `published_pending_ots`
  - `bitcoin_confirmed`
- pending OTS means the authority is not yet valid for Path A resolution

### 3. Duplicate normalization

- normalize semantic duplicate PMA roots before conflict detection
- normalize semantic duplicate PMU updates before fork/conflict detection
- only surface conflict when distinct effective authority states remain

### 4. Detached-signature canonicalization

- the PoC uses one exact canonical serializer for detached-signature preimages
- all fixtures and tests must be generated from that one path
- later interop work can add vectors, but the PoC should not support multiple serializer variants

### 5. Path A and Path C presentation

- keep Path A and Path C separate in logic and UI
- Path A represents cryptographic continuity
- Path C represents social continuity
- Path C may support or contextualize Path A, but must not silently replace Path A logic

### 6. Path C independence

- Path C is a valid independent mechanism
- it does not depend on Path A
- a valid Path C state may exist even when there is no Path A evidence
- combined `A + C` is stronger context, but `C-only` must remain a real state

### 7. Encrypted recovery bundle

- in scope for the PoC
- does not need production-grade vault hardening
- does need to work end-to-end:
  - create migration material
  - encrypt with passphrase
  - export
  - import
  - decrypt
  - use restored migration key in execution flow

### 8. Verification trust model

- real Schnorr verification is in scope for the PoC
- remote OTS services may assist with proof production or upgrade, but should not be the final
  trust root for demo truth
- local verification should determine whether the PoC says a proof is Bitcoin-confirmed
- unless an existing app-layer dependency proves sufficient, real OTS verification belongs in the
  helper layer rather than the pure protocol packages

## Path C PoC Notes

### STC and STA roles

- `1778` STC is a first-party claim by the old or new key
- `31778` STA is a social stance by an attestor
- the PoC should present these as different evidence classes

### Path C state model for the PoC

Recommended visible states:

- no Path C evidence
- claim by old key only
- claim by new key only
- claims by both old and new keys
- socially supported
- socially opposed
- socially split

### Path C support counting

- STAs by the old key or new key are valid events
- but they should not count as independent third-party support or opposition
- they should be displayed separately as self-asserted support/opposition context

## Path C Anti-Noise Posture

Path C is not easy to forge, but it is easy to spam.

The PoC should therefore:

- resolve Path C only in the context of a viewed old key, new key, or known transition pair
- validate `1778` strictly before display:
  - signer role
  - recomputed transition id
  - key/tag consistency
- hide low-trust claims by default unless at least one of these is true:
  - the viewed profile matches `o` or `n`
  - the claim author is followed or locally trusted
  - the transition also has followed-attestor support
- keep invalid claims out of the main UX
- keep raw noisy evidence inspectable on demand, not foregrounded
- cap visible candidate transitions per viewed profile in the main UI

This is a PoC display/fetch posture, not a full anti-spam system.

## Simple Threat Table

| Threat | What succeeds | What fails | PoC mitigation |
| --- | --- | --- | --- |
| bogus `1778` spam using random pairs | network/query noise | valid first-party claim for someone else's keys | narrow fetches, strict validation, hide low-trust claims |
| attacker publishes many STAs for one transition | noisy social surface | cryptographic proof replacement | keep Path C separate from Path A; show attestor set explicitly |
| old/new key self-attests to boost confidence | self-assertion | independent third-party support | display separately; exclude from third-party counts |
| duplicate semantic PMA/PMU events | extra event volume | true fork proof by itself | normalize semantic duplicates first |
| detached-signature serializer mismatch | local implementation drift | cross-implementation confidence | one canonical serializer and fixture corpus |
| pending OTS presented as valid | misleading UX | actual confirmed anchor | explicit pending state; only confirmed proofs count |
| stolen old key publishes fraudulent Path C claim | false first-party social signal | Path A cryptographic prepared migration if attacker lacks migration key | keep Path C advisory; surface source and raw evidence |
| user loses migration bundle | failed recovery UX | protocol concept itself | encrypted recovery bundle export/import in demo |

## Recommended First Implementation Order

1. shared canonicalization, hashing, hex, tag helpers
2. Path A builders and validators
3. Path A resolver with duplicate normalization rules
4. fixture scenarios for happy path and one conflict path
5. demo-client shell that can render raw events, validation, and resolver state
6. Path C after Path A is demoable
