# NIP-XY: Social Transition Claims and Attestations

`draft` `optional`

**Status:** Draft  
**Author:** OpenAI draft for research  
**Created:** 2026-03-19  
**Requires:** NIP-01  
**Event kinds:** `1778`, `31778`

## Summary

This NIP defines a social, machine-readable way to express that one Nostr identity key is believed
to have transitioned to another.

It is intentionally **independent** from any cryptographic prepared-migration protocol. A client MAY
display this protocol alongside prepared migration evidence, but it MUST validate this protocol on
its own terms.

This NIP defines:

- `kind:1778` — Social Transition Claim (`STC`)
- `kind:31778` — Social Transition Attestation (`STA`)

`kind:31778` is addressable and intentionally keeps only the attestor's latest stance for a given
transition identifier. This NIP explicitly accepts the tradeoff that public stance history may be
lost in exchange for a cleaner current-state model.

## Motivation

Identity continuity on Nostr is partly social. Users often learn about migrations through reposts,
follow-list changes, profile notes, conversations, or out-of-band confirmation. This NIP creates a
machine-readable substrate for that social process without pretending that it is cryptographic proof.

## Non-goals

This NIP does not:

- define cryptographic recovery;
- auto-migrate follows, petnames, or trust labels;
- define a universal trust-score algorithm;
- define relay-side enforcement;
- override prepared-migration results from another protocol.

## Terminology

- **Old key (`O`)**: the previously recognized identity key.
- **New key (`N`)**: the proposed successor identity key.
- **Transition ID (`T`)**: a deterministic identifier for the pair `(O, N)`.
- **Claim**: an immutable statement by `O` or `N` that the transition exists.
- **Attestation**: a mutable social stance by some attestor about the transition.

## Transition ID

The transition id `T` is the lowercase hex SHA-256 digest of the following byte sequence:

```text
UTF8("nostr-social-transition:v1") || 0x00 || <32 raw bytes of O> || 0x00 || <32 raw bytes of N>
```

Where:

- `O` and `N` are the binary 32-byte pubkeys corresponding to the lowercase hex strings in the event tags;
- `0x00` is a literal single zero byte.

Clients MUST recompute `T` from `O` and `N` and MUST reject any event whose `d` tag does not match.

## Event kinds

### `kind:1778` Social Transition Claim (`STC`)

A Social Transition Claim is an immutable statement made by either the old key or the new key.

#### Required properties

- `kind` MUST be `1778`.
- `content` MAY be empty or plaintext.
- The event MUST contain exactly one `d` tag.
- The event MUST contain exactly one `o` tag.
- The event MUST contain exactly one `n` tag.
- The event MUST contain exactly one `r` tag.
- `o` MUST be a 32-byte lowercase hex pubkey.
- `n` MUST be a 32-byte lowercase hex pubkey.
- `o` MUST NOT equal `n`.
- `d` MUST equal the deterministic transition id computed from `o` and `n`.
- `r` MUST be either `"old"` or `"new"`.

#### Signer-role rule

- If `r == "old"`, the event `pubkey` MUST equal `o`.
- If `r == "new"`, the event `pubkey` MUST equal `n`.

Claims authored by any other key are invalid for this NIP.

#### Tags

