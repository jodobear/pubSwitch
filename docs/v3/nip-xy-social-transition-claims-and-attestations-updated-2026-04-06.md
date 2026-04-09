# NIP-XY: Social Transition Claims and Attestations

`draft` `optional`

**Status:** Draft  
**Author:** OpenAI draft for research  
**Created:** 2026-04-06  
**Requires:** NIP-01  
**Event kinds:** `1778`, `31778`

## Summary

This NIP defines a machine-readable social protocol for expressing that one Nostr identity key is
believed to have transitioned to another.

It standardizes:

- an immutable Social Transition Claim (`kind:1778`);
- a latest-state Social Transition Attestation (`kind:31778`).

This NIP is intentionally **independent** from any cryptographic prepared-migration protocol.
Clients MAY display this protocol alongside prepared migration evidence, but they MUST validate this
protocol on its own terms.

This NIP standardizes **claims and social evidence, not truth**. It does not create an
authoritative key-rotation mechanism and it does not attempt to conclusively determine human
identity continuity after compromise.

## Goals

This NIP aims to provide:

1. a small, interoperable claim object for an `(old, new)` transition;
2. a small, interoperable latest-state social attestation object for that transition;
3. client-readable social evidence that remains independent from cryptographic migration protocols;
4. space for observer-dependent interpretation without forcing a universal scoring system.

## Non-goals

This NIP does not:

- define cryptographic recovery or prepared migration;
- define a universal trust-score algorithm;
- auto-migrate follows, petnames, trust labels, or account mappings;
- force relays to preserve full stance history;
- invalidate or override a valid Prepared Migration result from another protocol.

## Independence from prepared migration protocols

Social Transition Claims and Attestations are complete on their own.

Clients implementing this NIP:

- MUST validate this protocol without requiring PMA / PMU / PMX / OTS objects;
- MUST NOT let a Social Transition object invalidate a valid Prepared Migration result;
- MAY present both protocols together when they concern the same `(O, N)` pair.

## Terminology

- **Old key (`O`)**: the previously recognized identity key.
- **New key (`N`)**: the proposed successor identity key.
- **Transition ID (`T`)**: a deterministic identifier for the pair `(O, N)`.
- **STC**: Social Transition Claim, an immutable statement by `O` or `N` that the transition exists.
- **STA**: Social Transition Attestation, a mutable latest stance by an observer about that
  transition.
- **Self-assertion**: an STC or STA authored by `O` or `N`.
- **Third-party attestation**: an STA authored by any pubkey other than `O` or `N`.

## Transition ID

The transition id `T` is the lowercase hex SHA-256 digest of the following byte sequence:

```text
UTF8("nostr-social-transition:v1") || 0x00 || <32 raw bytes of O> || 0x00 || <32 raw bytes of N>
```

Where:

- `O` and `N` are the binary 32-byte pubkeys corresponding to the lowercase hex strings in the event tags;
- `0x00` is a literal single zero byte.

Clients MUST recompute `T` from `O` and `N` and MUST reject any event whose `d` tag does not
match.

## Event kinds

### `kind:1778` Social Transition Claim (`STC`)

An STC is an immutable statement made by either the old key or the new key.

This is a **regular**, immutable event.

#### Required properties

- `kind` MUST be `1778`.
- `content` MAY be empty or plaintext.
- The event MUST contain exactly one `d` tag.
- The event MUST contain exactly one `o` tag.
- The event MUST contain exactly one `n` tag.
- `o` MUST be a 32-byte lowercase hex pubkey.
- `n` MUST be a 32-byte lowercase hex pubkey.
- `o` MUST NOT equal `n`.
- `d` MUST equal the deterministic transition id computed from `o` and `n`.
- the event `pubkey` MUST equal either `o` or `n`.

Claims authored by any other key are invalid for this NIP.

#### Tags

- `["d", <transition-id>]`
- `["o", <old-pubkey>]`
- `["n", <new-pubkey>]`
- optional `["alt", "Social Transition Claim"]`

#### Example

```json
{
  "kind": 1778,
  "pubkey": "<new-pubkey>",
  "content": "my old key was lost; this is my new key",
  "tags": [
    ["d", "<transition-id>"],
    ["o", "<old-pubkey>"],
    ["n", "<new-pubkey>"],
    ["alt", "Social Transition Claim"]
  ]
}
```

### `kind:31778` Social Transition Attestation (`STA`)

An STA expresses an observer's current stance toward a transition.

This event is **addressable** by `(kind, pubkey, d)` and intentionally keeps only the latest stance
for that tuple.

This NIP explicitly accepts the tradeoff that public stance history may be incomplete in exchange
for a cleaner current-state model.

#### Required properties

- `kind` MUST be `31778`.
- `content` MAY be empty or plaintext.
- The event MUST contain exactly one `d` tag.
- The event MUST contain exactly one `o` tag.
- The event MUST contain exactly one `n` tag.
- The event MUST contain exactly one `s` tag.
- `o` MUST be a 32-byte lowercase hex pubkey.
- `n` MUST be a 32-byte lowercase hex pubkey.
- `o` MUST NOT equal `n`.
- `d` MUST equal the deterministic transition id computed from `o` and `n`.
- `s` MUST be one of:
  - `"support"`
  - `"oppose"`
  - `"uncertain"`

