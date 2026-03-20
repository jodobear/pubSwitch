# NIP-XX: Prepared Migration

`draft` `optional`

**Status:** Draft  
**Author:** OpenAI draft for research  
**Created:** 2026-03-19  
**Requires:** NIP-01, NIP-03  
**Event kinds:** `1776`, `1777`, `1779`

## Summary

This NIP defines an opt-in, cryptographic, pre-arranged migration path for a Nostr identity.

It is intentionally **independent** from any social or Web-of-Trust transition protocol. A client MAY
display this protocol alongside social evidence, but it MUST validate this protocol on its own terms.

This NIP defines three regular event kinds:

- `kind:1776` — Prepared Migration Authority (`PMA`)
- `kind:1779` — Prepared Migration Authority Update (`PMU`)
- `kind:1777` — Prepared Migration Execution (`PMX`)

The authority-establishment and authority-update events are anchored using NIP-03 `kind:1040`
OpenTimestamps proofs. The migration execution event is not timestamped by this NIP.

## Motivation

Nostr identities are long-lived and socially meaningful, but ordinary keys are brittle:
losing or exposing a key can permanently sever continuity. This NIP provides a protocol-level
path for users who prepare in advance.

This NIP does **not** try to solve unprepared recovery. That is a separate problem.

## Non-goals

This NIP does not:

- define social legitimacy;
- define Web-of-Trust scoring;
- auto-migrate follows, petnames, or trust labels;
- protect historical encrypted content exposed by a compromised key;
- replace signer, vault, or bunker software.

## Terminology

- **Old key (`O`)**: the currently recognized Nostr identity key.
- **Migration key (`M`)**: an opt-in authority that can later authorize a transition away from `O`.
- **Successor key (`N`)**: the new Nostr identity key selected at execution time.
- **PMA**: Prepared Migration Authority, the root enrollment event.
- **PMU**: Prepared Migration Authority Update, a dual-authorized update of the migration authority.
- **PMX**: Prepared Migration Execution, a migration event signed by the active migration key.
- **Authority event**: either a valid PMA or a valid PMU.
- **Anchor height**: the minimum Bitcoin block height proven by one or more valid NIP-03 proofs for
  a given PMA or PMU.

## High-level design

1. `O` publishes a `kind:1776` PMA naming `M`.
2. The PMA receives at least one valid NIP-03 `kind:1040` proof.
3. Optionally, the authority may later be updated using one or more `kind:1779` PMU events.
4. When migration is needed, the active migration key publishes a `kind:1777` PMX naming `N`.
5. Clients resolve the active authority chain and then resolve the execution against that chain.

## Event kinds

### `kind:1776` Prepared Migration Authority (`PMA`)

A PMA establishes the initial migration authority for `O`.

#### Required properties

- `kind` MUST be `1776`.
- `pubkey` MUST be the old key `O`.
- `content` MUST be the empty string `""`.
- The event MUST contain exactly one `o` tag.
- The event MUST contain exactly one `m` tag.
- The event MUST contain no `e` tag.
- `o` MUST equal the event `pubkey`.
- `m` MUST be a 32-byte lowercase hex public key.
- `m` MUST NOT equal `o`.

#### Tags

- `["o", <old-pubkey>]`
- `["m", <migration-pubkey>]`
- optional `["alt", "Prepared Migration Authority"]`

#### Example

```json
{
  "kind": 1776,
  "pubkey": "<old-pubkey>",
  "content": "",
  "tags": [
    ["o", "<old-pubkey>"],
    ["m", "<migration-pubkey>"],
    ["alt", "Prepared Migration Authority"]
  ]
}
```

### `kind:1779` Prepared Migration Authority Update (`PMU`)

A PMU replaces the currently active migration key with a new migration key.

A PMU is signed by the **current** migration key and carries detached signatures from the old key
and the next migration key. It is also timestamped using NIP-03.

#### Required properties

