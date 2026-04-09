# NIP-XX: Prepared Migration

`draft` `optional`

**Status:** Draft  
**Author:** OpenAI draft for research  
**Created:** 2026-04-06  
**Requires:** NIP-01, NIP-03  
**Event kinds:** `1776`, `1777`, `1779`

## Summary

This NIP defines an opt-in protocol for **prepared cryptographic migration** of a Nostr identity.

It standardizes:

- an immutable root enrollment event,
- an optional immutable migration-authority update event,
- an immutable migration execution event,
- and a deterministic client-side resolution algorithm.

This NIP is intentionally **independent** from any social-transition or Web-of-Trust protocol.
Clients MAY present this protocol alongside social evidence, but they MUST validate it on its own
terms.

This NIP standardizes **prepared migration evidence and deterministic resolution under this protocol**.
It does **not** claim to conclusively determine human identity continuity after compromise.

## Goals

This NIP aims to provide:

1. an opt-in migration path that can be prepared **before** key loss or compromise;
2. deterministic resolution of the active migration authority and any executed successor;
3. strong separation between protocol validity and social interpretation;
4. good discoverability on relays using indexed tags and explicit lineage references;
5. acceptable behavior under relay loss, deletion attempts, duplicates, and conflicting executions.

## Non-goals

This NIP does not:

- define social legitimacy or human identity truth;
- define Web-of-Trust scoring;
- auto-migrate follows, petnames, trust labels, or account mappings;
- repair historical confidentiality once an old key has been compromised;
- require relays to enforce any authority rules;
- replace signer, vault, bunker, or onboarding software.

## Independence from social-transition protocols

Prepared Migration is a complete protocol on its own.

Clients implementing this NIP:

- MUST validate Prepared Migration without requiring any social claim or attestation;
- MUST NOT let social claims, reactions, reposts, replies, or follow-list context invalidate a
  valid Prepared Migration result;
- MAY display supplementary social evidence alongside this protocol.

## Terminology

- **Old key (`O`)**: the currently recognized identity key.
- **Migration key (`M`)**: an opt-in authority that can later authorize migration away from `O`.
- **Successor key (`N`)**: the new identity key selected at execution time.
- **PMA**: Prepared Migration Authority, the root enrollment event.
- **PMU**: Prepared Migration Authority Update, an optional update of the migration authority.
- **PMX**: Prepared Migration Execution, the actual execution from `O` to `N`.
- **Authority event**: either a valid PMA or a valid PMU.
- **Authority set**: one or more semantically equivalent authority events collapsed into the same
  lineage step.
- **Root group**: one or more semantically equivalent PMAs for the same `(O, M)` pair.
- **Transition ID (`T`)**: a deterministic identifier for `(O, N)`. This NIP uses the same
  identifier format as the Social Transition draft for cross-protocol presentation only. This does
  not create a dependency between the protocols.
- **Anchor height**: the minimum Bitcoin block height proven by one or more valid NIP-03 proofs
  for a PMA or PMU.

## Transition ID

For PMX events, the transition id `T` is the lowercase hex SHA-256 digest of:

```text
UTF8("nostr-social-transition:v1") || 0x00 || <32 raw bytes of O> || 0x00 || <32 raw bytes of N>
```

Where:

- `O` and `N` are the binary 32-byte pubkeys corresponding to the lowercase hex strings in the event tags;
- `0x00` is a literal single zero byte.

Clients MUST recompute `T` from `O` and `N` and MUST reject a PMX whose `d` tag does not match.

## High-level design

1. `O` publishes a `kind:1776` PMA naming `M`.
2. The PMA is timestamped using NIP-03 `kind:1040`.
3. Optionally, the migration authority can later be updated using one or more `kind:1779` PMUs.
4. When migration is needed, the active migration key publishes a `kind:1777` PMX naming `N`.
5. Clients resolve:
   - the canonical root group,
   - the active authority chain,
   - and the executed successor, if any.

## Event kinds

### `kind:1776` Prepared Migration Authority (`PMA`)

A PMA establishes the initial migration authority for `O`.

This is a **regular**, immutable event.

#### Required properties

- `kind` MUST be `1776`.
- `pubkey` MUST be the old key `O`.
- `content` MUST be the empty string `""`.
- The event MUST contain exactly one `o` tag.
- The event MUST contain exactly one `m` tag.
- The event MUST contain exactly one `t` tag with value `"root"`.
- The event MUST contain no `e` tag.
- The event MUST contain no `E` tag.
- `o` MUST equal the event `pubkey`.
- `m` MUST be a 32-byte lowercase hex public key.
- `m` MUST NOT equal `o`.

