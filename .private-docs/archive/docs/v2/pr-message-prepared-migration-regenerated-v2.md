# PR message: Prepared Migration

This PR proposes **Prepared Migration**, a narrow and optional protocol for cryptographic identity continuity on Nostr.

Prepared Migration is intentionally scoped to users who enroll in advance. It standardizes three regular events:

- `kind:1776` Prepared Migration Authority (PMA)
- `kind:1779` Prepared Migration Authority Update (PMU)
- `kind:1777` Prepared Migration Execution (PMX)

Authority-establishment and authority-update events are anchored with NIP-03 OpenTimestamps proofs. Execution is then authorized by the active migration key.

This proposal is intentionally independent from social migration or WoT signaling. It does **not** define social legitimacy, and it does **not** require clients to auto-migrate follows, petnames, or trust labels.

Why a separate draft:

- earlier key-rotation discussions repeatedly mixed two distinct needs: prepared cryptographic continuity and social legitimacy signaling;
- coupling those concerns created semantic and UX disagreement;
- this draft extracts the prepared cryptographic part into a bounded, optional standard.

This PR is intended as a continuation of earlier key-rotation discussion, but in a narrower form that is easier to reason about and implement.

Implementation status:
- draft spec complete enough for PoC work;
- a demo implementation plan is being developed around Applesauce and a dedicated minimal demo client.

Review focus requested:
- event shapes and tag choices
- authority-chain resolution
- OTS anchoring and canonicality
- conflict handling
- client behavior boundaries
