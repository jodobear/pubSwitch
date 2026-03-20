---
title: Path A Execution Packet
doc_type: packet
status: completed
owner: tack
phase: p2-path-a-execution
canonical: false
---

# Path A Execution Packet

Completed PMX and execution-resolution packet after PMU and authority-chain closeout.

## Purpose

- implement PMX builder/validator support on top of the confirmed authority-chain base
- resolve execution state from the active authority event
- leave Path A ready for fixture packaging and demo wiring

## Scope Delta

In scope:

- PMX detached-signature preimage builder path
- PMX field validation against the active confirmed authority
- execution resolution from active authority to successor key or execution conflict
- deterministic happy path and one conflicting-execution path

Out of scope:

- in-repo binary `1040` proof parsing
- real Schnorr verification
- Path C implementation
- demo UI expansion beyond later resolver wiring

## Frozen Assumptions

- PMX detached-signature preimages come only from the canonical serializer in `protocol-shared`
- authority confirmation still depends on locally verified `1040` metadata until the OTS helper or
  parser slice lands
- Path A remains separate from Path C in logic and presentation

## Closeout Conditions

- PMX builder and validator exist in `packages/protocol-a`
- the resolver can return active confirmed authority plus executed successor or execution conflict
- semantic duplicate PMXs collapse before execution conflict detection
- one deterministic happy path and one conflicting-execution path are tested
- any remaining PMX ambiguity is recorded explicitly instead of hidden in code

## Closeout Result

- `packages/protocol-a` now has:
  - PMX detached-signature digest generation
  - PMX builder support
  - PMX validation against the active confirmed authority
  - execution resolution from active authority to successor or execution conflict
- semantic duplicate PMXs collapse before execution conflict detection
- semantically equivalent active-authority aliases are also honored during PMX lookup, so duplicate
  equivalent PMU authorities do not strand valid executions
- event signatures and detached signatures across PMA, PMU, and PMX are still validated as
  lowercase-hex shape only; real Schnorr verification is not wired into the repo yet
- confirmed `1040` authority still depends on local verified metadata via
  `x-verified-anchor-height`
- the next active packet is `path-a-fixtures-demo-packet.md`