#### Tags

- `["o", <old-pubkey>]`
- `["m", <migration-pubkey>]`
- `["t", "root"]`
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
    ["t", "root"],
    ["alt", "Prepared Migration Authority"]
  ]
}
```

### `kind:1779` Prepared Migration Authority Update (`PMU`)

A PMU changes the currently active migration key from `M_prev` to `M_next`.

A PMU is signed by the **current** migration key and includes detached consent signatures from:

- the old key `O`;
- the next migration key `M_next`.

This event is also timestamped using NIP-03.

This is a **regular**, immutable event.

#### Required properties

- `kind` MUST be `1779`.
- `pubkey` MUST be the current migration key `M_prev`.
- `content` MUST be the empty string `""`.
- The event MUST contain exactly one `o` tag.
- The event MUST contain exactly one `E` tag.
- The event MUST contain exactly one `e` tag.
- The event MUST contain exactly one `u` tag.
- The event MUST contain exactly one `os` tag.
- The event MUST contain exactly one `ns` tag.
- `o` MUST be a 32-byte lowercase hex pubkey.
- `u` MUST be a 32-byte lowercase hex pubkey.
- `u` MUST NOT equal `o`.
- `u` MUST NOT equal the event `pubkey`.

#### Tag meaning

- `E` = lineage root reference. It MUST reference some valid PMA in the same root group.
- `e` = direct parent authority reference. It MUST reference some valid member of the immediately
  previous authority set.
- `u` = next migration key `M_next`.
- `os` = detached consent signature by `O`.
- `ns` = detached consent signature by `M_next`.

#### Tags

- `["o", <old-pubkey>]`
- `["E", <root-pma-event-id>]`
- `["e", <previous-authority-event-id>]`
- `["u", <next-migration-pubkey>]`
- `["os", <old-key-detached-signature-hex>]`
- `["ns", <next-migration-key-detached-signature-hex>]`
- optional `["alt", "Prepared Migration Authority Update"]`

#### Detached-signature preimage

Both `os` and `ns` MUST sign the exact same canonical preimage:

```json
["NIP-XX", "prepared-migration-update", 2, "<old-pubkey>", "<root-authority-event-id>", "<previous-authority-event-id>", "<current-migration-pubkey>", "<next-migration-pubkey>", <created_at>]
```

The detached-signature message is produced as follows:

1. Serialize the array above using the same JSON normalization rules as NIP-01 event
   serialization:
   - UTF-8 encoding,
   - no extra whitespace,
   - lowercase hex strings,
   - integer `created_at` rendered as a JSON number.
2. Compute SHA-256 over the UTF-8 bytes.
3. Sign that 32-byte digest using BIP340 Schnorr over secp256k1.

The `os` signature MUST verify under `O`.  
The `ns` signature MUST verify under `M_next`.

#### Example

```json
{
  "kind": 1779,
  "pubkey": "<current-migration-pubkey>",
  "content": "",
  "tags": [
    ["o", "<old-pubkey>"],
    ["E", "<root-pma-event-id>"],
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

A PMX is signed by the currently active migration key and includes detached consent from `N`.
This proves that the successor key is live and under control at execution time.

This is a **regular**, immutable event.

#### Required properties

- `kind` MUST be `1777`.
- `pubkey` MUST be the currently active migration key.
- `content` MUST be the empty string `""`.
- The event MUST contain exactly one `d` tag.
- The event MUST contain exactly one `o` tag.
- The event MUST contain exactly one `n` tag.
- The event MUST contain exactly one `E` tag.
- The event MUST contain exactly one `e` tag.
- The event MUST contain exactly one `ns` tag.
- `o` MUST be a 32-byte lowercase hex pubkey.
- `n` MUST be a 32-byte lowercase hex pubkey.
- `o` MUST NOT equal `n`.
- `d` MUST equal the deterministic transition id computed from `o` and `n`.

#### Tag meaning

- `E` = lineage root reference. It MUST reference some valid PMA in the active root group.
- `e` = direct authority reference. It MUST reference some valid member of the currently active
  authority set.
- `ns` = detached successor-key consent signature by `N`.

#### Tags

- `["d", <transition-id>]`
- `["o", <old-pubkey>]`
- `["n", <new-pubkey>]`
- `["E", <root-pma-event-id>]`
- `["e", <active-authority-event-id>]`
- `["ns", <successor-key-consent-signature-hex>]`
- optional `["alt", "Prepared Migration Execution"]`

#### Detached-signature preimage

`ns` MUST sign the following canonical preimage:

```json
["NIP-XX", "prepared-migration-execution", 2, "<transition-id>", "<root-authority-event-id>", "<active-authority-event-id>", "<old-pubkey>", "<new-pubkey>", <created_at>]
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
    ["d", "<transition-id>"],
    ["o", "<old-pubkey>"],
    ["n", "<new-pubkey>"],
    ["E", "<root-pma-event-id>"],
    ["e", "<active-authority-event-id>"],
    ["ns", "<successor-key-consent-signature-hex>"],
    ["alt", "Prepared Migration Execution"]
  ]
}
```

## NIP-03 timestamp requirement

A `kind:1776` PMA or `kind:1779` PMU is not valid for this NIP unless the client can verify at
least one valid NIP-03 `kind:1040` event whose proof establishes a Bitcoin attestation for the
target event.

The verifier MUST confirm that the proof:

- references the target event id;
- corresponds to the target event kind;
- contains a full `.ots` proof payload;
- and proves at least one Bitcoin attestation.

Clients MUST reject proofs that are pending-only, incomplete, malformed, or not Bitcoin-anchored.

### Anchor height

For each valid PMA or PMU, clients MUST derive the set of Bitcoin block heights proven by all valid
NIP-03 proofs for that event.

The event's `anchor_height` is the minimum of that set.

If a client cannot extract any Bitcoin block height from an otherwise syntactically valid proof, the
proof MUST NOT be counted toward Prepared Migration validity.

## Validation

### Validate a PMA

A PMA is valid if and only if:

1. it satisfies all `kind:1776` field rules above;
2. its Nostr event signature verifies under `O`;
3. it has at least one valid NIP-03 proof;
4. its `anchor_height` is derivable.

### Validate a PMU

A PMU is fully valid if and only if:

1. it satisfies all `kind:1779` field rules above;
2. its Nostr event signature verifies under `M_prev`;
3. the referenced root event `E` is a valid PMA for the same `O`;
4. the referenced direct parent event `e` is a valid authority event in the same lineage;
5. the event `pubkey` equals the migration key authorized by the referenced parent authority set;
6. the `os` detached signature verifies under `O`;
7. the `ns` detached signature verifies under `M_next`;
8. it has at least one valid NIP-03 proof;
9. its `anchor_height` is derivable.

### Validate a PMX

A PMX is valid if and only if:

1. it satisfies all `kind:1777` field rules above;
2. its Nostr event signature verifies under the active migration key;
3. the referenced root event `E` belongs to the active root group;
4. the referenced direct parent event `e` belongs to the active authority set;
5. the `ns` detached signature verifies under `N`.

## Authority resolution

Clients MUST resolve Prepared Migration using the following algorithm.

### Step 1: collect valid PMAs authored by `O`

Collect all valid PMA events authored by `O`.

- If none exist, the prepared-migration state is `none`.
- Otherwise group them by migration key `m`.

### Step 2: normalize semantic duplicate roots

For each PMA group keyed by the same `(O, M)`:

- `group_anchor_height` = minimum `anchor_height` among its members.
- `group_member_ids` = all valid PMA ids in that group.
- `group_representative_id` = the lowest event id (lexicographic order) among members whose
  `anchor_height == group_anchor_height`.

This lexicographic tie-break is used **only** to canonically represent semantically equivalent
events within the same group. It MUST NOT be used to break ties between different migration keys.

### Step 3: choose the canonical root group

Let `min_h` be the minimum `group_anchor_height` across all PMA groups.

- If exactly one PMA group has `group_anchor_height == min_h`, that group is the canonical root
  group.
- If more than one PMA group has `group_anchor_height == min_h`, the prepared-migration state is
  `conflicting_roots`.

Later PMA groups with higher `group_anchor_height` do not override the canonical root group.

### Step 4: walk the PMU lineage

Initialize:

- `rootGroup = canonical root group`
- `currentAuthoritySet = rootGroup.group_member_ids`
- `currentMigrationKey = rootGroup.migrationPubkey`

Then repeat:

1. collect all valid PMUs such that:
   - `o == O`;
   - `pubkey == currentMigrationKey`;
   - `E` references **any** member of `rootGroup.group_member_ids`;
   - `e` references **any** member of `currentAuthoritySet`;
2. group these PMUs by `u` (next migration key);
3. collapse semantically equivalent duplicates inside each `u` group;
4. if zero groups remain, stop — the current authority set is active;
5. if exactly one `u` group remains, advance:
   - `currentAuthoritySet = all ids in that group`
   - `currentMigrationKey = that group's u`
6. if more than one distinct `u` group remains, the prepared-migration state is
   `conflicting_authority_updates`.

A PMU chain MUST be linear at the semantic level. Any fork to distinct next migration keys is
conflicting.

## Execution resolution

Once the active authority set has been resolved, clients MUST evaluate PMX events as follows.

1. Collect all valid PMX events such that:
   - `o == O`;
   - `pubkey == currentMigrationKey`;
   - `E` references any member of `rootGroup.group_member_ids`;
   - `e` references any member of `currentAuthoritySet`.
2. Group remaining valid PMXs by successor key `N`.
3. Collapse semantically equivalent duplicates that point to the same `N`.

Resolution:

- If zero distinct `N` groups remain, the prepared-migration state is `prepared_enrolled`.
- If exactly one distinct `N` group remains, the prepared-migration state is `prepared_migrated`,
  and that `N` is the successor.
- If more than one distinct `N` group remains, the prepared-migration state is
  `conflicting_executions`.

PMX events that reference stale authority sets MUST be ignored for final resolution.

## Discovery and query strategy

Clients interested in Prepared Migration for old key `O` SHOULD query at minimum:

1. root PMAs:
   - `{"authors": [O], "kinds": [1776]}`
2. PMUs:
   - `{"kinds": [1779], "#o": [O]}`
3. PMXs:
   - `{"kinds": [1777], "#o": [O]}`
4. NIP-03 proofs for candidate PMAs and PMUs:
   - `{"kinds": [1040], "#e": [<candidate-authority-event-id>...]}`

Clients MAY issue narrower follow-up queries using `#E`, `#e`, or `#d` once candidate lineages are
known.

## Required client behavior

Clients implementing this NIP:

- MUST validate Prepared Migration independently of any social-transition protocol;
- MUST classify valid results into machine states derived from this NIP;
- MUST NOT require social attestations to accept a valid `prepared_migrated` result;
- MUST treat `conflicting_roots`, `conflicting_authority_updates`, and `conflicting_executions`
  as unresolved conflict states;
- MUST NOT silently rewrite follows, petnames, trust labels, or local account mappings;
- SHOULD present explicit user actions such as:
  - follow successor,
  - follow both,
  - mute old key,
  - inspect evidence;
- SHOULD cache previously validated PMA, PMU, PMX, and NIP-03 proof objects locally;
- MUST NOT invalidate a previously validated PMA or PMU merely because:
  - a relay stops serving it,
  - a relay serves a deletion request,
  - or another relay fails to return it later.

## Availability hardening

Because Prepared Migration depends on historical evidence, clients and onboarding tools SHOULD:

- publish PMA / PMU and their `kind:1040` proofs to multiple relays;
- export a local evidence bundle containing:
  - PMA / PMU / PMX event JSON,
  - corresponding `kind:1040` event JSON,
  - raw `.ots` proof bytes where available,
  - the relay list used at publication time;
- keep validated evidence in local durable storage;
- allow re-import of a saved evidence bundle;
- show relay deletion or absence as **availability context**, not as protocol invalidation.

## Supplementary continuity evidence (non-normative)

Clients MAY display supplementary evidence alongside Prepared Migration, including:

- Social Transition claims and attestations;
- NIP-05 continuity;
- profile or follow-list continuity;
- reactions, reposts, or replies about the migration;
- archived copies of relevant events;
- generic continuity-checkpoint artifacts defined by other drafts;
- external timestamp or evidence bundles.

These signals MAY help users evaluate a migration, but they MUST NOT change this NIP's validity
rules.

## Security considerations

### Prepared Migration is authority continuity, not human truth

A valid Prepared Migration result means that the protocol's prepared authority chain resolves to a
particular successor under this NIP. It does not conclusively prove that observers must recognize
that successor as the same human being.

### What this NIP protects against

This NIP protects against loss or compromise of `O` **after** a canonical PMA has already been
Bitcoin-anchored and while the active migration key remains uncompromised.

### What this NIP does not protect against

This NIP does not protect against:

- compromise of `O` before the canonical PMA is Bitcoin-anchored;
- compromise of both `O` and the active migration key;
- compromise of the successor key `N`;
- loss of historical confidentiality for messages encrypted to a compromised key.

### Same-height root ambiguity

If two or more distinct PMA groups for the same `O` share the same minimum `group_anchor_height`,
this NIP treats the situation as `conflicting_roots`.

Clients MUST NOT break that tie using event id, `created_at`, relay arrival time, or any
non-standard rule.

### Equivalent duplicates are not conflicts

Multiple PMAs or PMUs that are semantically equivalent under this NIP do not create a conflict by
themselves. They are collapsed into the same root group or authority set.

### Authority updates are high-stakes

A PMU changes who can later execute migration. Clients SHOULD present PMU publication to users as a
high-sensitivity action.

### Losing the migration key

If the user loses the active migration key before executing a migration or updating the authority,
this NIP provides no unilateral recovery path using the old key alone. This is intentional: the old
key by itself MUST NOT be able to silently replace the migration authority after enrollment.

## Appendix A: Reference machine states

Clients MAY expose the following machine states:

- `none`
- `conflicting_roots`
- `prepared_enrolled`
- `conflicting_authority_updates`
- `prepared_migrated`
- `conflicting_executions`

Clients MAY collapse multiple conflict states into a simpler user-facing label such as `Conflict`.

## Appendix B: Reference pseudocode

```ts
type PreparedState =
  | { kind: "none" }
  | { kind: "conflicting_roots"; rootGroups: string[][] }
  | { kind: "conflicting_authority_updates"; authorityIds: string[]; nextMigrationPubkeys: string[] }
  | { kind: "prepared_enrolled"; rootIds: string[]; authorityIds: string[]; migrationPubkey: string }
  | { kind: "prepared_migrated"; rootIds: string[]; authorityIds: string[]; migrationPubkey: string; newPubkey: string; executionIds: string[] }
  | { kind: "conflicting_executions"; rootIds: string[]; authorityIds: string[]; migrationPubkey: string; newPubkeys: string[]; executionIds: string[] };

function resolvePreparedMigration(oldPubkey: string, events: NostrEvent[], otsProofs: NostrEvent[]): PreparedState {
  const pmas = validPmas(oldPubkey, events, otsProofs);
  if (pmas.length === 0) return { kind: "none" };

  const rootGroups = groupPmasByMigrationKey(pmas);
  for (const g of rootGroups) normalizeRootGroup(g);

  const minHeight = Math.min(...rootGroups.map(g => g.groupAnchorHeight));
  const winningRoots = rootGroups.filter(g => g.groupAnchorHeight === minHeight);

  if (winningRoots.length !== 1) {
    return { kind: "conflicting_roots", rootGroups: winningRoots.map(g => g.memberIds) };
  }

  const root = winningRoots[0];
  let currentAuthorityIds = new Set(root.memberIds);
  let currentMigrationPubkey = root.migrationPubkey;

  while (true) {
    const children = validPmus(events, otsProofs).filter(pmu =>
      pmu.oldPubkey === oldPubkey &&
      pmu.currentMigrationPubkey === currentMigrationPubkey &&
      root.memberIds.includes(pmu.rootEventId) &&
      currentAuthorityIds.has(pmu.parentAuthorityId)
    );

    const childGroups = groupPmusByNextMigrationPubkey(children);

    if (childGroups.length === 0) {
      break;
    }

    if (childGroups.length > 1) {
      return {
        kind: "conflicting_authority_updates",
        authorityIds: [...currentAuthorityIds],
        nextMigrationPubkeys: childGroups.map(g => g.nextMigrationPubkey),
      };
    }

    const next = childGroups[0];
    currentAuthorityIds = new Set(next.memberIds);
    currentMigrationPubkey = next.nextMigrationPubkey;
  }

  const executions = validPmxs(events).filter(pmx =>
    pmx.oldPubkey === oldPubkey &&
    pmx.migrationPubkey === currentMigrationPubkey &&
    root.memberIds.includes(pmx.rootEventId) &&
    currentAuthorityIds.has(pmx.authorityEventId)
  );

  const executionGroups = groupPmxsByNewPubkey(executions);

  if (executionGroups.length === 0) {
    return {
      kind: "prepared_enrolled",
      rootIds: root.memberIds,
      authorityIds: [...currentAuthorityIds],
      migrationPubkey: currentMigrationPubkey,
    };
  }

  if (executionGroups.length === 1) {
    const g = executionGroups[0];
    return {
      kind: "prepared_migrated",
      rootIds: root.memberIds,
      authorityIds: [...currentAuthorityIds],
      migrationPubkey: currentMigrationPubkey,
      newPubkey: g.newPubkey,
      executionIds: g.memberIds,
    };
  }

  return {
    kind: "conflicting_executions",
    rootIds: root.memberIds,
    authorityIds: [...currentAuthorityIds],
    migrationPubkey: currentMigrationPubkey,
    newPubkeys: executionGroups.map(g => g.newPubkey),
    executionIds: executionGroups.flatMap(g => g.memberIds),
  };
}
```