- `kind` MUST be `1779`.
- `pubkey` MUST be the **current** migration key `M_prev`.
- `content` MUST be the empty string `""`.
- The event MUST contain exactly one `o` tag.
- The event MUST contain exactly one `e` tag that references the previous authority event.
- The event MUST contain exactly one `u` tag naming the next migration key `M_next`.
- The event MUST contain exactly one `os` tag.
- The event MUST contain exactly one `ns` tag.
- `o` MUST be a 32-byte lowercase hex pubkey.
- `u` MUST be a 32-byte lowercase hex pubkey.
- `u` MUST NOT equal `o`.
- `u` MUST NOT equal the event `pubkey`.

#### Tags

- `["o", <old-pubkey>]`
- `["e", <previous-authority-event-id>]`
- `["u", <next-migration-pubkey>]`
- `["os", <old-key-detached-signature-hex>]`
- `["ns", <next-migration-key-detached-signature-hex>]`
- optional `["alt", "Prepared Migration Authority Update"]`

#### Detached-signature preimage

`os` and `ns` MUST both sign the exact same canonical preimage.

The preimage array is:

```json
["NIP-XX", "prepared-migration-update", 1, "<old-pubkey>", "<previous-authority-event-id>", "<current-migration-pubkey>", "<next-migration-pubkey>", <created_at>]
```

The detached-signature message is produced as follows:

1. Serialize the array above as UTF-8 JSON with:
   - no whitespace,
   - strings exactly as shown,
   - lowercase hex pubkeys and ids,
   - integer `created_at` rendered as a JSON number.
2. Compute SHA-256 over the UTF-8 bytes.
3. Sign that 32-byte digest using BIP340 Schnorr over secp256k1.

The `os` signature MUST verify under the old key `O`.  
The `ns` signature MUST verify under the next migration key `M_next`.

#### Example

```json
{
  "kind": 1779,
  "pubkey": "<current-migration-pubkey>",
  "content": "",
  "tags": [
    ["o", "<old-pubkey>"],
    ["e", "<previous-authority-event-id>"],
    ["u", "<next-migration-pubkey>"],
    ["os", "<old-key-detached-signature-hex>"],
    ["ns", "<next-migration-key-detached-signature-hex>"],
    ["alt", "Prepared Migration Authority Update"]
  ]
}
```

### `kind:1777` Prepared Migration Execution (`PMX`)

A PMX performs the actual migration from `O` to `N`.

A PMX is signed by the currently active migration key and carries detached consent from `N`.
This proves that the successor key is live and under control at execution time.

#### Required properties

- `kind` MUST be `1777`.
- `pubkey` MUST be the currently active migration key.
- `content` MUST be the empty string `""`.
- The event MUST contain exactly one `o` tag.
- The event MUST contain exactly one `n` tag.
- The event MUST contain exactly one `e` tag that references the **active** authority event.
- The event MUST contain exactly one `ns` tag.
- `o` MUST be a 32-byte lowercase hex pubkey.
- `n` MUST be a 32-byte lowercase hex pubkey.
- `o` MUST NOT equal `n`.

#### Tags

- `["o", <old-pubkey>]`
- `["n", <new-pubkey>]`
- `["e", <active-authority-event-id>]`
- `["ns", <successor-key-consent-signature-hex>]`
- optional `["alt", "Prepared Migration Execution"]`

#### Detached-signature preimage

`ns` MUST sign the following canonical preimage:

```json
["NIP-XX", "prepared-migration-execution", 1, "<active-authority-event-id>", "<old-pubkey>", "<new-pubkey>", <created_at>]
```

The message is serialized, hashed, and signed exactly as described for PMU detached signatures.

The `ns` signature MUST verify under the successor key `N`.

#### Example

```json
{
  "kind": 1777,
  "pubkey": "<active-migration-pubkey>",
  "content": "",
  "tags": [
    ["o", "<old-pubkey>"],
    ["n", "<new-pubkey>"],
    ["e", "<active-authority-event-id>"],
    ["ns", "<successor-key-consent-signature-hex>"],
    ["alt", "Prepared Migration Execution"]
  ]
}
```

## NIP-03 timestamp requirement

A `kind:1776` PMA or `kind:1779` PMU is not valid for this NIP unless the client can verify at least
one valid NIP-03 `kind:1040` event that:

- references the event id using an `e` tag,
- references the target kind using a `k` tag,
- contains a full `.ots` proof in `content`,
- and proves at least one Bitcoin attestation.