#### Optional properties

- An STA MAY contain one `m` tag indicating how the attestor claims to have verified the transition.
- An STA MAY contain one or more `e` tags referencing `kind:1778` claim events whose `d` matches
  the same transition id.

If an `m` tag is present, its value SHOULD be one of:

- `in_person`
- `video`
- `voice`
- `website`
- `nip05`
- `chat`
- `other`

#### Tags

- `["d", <transition-id>]`
- `["o", <old-pubkey>]`
- `["n", <new-pubkey>]`
- `["s", "support" | "oppose" | "uncertain"]`
- optional `["m", <method>]`
- optional `["e", <claim-event-id>]`
- optional `["alt", "Social Transition Attestation"]`

#### Example

```json
{
  "kind": 31778,
  "pubkey": "<attestor-pubkey>",
  "content": "I verified this over video",
  "tags": [
    ["d", "<transition-id>"],
    ["o", "<old-pubkey>"],
    ["n", "<new-pubkey>"],
    ["s", "support"],
    ["m", "video"],
    ["e", "<claim-event-id>"],
    ["alt", "Social Transition Attestation"]
  ]
}
```

## Validation

### Validate an STC

An STC is valid if and only if:

1. it satisfies all `kind:1778` field rules above;
2. its Nostr event signature verifies under the event `pubkey`;
3. the event `pubkey` equals either `o` or `n`;
4. its `d` tag matches the computed transition id.

### Validate an STA

An STA is valid if and only if:

1. it satisfies all `kind:31778` field rules above;
2. its Nostr event signature verifies under the event `pubkey`;
3. its `d` tag matches the computed transition id;
4. if it contains one or more `e` tags used by the client, every referenced event is a valid
   `kind:1778` claim with the same `d`, `o`, and `n`.

## Addressable semantics

For a given attestor pubkey `A` and transition id `T`, only the latest valid `kind:31778` event
for `(31778, A, T)` is the attestor's live stance.

Clients MUST treat older attestation versions as superseded when a newer valid version with the
same `(kind, pubkey, d)` exists.

When two valid STAs for the same `(kind, pubkey, d)` share the same `created_at`, clients SHOULD
apply the normal NIP-01 convention for replaceable/addressable events and retain the event with the
lowest id (first in lexical order).

## Discovery and query strategy

Clients interested in Social Transition for old key `O` SHOULD query at minimum:

1. STCs by old key:
   - `{"kinds": [1778], "#o": [O]}`
2. Optionally, STCs by new key when a candidate `N` is already known:
   - `{"kinds": [1778], "#n": [N]}`
3. Once one or more candidate `(O, N)` pairs are known, STAs by transition id:
   - `{"kinds": [31778], "#d": [<transition-id>...]}`

Clients MAY also issue broader exploratory queries, but the interoperable discovery surface of this
NIP is `#o`, `#n`, and `#d`.

## Minimal interoperable local policy

This NIP intentionally leaves final social evaluation to local policy, but the following baseline is
recommended for interoperable behavior:

1. `claimed` if at least one valid STC exists for transition `T`;
2. `socially_supported` if `claimed` and at least one currently followed or otherwise locally trusted
   **third-party** pubkey publishes a live `support` STA for `T`;
3. `socially_opposed` if `claimed`, no currently followed or trusted third-party pubkey publishes
   `support`, and at least one currently followed or trusted third-party pubkey publishes `oppose`;
4. `socially_split` if `claimed` and the viewer's followed or trusted third-party pubkeys include
   both live `support` and live `oppose` STAs.

### Self-assertions

STCs authored by `O` or `N` are valid and important.  
STAs authored by `O` or `N` are also valid, but clients SHOULD treat them as **self-assertions**
rather than third-party corroboration.

By default:

- STAs by `O` or `N` SHOULD be shown separately;
- STAs by `O` or `N` SHOULD NOT count toward third-party support or opposition totals.

Clients MAY layer richer policies on top of this baseline, including:

- second-degree graph weighting,
- mute-aware filtering,
- user-selected NIP-85 providers,
- or specialized WoT services.

## Required client behavior

Clients implementing this NIP:

- MUST validate this protocol independently of any Prepared Migration protocol;
- MUST NOT treat a lone STC or STA as cryptographic proof of identity continuity;
- MUST NOT let an STA veto or invalidate a valid Prepared Migration result from another protocol;
- MUST evaluate STC and STA objects using local policy, local follows, local trust graph, or
  user-selected assertion providers;
- SHOULD expose clear local states such as:
  - no signal,
  - claimed,
  - socially supported,
  - socially opposed,
  - socially split;
- SHOULD reveal raw evidence on demand:
  - claim events,
  - attestation events,
  - authors,
  - optional methods,
  - optional referenced claims;
