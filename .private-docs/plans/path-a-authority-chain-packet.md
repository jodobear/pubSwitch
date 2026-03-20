---
title: Path A Authority Chain Packet
doc_type: packet
status: completed
owner: tack
phase: p2-path-a-authority-chain
canonical: false
---

# Path A Authority Chain Packet

Completed PMU and authority-chain packet after PMA foundation closeout.

## Purpose

- implement PMU builder/validator support on top of the frozen PMA base
- resolve the active authority chain through PMA plus PMU evidence
- keep PMX execution work for the following slice

## Scope Delta

In scope:

- PMU detached-signature preimage builder path
- PMU field validation and parent-authority checks
- linear authority-chain walk with semantic duplicate normalization for PMUs
- deterministic happy path and one fork/conflict path

Out of scope:

- PMX builder or validator
- full execution resolution
- demo UI expansion beyond later resolver wiring
- in-repo binary `1040` proof parsing

## Frozen Assumptions

- PMU detached-signature preimages come only from the canonical serializer in `protocol-shared`
- locally verified `1040` metadata remains the PoC bridge for confirmed authority until the OTS
  helper/parser slice lands
- Path A remains separate from Path C in logic and presentation

## Closeout Conditions

- PMU builder and validator exist in `packages/protocol-a`
- the resolver can walk a PMA plus PMU authority chain
- semantic duplicate PMUs collapse before fork/conflict detection
- one deterministic happy path and one conflict path are tested
- any remaining PMU/OTS ambiguity is recorded explicitly instead of hidden in code

## Closeout Result

- `packages/protocol-a` now has:
  - PMU detached-signature digest generation
  - PMU builder support
  - PMU validation against confirmed parent authority records
  - PMA plus PMU authority-chain walking in the resolver
- semantic duplicate PMUs collapse before fork detection
- semantically duplicate PMA roots are treated as authority aliases while walking PMU children, so
  equivalent roots do not strand later updates
- PMU event signatures and detached signatures are still validated as lowercase-hex shape only; real
  Schnorr verification is not wired into the repo yet
- confirmed `1040` authority still depends on local verified metadata via
  `x-verified-anchor-height`
- the next active packet is `path-a-execution-packet.md`