Clients MUST reject "pending-only" or otherwise incomplete timestamp proofs.

Clients SHOULD record the minimum proven Bitcoin block height across all valid proofs for the authority
event. That minimum is the event's `anchor_height`.

## Validation

### Validate a PMA

A PMA is valid if and only if:

1. it satisfies all `kind:1776` field rules above;
2. its Nostr event signature verifies under `O`;
3. it has at least one valid NIP-03 proof;
4. all extracted `anchor_height` values are valid Bitcoin block heights.

### Validate a PMU

A PMU is valid if and only if:

1. it satisfies all `kind:1779` field rules above;
2. its Nostr event signature verifies under `M_prev`;
3. the referenced previous authority event is a valid authority event for the same `O`;
4. the event `pubkey` equals the migration key authorized by the referenced previous authority event;
5. the `os` detached signature verifies under `O`;
6. the `ns` detached signature verifies under `M_next`;
7. it has at least one valid NIP-03 proof.

### Validate a PMX

A PMX is valid if and only if:

1. it satisfies all `kind:1777` field rules above;
2. its Nostr event signature verifies under the active migration key;
3. the referenced authority event is the active authority event for `O`;
4. the `ns` detached signature verifies under `N`.

## Authority resolution

Clients MUST resolve authority using the following algorithm.

### Step 1: find valid PMA roots

Collect all valid PMA events authored by `O`.

- If none exist, the prepared-migration state is `none`.
- Otherwise compute each PMA's `anchor_height`.

### Step 2: choose canonical root

Let `min_h` be the minimum `anchor_height` among valid PMA roots.

- If exactly one valid PMA root has `anchor_height == min_h`, that root is the canonical root.
- If more than one valid PMA root has `anchor_height == min_h`, the prepared-migration state is
  `conflicting_roots`.

Later PMA roots with higher `anchor_height` do not override the canonical root.

### Step 3: walk PMU chain

Starting at the canonical root:

1. find all valid PMU events whose `e` tag references the current authority event id;
2. if zero exist, stop — the current event is the active authority;
3. if exactly one exists, advance to that PMU and repeat;
4. if more than one exists, the prepared-migration state is `conflicting_authority_updates`.

A PMU chain MUST be linear. Any fork is conflicting.

### Step 4: resolve active migration key

- If the active authority is a PMA, its active migration key is the `m` tag.
- If the active authority is a PMU, its active migration key is the `u` tag.

## Execution resolution

Once the active authority event has been resolved, clients MUST evaluate PMX events as follows.

1. Collect all valid PMX events whose `e` tag references the **active authority event id**.
2. Ignore all PMX events that reference stale authority events.
3. Group remaining valid PMX events by successor key `N`.

Resolution:

- If zero valid PMX events remain, the prepared-migration state is `prepared_enrolled`.
- If exactly one distinct successor key `N` remains, the prepared-migration state is
  `prepared_migrated`, and `N` is the successor.
- If more than one distinct successor key remains, the prepared-migration state is
  `conflicting_executions`.

Multiple PMX events pointing to the same `N` are not conflicting.

## Required client behavior

Clients implementing this NIP:

- MUST validate this protocol independently of any social-claim protocol.
- MUST NOT require social attestations to accept a valid `prepared_migrated` result.
- MUST treat `conflicting_roots`, `conflicting_authority_updates`, and `conflicting_executions`
  as unresolved conflict states.
- MUST NOT silently rewrite follows, petnames, trust labels, or local account mappings.
- SHOULD present explicit user actions such as:
  - follow successor,
  - follow both,
  - mute old key,
  - inspect evidence.
- SHOULD cache previously validated PMA, PMU, PMX, and NIP-03 proof objects locally.
- MUST NOT invalidate a previously validated PMA or PMU merely because:
  - a relay stops serving it,
  - a relay serves a deletion request,
  - or another relay fails to return it later.

## Required relay behavior

Relays do not need special logic beyond ordinary handling of regular and timestamp events.
This NIP makes no relay-enforceable claim about permanence.

## Security considerations

### What this NIP protects against

This NIP protects against loss or compromise of `O` **after** a canonical PMA has already been
timestamped on Bitcoin and while `M` remains uncompromised.