- `["d", <transition-id>]`
- `["o", <old-pubkey>]`
- `["n", <new-pubkey>]`
- `["r", "old" | "new"]`
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
    ["r", "new"],
    ["alt", "Social Transition Claim"]
  ]
}
```

### `kind:31778` Social Transition Attestation (`STA`)

A Social Transition Attestation expresses an attestor's current stance toward a transition id.

This event is addressable by `(kind, pubkey, d)`.

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

- An STA MAY contain one `m` tag indicating how the attestor verified the transition.
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
3. the `r` tag is consistent with the event `pubkey`;
4. its `d` tag matches the computed transition id.

### Validate an STA

An STA is valid if and only if:

1. it satisfies all `kind:31778` field rules above;
2. its Nostr event signature verifies under the event `pubkey`;
3. its `d` tag matches the computed transition id;
4. if it contains one or more `e` tags, every referenced event used by the client is a valid `kind:1778`
   event with the same `d`, `o`, and `n`.

## Addressable semantics

For a given attestor pubkey `A` and transition id `T`, only the latest valid `kind:31778` event
for `(31778, A, T)` is the attestor's live stance.

Clients MUST treat older attestation versions as superseded when a newer valid version with the
same `(kind, pubkey, d)` exists.

This NIP explicitly accepts the tradeoff that public stance history may be incomplete.

## Required client behavior

Clients implementing this NIP:

- MUST validate this protocol independently of any prepared-migration protocol.
- MUST NOT treat a lone STC as cryptographic proof of identity continuity.
- MUST NOT let an STA veto or invalidate a valid prepared-migration result from another protocol.
- MUST evaluate STC and STA objects using local policy, local follows, local trust graph, or
  user-selected assertion providers.
- SHOULD expose clear local states such as:
  - no claim,
  - claimed,
  - socially supported,
  - socially opposed,
  - socially split.
- SHOULD reveal raw evidence on demand:
  - claim events,
  - attestation events,
  - authors,
  - optional methods,
  - optional referenced claims.
- SHOULD de-emphasize or hide unactioned claims unless at least one of the following is true:
  - the user explicitly opened the old or new profile;
  - the claim author is already followed or trusted locally;
  - or the transition has local support according to client policy.
- MUST NOT silently rewrite follows, petnames, or local trust labels.

## Minimal interoperable local policy

The scoring model is intentionally left to clients, but the following local policy is recommended
as the minimal interoperable baseline:

1. `claimed` if at least one valid STC exists for transition `T`;
2. `socially_supported` if `claimed` and at least one currently followed pubkey publishes a live
   `support` STA for `T`;
3. `socially_opposed` if `claimed` and at least one currently followed pubkey publishes a live
   `oppose` STA for `T` and no currently followed pubkey publishes `support`;
4. `socially_split` if `claimed` and the user's currently followed pubkeys include both a live
   `support` and a live `oppose` STA for `T`.

Clients MAY use richer policies, including:
- second-degree graph weighting,
- mute-aware filtering,
- user-selected NIP-85 providers,
- or specialized WoT services.

## Required relay behavior

Relays do not need special logic beyond ordinary handling of regular and addressable events.

## Security considerations

### This protocol is social, not cryptographic

A claim or attestation can be honest, mistaken, malicious, coordinated, or coerced.
Clients MUST NOT treat this protocol as cryptographic proof of control.

### A compromised old key can still claim

If the old key is compromised, the attacker can author an STC with `r == "old"`.
That is expected. This protocol relies on local social interpretation, not on the old key being
intrinsically trustworthy.

### A compromised new key can also claim

If the new key is controlled by an attacker, it can author an STC with `r == "new"`.
Again, this protocol does not make such a claim authoritative by itself.

### Attestations can be noisy or adversarial

Attestation floods, clique amplification, and mistaken endorsements are all possible.
Clients SHOULD prefer local trust relationships and SHOULD present evidence rather than certainty.

### Latest-state tradeoff is intentional

Because STAs are addressable, the public record may not preserve every historic stance.
This NIP explicitly accepts that tradeoff.

## Appendix A: Reference helper functions

```ts
function computeTransitionId(oldPubkeyHex: string, newPubkeyHex: string): string
function validateSocialTransitionClaim(event): ValidatedClaim | Invalid
function validateSocialTransitionAttestation(event): ValidatedAttestation | Invalid
```

## Appendix B: Reference pseudocode

```ts
type SocialState =
  | { kind: "none" }
  | { kind: "claimed"; claimIds: string[] }
  | { kind: "socially_supported"; claimIds: string[]; supportPubkeys: string[] }
  | { kind: "socially_opposed"; claimIds: string[]; opposePubkeys: string[] }
  | { kind: "socially_split"; claimIds: string[]; supportPubkeys: string[]; opposePubkeys: string[] };

function resolveSocialTransition(
  viewerFollowSet: Set<string>,
  allClaims: ValidatedClaim[],
  allAttestations: ValidatedAttestation[],
  oldPubkey: string,
  newPubkey: string
): SocialState {
  const tid = computeTransitionId(oldPubkey, newPubkey);

  const claims = allClaims.filter(c => c.transitionId === tid);
  if (claims.length === 0) return { kind: "none" };

  const live = latestPerAttestorAndTransition(allAttestations.filter(a => a.transitionId === tid));

  const supports = live
    .filter(a => a.stance === "support" && viewerFollowSet.has(a.attestorPubkey))
    .map(a => a.attestorPubkey);

  const opposes = live
    .filter(a => a.stance === "oppose" && viewerFollowSet.has(a.attestorPubkey))
    .map(a => a.attestorPubkey);

  if (supports.length > 0 && opposes.length > 0) {
    return {
      kind: "socially_split",
      claimIds: claims.map(c => c.id),
      supportPubkeys: supports,
      opposePubkeys: opposes
    };
  }

  if (supports.length > 0) {
    return {
      kind: "socially_supported",
      claimIds: claims.map(c => c.id),
      supportPubkeys: supports
    };
  }

  if (opposes.length > 0) {
    return {
      kind: "socially_opposed",
      claimIds: claims.map(c => c.id),
      opposePubkeys: opposes
    };
  }

  return { kind: "claimed", claimIds: claims.map(c => c.id) };
}
```
