---
title: Recovery Bundle Foundation Packet
doc_type: packet
status: completed
owner: tack
phase: p4-recovery-bundle-foundation
canonical: false
---

# Recovery Bundle Foundation Packet

Current active packet after Path C fixture/demo closeout.

## Purpose

- implement the smallest encrypted recovery-bundle UX that proves the PoC flow is viable
- keep recovery-bundle logic demoable without pretending to be a hardened vault
- leave Path A and Path C protocol logic untouched while the bundle flow lands at the app layer

## Scope Delta

In scope:

- define the minimal bundle payload needed for the PoC walkthrough
- add local encrypt/decrypt helpers for that bundle payload
- wire a basic demo-client export/import flow around the encrypted bundle
- add at least one deterministic test around bundle round-trip behavior

Out of scope:

- hardware-backed key storage
- remote backup or sync
- production-grade secret handling hardening
- new protocol wire changes

## Frozen Assumptions

- encrypted recovery-bundle UX is in scope for the PoC but does not need production-grade vault
  hardening
- any bundle contents must stay app-layer and must not mutate Path A or Path C protocol rules
- the smallest viable bundle is preferable to a broad account-backup design

## Closeout Conditions

- the PoC has a concrete encrypted recovery-bundle payload shape
- export/import helpers exist and are test-backed
- the demo client can show the bundle flow without implying production hardening
- any unresolved bundle-scope or key-handling ambiguity is recorded explicitly instead of hidden

## Closeout Result

- `apps/demo-client/src/recovery-bundle.ts` now defines the minimal app-layer encrypted bundle flow:
  - build bundle payload from a Path A authority fixture
  - encrypt with PBKDF2 + AES-GCM and a local passphrase
  - export/import JSON
  - decrypt back into usable demo migration material
- the current payload stores `authority_event` plus its matching `ots_event` rather than forcing a
  strict root-only `pma_event`, so a currently active PMU authority can also be captured in the PoC
- the current payload stores a demo migration secret string that is not cryptographically derived
  from the pubkey; secret/pubkey consistency is an app-layer PoC assumption for now
- deterministic round-trip and wrong-passphrase coverage landed in
  `apps/demo-client/src/__tests__/recovery-bundle.test.ts`
- `apps/demo-client` now exposes a basic export/import/decrypt recovery-bundle workspace that stays
  visibly separate from Path A and Path C protocol logic
- browser smoke passed for export and decrypt flow; the only console noise was a missing `favicon.ico`
- the next active packet is `ots-helper-foundation-packet.md`