### What this NIP does not protect against

This NIP does not protect against:

- compromise of `O` before the canonical PMA is timestamped;
- compromise of both `O` and the currently active migration key;
- compromise of the successor key `N`;
- loss of historical confidentiality for messages encrypted to a compromised key.

### Same-block root ambiguity

If two or more valid PMA roots for the same `O` share the same minimum `anchor_height`,
this NIP treats the situation as `conflicting_roots`.

This is intentional. Clients MUST NOT try to break such ties using event id, `created_at`,
relay arrival time, or any other non-standard rule.

### Authority updates are high-stakes

A PMU changes who can later execute migration. Clients SHOULD present PMU publication to users
as a high-sensitivity action.

### Migration key hygiene

The migration key should be isolated from day-to-day posting. Implementations SHOULD prefer:
- dedicated signer or bunker flows;
- hardware-backed storage where available;
- or encrypted export formats such as NIP-49.

### Losing the migration key

If the user loses the currently active migration key before executing a migration or updating the
authority, this NIP provides no unilateral recovery path using the old key alone. This is an
intentional safety tradeoff: the old key by itself MUST NOT be able to replace the migration key,
otherwise old-key compromise after enrollment could silently replace the recovery authority.

## Appendix A: Reference evaluator states

Clients MAY expose the following machine states:

- `none`
- `conflicting_roots`
- `prepared_enrolled`
- `conflicting_authority_updates`
- `prepared_migrated`
- `conflicting_executions`

## Appendix B: Reference pseudocode

```ts
type PreparedState =
  | { kind: "none" }
  | { kind: "conflicting_roots"; rootIds: string[] }
  | { kind: "conflicting_authority_updates"; authorityId: string; childIds: string[] }
  | { kind: "prepared_enrolled"; authorityId: string; migrationPubkey: string }
  | { kind: "prepared_migrated"; authorityId: string; migrationPubkey: string; newPubkey: string; executionIds: string[] }
  | { kind: "conflicting_executions"; authorityId: string; migrationPubkey: string; newPubkeys: string[]; executionIds: string[] };

function resolvePreparedMigration(oldPubkey, events, otsProofs): PreparedState {
  const roots = validPmas(oldPubkey, events, otsProofs);
  if (roots.length === 0) return { kind: "none" };

  const minHeight = Math.min(...roots.map(r => r.anchorHeight));
  const earliestRoots = roots.filter(r => r.anchorHeight === minHeight);

  if (earliestRoots.length !== 1) {
    return { kind: "conflicting_roots", rootIds: earliestRoots.map(r => r.id) };
  }

  let authority = earliestRoots[0];

  while (true) {
    const children = validPmusReferencing(authority.id, events, otsProofs)
      .filter(pmu => pmu.oldPubkey === oldPubkey && pmu.currentMigrationPubkey === authority.migrationPubkey);

    if (children.length === 0) break;
    if (children.length > 1) {
      return {
        kind: "conflicting_authority_updates",
        authorityId: authority.id,
        childIds: children.map(x => x.id)
      };
    }

    authority = children[0];
  }

  const executions = validPmxsReferencing(authority.id, events)
    .filter(pmx => pmx.oldPubkey === oldPubkey && pmx.migrationPubkey === authority.migrationPubkey);

  const byNew = new Map<string, string[]>();
  for (const pmx of executions) {
    const arr = byNew.get(pmx.newPubkey) || [];
    arr.push(pmx.id);
    byNew.set(pmx.newPubkey, arr);
  }

  if (byNew.size === 0) {
    return {
      kind: "prepared_enrolled",
      authorityId: authority.id,
      migrationPubkey: authority.migrationPubkey
    };
  }

  if (byNew.size === 1) {
    const [[newPubkey, ids]] = [...byNew.entries()];
    return {
      kind: "prepared_migrated",
      authorityId: authority.id,
      migrationPubkey: authority.migrationPubkey,
      newPubkey,
      executionIds: ids
    };
  }

  return {
    kind: "conflicting_executions",
    authorityId: authority.id,
    migrationPubkey: authority.migrationPubkey,
    newPubkeys: [...byNew.keys()],
    executionIds: executions.map(x => x.id)
  };
}
```