- SHOULD de-emphasize or hide unactioned claims unless at least one of the following is true:
  - the viewer explicitly opened the old or new profile;
  - the claim author is already followed or trusted locally;
  - or the transition has local support according to client policy;
- MUST NOT silently rewrite follows, petnames, trust labels, or local account mappings.

## Supplementary continuity evidence (non-normative)

The interoperable machine-readable social artifacts of this NIP are **STC** and **STA**.

Clients MAY additionally display supplementary evidence, including:

- reactions, reposts, or replies about the transition;
- follow-list changes or follow-list context;
- profile text continuity;
- NIP-05 continuity;
- timestamps or archived copies of relevant events;
- generic continuity-checkpoint artifacts defined by other drafts;
- user-selected assertion-provider outputs.

These signals MAY help users interpret a transition, but they are not part of this NIP's validation
rules.

## Security considerations

### This protocol is social, not cryptographic

A claim or attestation can be honest, mistaken, malicious, coordinated, coerced, or incomplete.
Clients MUST NOT treat this NIP as cryptographic proof of control.

### The old key can claim

If `O` is compromised, an attacker can author an STC as `O`.
That is expected. This NIP standardizes the claim; it does not make the claim authoritative.

### The new key can also claim

If `N` is controlled by an attacker, it can author an STC as `N`.
Again, this NIP does not make such a claim authoritative by itself.

### Social attestations can be noisy or adversarial

Attestation floods, clique amplification, coercion, and mistaken endorsements are all possible.
Clients SHOULD prefer local trust relationships and SHOULD present evidence rather than certainty.

### Latest-state tradeoff is intentional

Because STAs are addressable, the public record may not preserve every historic stance.
This NIP explicitly accepts that tradeoff in favor of a cleaner current-state model.

### Self-assertion is not third-party corroboration

This NIP treats self-authored claims and self-authored attestations as useful evidence, but not as
independent social confirmation.

## Appendix A: Reference helper functions

```ts
function computeTransitionId(oldPubkeyHex: string, newPubkeyHex: string): string
function validateSocialTransitionClaim(event: NostrEvent): ValidatedClaim | Invalid
function validateSocialTransitionAttestation(event: NostrEvent): ValidatedAttestation | Invalid
```

## Appendix B: Reference pseudocode

```ts
type SocialState =
  | { kind: "none" }
  | { kind: "claimed"; claimIds: string[]; selfAssertionPubkeys: string[] }
  | { kind: "socially_supported"; claimIds: string[]; supportPubkeys: string[]; selfAssertionPubkeys: string[] }
  | { kind: "socially_opposed"; claimIds: string[]; opposePubkeys: string[]; selfAssertionPubkeys: string[] }
  | { kind: "socially_split"; claimIds: string[]; supportPubkeys: string[]; opposePubkeys: string[]; selfAssertionPubkeys: string[] };

function resolveSocialTransition(
  viewerFollowSet: Set<string>,
  allClaims: ValidatedClaim[],
  allAttestations: ValidatedAttestation[],
  oldPubkey: string,
  newPubkey: string,
): SocialState {
  const transitionId = computeTransitionId(oldPubkey, newPubkey);

  const claims = allClaims.filter(c =>
    c.transitionId === transitionId &&
    c.oldPubkey === oldPubkey &&
    c.newPubkey === newPubkey
  );

  if (claims.length === 0) return { kind: "none" };

  const liveAttestations = latestByAttestorAndTransition(
    allAttestations.filter(a =>
      a.transitionId === transitionId &&
      a.oldPubkey === oldPubkey &&
      a.newPubkey === newPubkey
    )
  );

  const selfAssertions = liveAttestations
    .filter(a => a.authorPubkey === oldPubkey || a.authorPubkey === newPubkey)
    .map(a => a.authorPubkey);

  const thirdParty = liveAttestations.filter(a =>
    a.authorPubkey !== oldPubkey &&
    a.authorPubkey !== newPubkey &&
    viewerFollowSet.has(a.authorPubkey)
  );

  const supportPubkeys = thirdParty.filter(a => a.stance === "support").map(a => a.authorPubkey);
  const opposePubkeys = thirdParty.filter(a => a.stance === "oppose").map(a => a.authorPubkey);

  if (supportPubkeys.length > 0 && opposePubkeys.length > 0) {
    return {
      kind: "socially_split",
      claimIds: claims.map(c => c.id),
      supportPubkeys,
      opposePubkeys,
      selfAssertionPubkeys: selfAssertions,
    };
  }

  if (supportPubkeys.length > 0) {
    return {
      kind: "socially_supported",
      claimIds: claims.map(c => c.id),
      supportPubkeys,
      selfAssertionPubkeys: selfAssertions,
    };
  }

  if (opposePubkeys.length > 0) {
    return {
      kind: "socially_opposed",
      claimIds: claims.map(c => c.id),
      opposePubkeys,
      selfAssertionPubkeys: selfAssertions,
    };
  }

  return {
    kind: "claimed",
    claimIds: claims.map(c => c.id),
    selfAssertionPubkeys: selfAssertions,
  };
}
```
